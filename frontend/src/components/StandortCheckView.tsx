import type { District } from "../types/district";
import type { FaktorId } from "../types/standorte";
import type { FaktorErgebnis, StandortErgebnis } from "../hooks/useStandort";
import { FAKTOREN, type FaktorDef } from "../utils/faktoren";
import { RADIEN_M, einstufung, type Radius } from "../utils/standort";

interface Props {
  districts: District[];
  ergebnis: StandortErgebnis | null;
  radius: Radius;
  onRadiusChange: (radius: Radius) => void;
  onOpenDistrict: (district: District) => void;
  /** Faktoren, die auf der Karte gezeigt werden */
  sichtbar: FaktorId[];
  onToggleSichtbar: (id: FaktorId) => void;
  /** Kopiert den Link zum aktuellen Standort */
  onShare: () => void;
  kopiert: boolean;
}

const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
const fmtPreis = (v: number | null | undefined) => (v != null ? `${v.toFixed(1).replace(".", ",")} €` : "k. A.");

const karte = {
  background: "var(--bg)",
  border: "1px solid var(--border-color)",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 12,
} as const;

/** Farbpunkt: Farbe je Hell/Dunkel über CSS-Variablen, damit der Dunkelmodus ohne Neurendern passt */
const punktStil = (def: FaktorDef) =>
  ({
    display: "inline-block",
    width: 9,
    height: 9,
    borderRadius: "50%",
    marginRight: 8,
    background: `var(--faktor-${def.id})`,
  }) as const;

function FaktorZeile({
  def,
  erg,
  radius,
  aufKarte,
  onToggle,
}: {
  def: FaktorDef;
  erg: FaktorErgebnis;
  radius: number;
  aufKarte: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border-color)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
          <span style={punktStil(def)} />
          {def.label}
        </span>
        <button
          aria-pressed={aufKarte}
          onClick={onToggle}
          title={aufKarte ? "Von der Karte ausblenden" : "Auf der Karte zeigen"}
          className="faktor-toggle"
        >
          Karte
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.8rem", marginTop: 4 }}>
        <span>{erg.anzahl === 0 ? `${def.beschreibe(0, 0)} im Umkreis von ${radius} m` : `${def.beschreibe(erg.anzahl, erg.summe)}`}</span>
        {erg.rang !== null && (
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: `var(--faktor-${def.id})`, whiteSpace: "nowrap" }}>
            {einstufung(erg.rang)}
          </span>
        )}
      </div>

      {erg.rang !== null && (
        <div style={{ height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
          <div
            style={{
              width: `${Math.max(erg.rang, 3)}%`,
              height: "100%",
              background: `var(--faktor-${def.id})`,
              borderRadius: 3,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {erg.naechster && erg.naechsteM !== null && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 4 }}>
          {def.naechsteLabel}: {erg.naechster.name}
          {erg.naechster.detail && def.id !== "gruen" ? ` (${erg.naechster.detail})` : ""} · {fmtM(erg.naechsteM)}
        </div>
      )}
    </div>
  );
}

export default function StandortCheckView({
  districts,
  ergebnis,
  radius,
  onRadiusChange,
  onOpenDistrict,
  sichtbar,
  onToggleSichtbar,
  onShare,
  kopiert,
}: Props) {
  const district = ergebnis?.bezirkId != null ? districts.find((d) => d.id === ergebnis.bezirkId) : undefined;
  const mp = district?.mietpreise;

  // Faktoren nach Gruppe, Reihenfolge wie in FAKTOREN
  const gruppen: { name: string; defs: FaktorDef[] }[] = [];
  for (const def of FAKTOREN) {
    const gruppe = gruppen.find((g) => g.name === def.gruppe);
    if (gruppe) gruppe.defs.push(def);
    else gruppen.push({ name: def.gruppe, defs: [def] });
  }

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
          <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={onShare}>
            {kopiert ? "Link kopiert ✓" : "Standort teilen"}
          </button>

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

          {/* Faktoren nach Gruppe */}
          {gruppen.map((g) => (
            <div key={g.name} style={karte}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  letterSpacing: "-0.01em",
                  marginBottom: 2,
                }}
              >
                {g.name}
              </div>
              {g.defs.map((def) => {
                const erg = ergebnis.faktoren.find((f) => f.id === def.id);
                return erg ? (
                  <FaktorZeile
                    key={def.id}
                    def={def}
                    erg={erg}
                    radius={radius}
                    aufKarte={sichtbar.includes(def.id)}
                    onToggle={() => onToggleSichtbar(def.id)}
                  />
                ) : null;
              })}
            </div>
          ))}

          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 4px", marginBottom: 8 }}>
            Die Einstufung vergleicht deine Lage mit einem 500-m-Raster über ganz Wien im selben Umkreis. Parks zählen mit
            ihrer Fläche (Mittelpunkt im Umkreis), Hausärzte sind Praxen für Allgemeinmedizin. Die Mieten sind der
            Bezirksdurchschnitt, es gibt keine Preise pro Adresse. Entfernungen sind Luftlinie. Quellen: Stadt Wien –
            data.wien.gv.at (Wiener Linien, Gemeindebau, Parkanlagen, Spielplätze, Schulen, Kindergärten, Ärzte,
            Apotheken, Märkte).
          </div>
        </>
      )}
    </div>
  );
}
