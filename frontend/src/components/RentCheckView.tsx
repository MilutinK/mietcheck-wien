import { useState } from "react";
import type { District } from "../types/district";
import { RICHTWERT_WIEN, MIETE_DURCHSCHNITT_WIEN } from "../types/district";

interface Props {
  districts: District[];
  onExit: () => void;
}

export default function RentCheckView({ districts }: Props) {
  const [bezirkId, setBezirkId] = useState<number>(10);
  const [bautyp, setBautyp] = useState<"altbau" | "neubau">("altbau");
  const [flaeche, setFlaeche] = useState(65);
  const [miete, setMiete] = useState<number | "">("");

  const district = districts.find((d) => d.id === bezirkId);
  const mp = district?.mietpreise;

  // Marktpreis je nach Bautyp
  const marktpreis =
    bautyp === "altbau"
      ? mp?.altbau?.durchschnitt
      : mp?.neubau?.durchschnitt;

  // Fallback auf Gesamt wenn spezifischer Preis fehlt
  const marktpreisEffektiv = marktpreis ?? mp?.gesamt?.durchschnitt ?? null;

  const mw = MIETE_DURCHSCHNITT_WIEN;
  const gemeindebauBrutto = mw.gemeindebau_netto + mw.gemeindebau_bk;
  const genossenschaftBrutto = mw.genossenschaft_netto + mw.genossenschaft_bk;

  // Berechnungen
  const mieteNum = typeof miete === "number" ? miete : 0;
  const mieteProM2 = flaeche > 0 ? mieteNum / flaeche : 0;
  const richtwertGesamt = RICHTWERT_WIEN * flaeche;
  const marktpreisGesamt = marktpreisEffektiv ? marktpreisEffektiv * flaeche : null;

  // Altbau-Anteil
  const bp = district?.bauperioden;
  const bpTotal = bp ? Object.values(bp).reduce((a, b) => a + b, 0) : 0;
  const altbauAnteil = bp && bpTotal > 0
    ? Math.round(((bp.vor_1919 + bp.von_1919_bis_1944 + bp.von_1945_bis_1960) / bpTotal) * 100)
    : 0;

  // Abweichungen
  const abweichungMarkt = marktpreisGesamt ? ((mieteNum - marktpreisGesamt) / marktpreisGesamt) * 100 : null;
  const faktorRichtwert = richtwertGesamt > 0 ? mieteNum / richtwertGesamt : 0;

  const hatEingabe = mieteNum > 0 && flaeche > 0;

  // Verdict
  const getVerdict = () => {
    if (!hatEingabe) return null;

    if (bautyp === "altbau" && altbauAnteil > 30) {
      // Altbau in Altbau-Bezirk → Richtwert ist relevant
      if (faktorRichtwert <= 1.5) {
        return { text: "Im Rahmen", detail: "Deine Miete liegt im Bereich des Richtwertmietzinses (inkl. üblicher Zuschläge).", color: "#1e8449", bg: "#eafaf1" };
      } else if (faktorRichtwert <= 2.5) {
        return { text: "Erhöht", detail: `Du zahlst ${faktorRichtwert.toFixed(1)}× den Richtwert. Zuschläge (Lage, Ausstattung) können das rechtfertigen – eine Überprüfung könnte sich lohnen.`, color: "#b7950b", bg: "#fef9e7" };
      } else {
        return { text: "Deutlich über Richtwert", detail: `Du zahlst ${faktorRichtwert.toFixed(1)}× den Richtwert. Bei einer Altbauwohnung unter MRG-Vollanwendung könnte deine Miete zu hoch sein. Eine Überprüfung bei der Schlichtungsstelle ist empfehlenswert.`, color: "#c0392b", bg: "#fdedec" };
      }
    } else {
      // Neubau oder wenig Altbau → Marktpreis ist relevant
      if (abweichungMarkt == null) {
        return { text: "Keine Vergleichsdaten", detail: "Für diesen Bezirk/Bautyp liegen zu wenige Marktdaten vor.", color: "var(--text-secondary)", bg: "var(--bg)" };
      }
      if (abweichungMarkt <= -10) {
        return { text: "Günstig!", detail: `Du zahlst ${Math.abs(abweichungMarkt).toFixed(0)}% unter dem Marktdurchschnitt.`, color: "#1e8449", bg: "#eafaf1" };
      } else if (abweichungMarkt <= 15) {
        return { text: "Im Rahmen", detail: "Deine Miete liegt im Bereich des Marktdurchschnitts für diesen Bezirk.", color: "#1e8449", bg: "#eafaf1" };
      } else if (abweichungMarkt <= 30) {
        return { text: "Über Durchschnitt", detail: `Du zahlst ${abweichungMarkt.toFixed(0)}% über dem Marktdurchschnitt. Das kann durch Ausstattung oder Lage gerechtfertigt sein.`, color: "#b7950b", bg: "#fef9e7" };
      } else {
        return { text: "Deutlich über Markt", detail: `Du zahlst ${abweichungMarkt.toFixed(0)}% über dem Marktdurchschnitt für diesen Bezirk.`, color: "#c0392b", bg: "#fdedec" };
      }
    }
  };

  const verdict = getVerdict();

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header */}
      <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", textAlign: "center" }}>
        Ist meine Miete zu hoch?
      </h3>

      {/* ── Eingabe ── */}
      <div style={{
        background: "var(--bg)",
        borderRadius: 10,
        padding: "14px",
        marginBottom: 16,
        border: "1px solid var(--border-color, #e0e0e0)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {/* Bezirk */}
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            Bezirk
          </label>
          <select
            value={bezirkId}
            onChange={(e) => setBezirkId(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color, #e0e0e0)",
              fontSize: "0.85rem",
              background: "var(--panel-bg, #fff)",
              color: "inherit",
            }}
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id}. {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bautyp Toggle */}
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            Gebäudetyp
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              onClick={() => setBautyp("altbau")}
              style={{
                padding: "8px",
                borderRadius: 6,
                border: bautyp === "altbau" ? "2px solid #b7950b" : "1px solid var(--border-color, #e0e0e0)",
                background: bautyp === "altbau" ? "#fef5e7" : "var(--panel-bg, #fff)",
                color: bautyp === "altbau" ? "#b7950b" : "inherit",
                fontWeight: bautyp === "altbau" ? 600 : 400,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Altbau
            </button>
            <button
              onClick={() => setBautyp("neubau")}
              style={{
                padding: "8px",
                borderRadius: 6,
                border: bautyp === "neubau" ? "2px solid #1e8449" : "1px solid var(--border-color, #e0e0e0)",
                background: bautyp === "neubau" ? "#eafaf1" : "var(--panel-bg, #fff)",
                color: bautyp === "neubau" ? "#1e8449" : "inherit",
                fontWeight: bautyp === "neubau" ? 600 : 400,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Neubau
            </button>
          </div>
        </div>

        {/* Wohnfläche */}
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            Wohnfläche
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={flaeche}
              onChange={(e) => setFlaeche(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <input
                type="number"
                min={10}
                max={300}
                value={flaeche}
                onChange={(e) => setFlaeche(Number(e.target.value) || 65)}
                style={{
                  width: 48,
                  textAlign: "right",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  border: "1px solid var(--border-color, #e0e0e0)",
                  borderRadius: 4,
                  padding: "2px 4px",
                  background: "transparent",
                  color: "inherit",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>m²</span>
            </div>
          </div>
        </div>

        {/* Aktuelle Miete */}
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            Deine aktuelle Bruttomiete (inkl. BK)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number"
              min={0}
              max={10000}
              step={10}
              placeholder="z.B. 850"
              value={miete}
              onChange={(e) => setMiete(e.target.value === "" ? "" : Number(e.target.value))}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-color, #e0e0e0)",
                fontSize: "0.95rem",
                fontWeight: 500,
                background: "var(--panel-bg, #fff)",
                color: "inherit",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>€/Monat</span>
          </div>
        </div>
      </div>

      {/* ── Ergebnis ── */}
      {hatEingabe && district && (
        <>
          {/* Deine Miete pro m² */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Deine Miete</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 600 }}>
              {mieteProM2.toFixed(2)} <span style={{ fontSize: "0.9rem", fontWeight: 400 }}>€/m²</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              {mieteNum.toLocaleString("de-AT")} € für {flaeche} m² im {district.id}. Bezirk ({bautyp === "altbau" ? "Altbau" : "Neubau"})
            </div>
          </div>

          {/* Verdict */}
          {verdict && (
            <div style={{
              background: verdict.bg,
              border: `1px solid ${verdict.color}22`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 14,
              textAlign: "center",
            }}>
              <div style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: verdict.color,
                marginBottom: 6,
              }}>
                {verdict.text}
              </div>
              <div style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {verdict.detail}
              </div>
            </div>
          )}

          {/* Vergleichsbalken */}
          <div style={{
            background: "var(--bg)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              Vergleich für {flaeche} m² im {district.id}. Bezirk
            </div>

            {/* Balken-Visualisierung */}
            {(() => {
              const items = [
                { label: "Gemeindebau (Ø Wien)", value: gemeindebauBrutto * flaeche, color: "#e74c3c" },
                { label: "Genossenschaft (Ø Wien)", value: genossenschaftBrutto * flaeche, color: "#f39c12" },
                { label: `Richtwert (Basis)`, value: richtwertGesamt, color: "#1e8449" },
                ...(marktpreisEffektiv ? [{ label: `Marktpreis ${bautyp === "altbau" ? "Altbau" : "Neubau"}`, value: marktpreisEffektiv * flaeche, color: "#3498db" }] : []),
                { label: "Deine Miete", value: mieteNum, color: "#8e44ad" },
              ];
              const maxVal = Math.max(...items.map((i) => i.value));

              return items.map((item, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 3 }}>
                    <span style={{
                      color: item.label === "Deine Miete" ? "#8e44ad" : "var(--text-secondary)",
                      fontWeight: item.label === "Deine Miete" ? 600 : 400,
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontWeight: 500,
                      color: item.label === "Deine Miete" ? "#8e44ad" : "inherit",
                    }}>
                      {item.value.toFixed(0)} €
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    background: "var(--border-color, #e8e8e8)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(item.value / maxVal) * 100}%`,
                      height: "100%",
                      background: item.color,
                      borderRadius: 4,
                      opacity: item.label === "Deine Miete" ? 1 : 0.7,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Bezirks-Info */}
          <div style={{
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            padding: "0 4px",
            marginBottom: 8,
          }}>
            <strong>{district.id}. {district.name}:</strong>{" "}
            ~{altbauAnteil}% Altbau-Anteil
            {district.wohnsitztyp && (
              <> · {district.wohnsitztyp.gemeindebau}% Gemeindebau · {district.wohnsitztyp.genossenschaft}% Genossenschaft · {district.wohnsitztyp.miete_frei}% freie Miete</>
            )}
          </div>

          {/* Hinweis */}
          {bautyp === "altbau" && altbauAnteil > 30 && (
            <div style={{
              fontSize: "0.65rem",
              color: "var(--text-secondary)",
              background: "var(--bg)",
              padding: "8px 10px",
              borderRadius: 6,
              lineHeight: 1.6,
              marginBottom: 8,
            }}>
              💡 Bei Altbauwohnungen unter MRG-Vollanwendung (vor 1953) kannst du deine Miete bei der
              Schlichtungsstelle der MA 50 überprüfen lassen. Die Überprüfung ist kostenlos.
              Der Richtwert von {RICHTWERT_WIEN.toFixed(2)} €/m² ist bis April 2026 eingefroren.
            </div>
          )}

          {/* Quellen */}
          <div style={{ fontSize: "0.55rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 4px" }}>
            Marktpreise: immopreise.at (Angebotspreise, brutto). Gemeindebau/Genossenschaft: Wien-weite Ø (Mikrozensus 2023).
            Richtwert: {RICHTWERT_WIEN.toFixed(2)} €/m² (MRG/RichtWG, Stand 2025). Keine Rechtsberatung.
          </div>
        </>
      )}

      {/* Platzhalter wenn noch keine Miete eingegeben */}
      {!hatEingabe && (
        <div style={{
          textAlign: "center",
          padding: "32px 16px",
          color: "var(--text-secondary)",
          fontSize: "0.8rem",
        }}>
          Gib oben deinen Bezirk, Gebäudetyp, Wohnfläche und aktuelle Miete ein – du siehst sofort ob du zu viel zahlst.
        </div>
      )}
    </div>
  );
}
