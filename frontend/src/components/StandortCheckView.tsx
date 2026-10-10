import type { District } from "../types/district";
import type { StandortErgebnis } from "../hooks/useStandort";
import { RADIEN_M, einstufung, type Radius } from "../utils/standort";
import { distanzM } from "../utils/geo";

interface Props {
  districts: District[];
  ergebnis: StandortErgebnis | null;
  radius: Radius;
  onRadiusChange: (radius: Radius) => void;
  onOpenDistrict: (district: District) => void;
}

const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
const fmtZahl = (n: number) => n.toLocaleString("de-AT");
const fmtPreis = (v: number | null | undefined) => (v != null ? `${v.toFixed(1).replace(".", ",")} €` : "k. A.");

const karte = {
  background: "var(--bg)",
  border: "1px solid var(--border-color)",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 12,
} as const;

/** Balken mit Prozentrang: wie die Lage im Vergleich zu allen Wiener Lagen abschneidet */
function RangBalken({ rang, farbe }: { rang: number; farbe: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 8, background: "var(--track)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(rang, 3)}%`, height: "100%", background: farbe, borderRadius: 4, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 4 }}>
        mehr als {rang} % der Wiener Lagen (gleicher Umkreis)
      </div>
    </div>
  );
}

export default function StandortCheckView({ districts, ergebnis, radius, onRadiusChange, onOpenDistrict }: Props) {
  const district = ergebnis?.bezirkId != null ? districts.find((d) => d.id === ergebnis.bezirkId) : undefined;
  const mp = district?.mietpreise;

  const naechsteHalte = ergebnis
    ? [...ergebnis.oeffi.treffer]
        .sort((a, b) => distanzM(ergebnis.punkt, a) - distanzM(ergebnis.punkt, b))
        .slice(0, 3)
    : [];

  return (
    <div style={{ padding: "0 4px" }}>
      <h3
        style={{
          margin: "0 0 4px",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "1.6rem",
          letterSpacing: "-0.03em",
          textAlign: "center",
        }}
      >
        Standort-Check
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: "0.8rem", textAlign: "center", color: "var(--text-secondary)" }}>
        Klicke auf die Karte und sieh, was im Umkreis liegt.
      </p>

      <div style={{ ...karte, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Umkreis</span>
        {RADIEN_M.map((r) => (
          <button
            key={r}
            aria-pressed={radius === r}
            onClick={() => onRadiusChange(r)}
            style={{
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: radius === r ? "2px solid var(--text)" : "1px solid var(--border-color)",
              background: radius === r ? "var(--sel-bg)" : "var(--panel-bg)",
              color: "var(--text)",
              fontWeight: radius === r ? 600 : 400,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {r} m
          </button>
        ))}
      </div>

      {!ergebnis && (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Noch kein Punkt gewählt. Tippe auf eine Stelle in Wien.
        </div>
      )}

      {ergebnis && ergebnis.bezirkId === null && (
        <div style={{ ...karte, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Dieser Punkt liegt außerhalb von Wien. Wähle eine Stelle innerhalb der Stadtgrenze.
        </div>
      )}

      {ergebnis && ergebnis.bezirkId !== null && (
        <>
          {/* Bezirk */}
          <div style={karte}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Lage</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>
              {ergebnis.bezirkId}. {district?.name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
              Bezirksdurchschnitt: <span style={{ color: "var(--gold)" }}>Altbau {fmtPreis(mp?.altbau?.durchschnitt)}</span>
              {" · "}
              <span style={{ color: "var(--green)" }}>Neubau {fmtPreis(mp?.neubau?.durchschnitt)}</span> pro m²
            </div>
            {district && (
              <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onOpenDistrict(district)}>
                Bezirksdetails öffnen
              </button>
            )}
          </div>

          {/* Öffi */}
          <div style={karte}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--blue)", marginRight: 8 }} />
                Öffentlicher Verkehr
              </span>
              {ergebnis.rang && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--blue)" }}>
                  {einstufung(ergebnis.rang.oeffi)}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
              {ergebnis.oeffi.treffer.length === 0
                ? `Keine Haltestelle im Umkreis von ${radius} m.`
                : `${fmtZahl(ergebnis.oeffi.treffer.length)} Haltestellen im Umkreis von ${radius} m.`}
            </div>
            {naechsteHalte.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {naechsteHalte.map((h, i) => (
                  <li key={i}>
                    {h.name} ({fmtM(distanzM(ergebnis.punkt, h))})
                  </li>
                ))}
              </ul>
            )}
            {ergebnis.oeffi.treffer.length === 0 && ergebnis.oeffi.naechster && ergebnis.oeffi.naechsteM !== null && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Nächste: {ergebnis.oeffi.naechster.name} ({fmtM(ergebnis.oeffi.naechsteM)})
              </div>
            )}
            {ergebnis.rang && <RangBalken rang={ergebnis.rang.oeffi} farbe="var(--blue)" />}
          </div>

          {/* Gemeindebau */}
          <div style={karte}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#e74c3c", marginRight: 8 }} />
                Gemeindebau
              </span>
              {ergebnis.rang && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--red)" }}>
                  Dichte {einstufung(ergebnis.rang.gemeindebau)}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
              {ergebnis.gemeindebau.treffer.length === 0
                ? `Keine Gemeindebau-Anlage im Umkreis von ${radius} m.`
                : `${fmtZahl(ergebnis.gemeindebau.treffer.length)} Anlagen mit ${fmtZahl(ergebnis.gemeindebau.wohnungen)} Wohnungen im Umkreis von ${radius} m.`}
            </div>
            {ergebnis.gemeindebau.naechster && ergebnis.gemeindebau.naechsteM !== null && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Nächste Anlage: {ergebnis.gemeindebau.naechster.adresse || ergebnis.gemeindebau.naechster.name} (
                {fmtM(ergebnis.gemeindebau.naechsteM)})
              </div>
            )}
            {ergebnis.rang && <RangBalken rang={ergebnis.rang.gemeindebau} farbe="var(--red)" />}
          </div>

          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 4px", marginBottom: 8 }}>
            Die Mieten stammen vom Bezirksdurchschnitt, es gibt keine Preise pro Adresse. Der Vergleich nutzt ein
            500-m-Raster über ganz Wien. Entfernungen sind Luftlinie. Quellen: Wiener Linien Haltestellen und Gemeindebau
            Standorte, Stadt Wien – data.wien.gv.at.
          </div>
        </>
      )}
    </div>
  );
}
