import { useMemo, useState } from "react";
import type { District } from "../types/district";
import { useKaufpreise } from "../hooks/useKaufpreise";
import { useMietverlauf } from "../hooks/useMietverlauf";
import { mietsteigerungProJahr, preisFuerFlaeche, vergleiche, type JahresStand } from "../utils/kaufen";
import { monatsname } from "../utils/verlauf";
import Dropdown from "./Dropdown";
import NumberField from "./NumberField";
import Slider from "./Slider";

interface Props {
  districts: District[];
}

type Zahl = number | "";

const euro = (v: number) => `${Math.round(v).toLocaleString("de-AT")} €`;
const euroKurz = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000).toLocaleString("de-AT")} T€` : `${Math.round(v)} €`);

const labelStyle = { fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 } as const;
const karte = {
  background: "var(--bg)",
  border: "1px solid var(--border-color)",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 12,
} as const;

// Annahmen, die du im Bereich "Annahmen" ändern kannst
const STANDARD = {
  zins: 3.5,
  laufzeit: 30,
  horizont: 20,
  nebenkosten: 10,
  wertsteigerung: 2.5,
  anlage: 3,
  instandhaltung: 1,
  verkaufskosten: 2,
  mietsteigerung: 3,
};

function Feld({ label, children, id }: { label: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label id={id} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Vermögen über die Jahre: wer kauft (grün) gegen wer mietet und anlegt (blau) */
function VermoegenChart({ jahre, breakEven }: { jahre: JahresStand[]; breakEven: number | null }) {
  const W = 348;
  const H = 150;
  const R = { l: 44, r: 8, t: 8, b: 22 };
  const werte = jahre.flatMap((j) => [j.kaufen, j.mieten]);
  const lo = Math.min(...werte);
  const hi = Math.max(...werte);
  const pad = (hi - lo) * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const letzteJahr = jahre[jahre.length - 1].jahr;
  const x = (jahr: number) => R.l + (jahr / Math.max(1, letzteJahr)) * (W - R.l - R.r);
  const y = (v: number) => R.t + (1 - (v - yMin) / (yMax - yMin)) * (H - R.t - R.b);
  const pfad = (f: (j: JahresStand) => number) => jahre.map((j, i) => `${i ? "L" : "M"}${x(j.jahr).toFixed(1)} ${y(f(j)).toFixed(1)}`).join(" ");
  const schritt = (hi - lo) / 3 > 200_000 ? 500_000 : (hi - lo) / 3 > 80_000 ? 200_000 : (hi - lo) / 3 > 30_000 ? 100_000 : 50_000;
  const ticks: number[] = [];
  for (let v = Math.ceil(yMin / schritt) * schritt; v <= yMax; v += schritt) ticks.push(v);
  const jahrSchritt = letzteJahr > 25 ? 10 : 5;
  const jahrMarken: number[] = [];
  for (let j = 0; j <= letzteJahr; j += jahrSchritt) jahrMarken.push(j);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Vermögen beim Kaufen und beim Mieten über die Jahre" style={{ display: "block" }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={R.l} x2={W - R.r} y1={y(v)} y2={y(v)} stroke="var(--border-color)" />
          <text x={R.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
            {euroKurz(v)}
          </text>
        </g>
      ))}
      {jahrMarken.map((j) => (
        <text key={j} x={x(j)} y={H - 6} textAnchor={j === letzteJahr ? "end" : "middle"} fontSize="10" fill="var(--text-secondary)">
          {j} J.
        </text>
      ))}
      {breakEven !== null && (
        <line x1={x(breakEven)} x2={x(breakEven)} y1={R.t} y2={H - R.b} stroke="var(--danger)" strokeWidth="1.2" strokeDasharray="4 3" />
      )}
      <path d={pfad((j) => j.mieten)} fill="none" stroke="var(--blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pfad((j) => j.kaufen)} fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KaufenView({ districts }: Props) {
  const kaufpreise = useKaufpreise();
  const verlauf = useMietverlauf();

  const [bezirkId, setBezirkId] = useState(10);
  const [flaeche, setFlaeche] = useState<number>(60);
  const [kaufpreisEingabe, setKaufpreisEingabe] = useState<Zahl>("");
  const [mieteEingabe, setMieteEingabe] = useState<Zahl>("");
  const [eigenkapital, setEigenkapital] = useState<Zahl>(60_000);
  const [zins, setZins] = useState<Zahl>(STANDARD.zins);
  const [laufzeit, setLaufzeit] = useState<Zahl>(STANDARD.laufzeit);
  const [horizont, setHorizont] = useState<number>(STANDARD.horizont);
  const [nebenkosten, setNebenkosten] = useState<Zahl>(STANDARD.nebenkosten);
  const [wertsteigerung, setWertsteigerung] = useState<Zahl>(STANDARD.wertsteigerung);
  const [anlage, setAnlage] = useState<Zahl>(STANDARD.anlage);
  const [instandhaltung, setInstandhaltung] = useState<Zahl>(STANDARD.instandhaltung);
  const [verkaufskosten, setVerkaufskosten] = useState<Zahl>(STANDARD.verkaufskosten);
  const [mietsteigerungEingabe, setMietsteigerungEingabe] = useState<Zahl>("");

  const district = districts.find((d) => d.id === bezirkId);

  // Vorschläge aus den Marktdaten des Bezirks (für die Größe der Wohnung)
  const kaufKlassen = kaufpreise?.bezirke[String(bezirkId)];
  const kaufProM2 = kaufKlassen ? preisFuerFlaeche(kaufKlassen, flaeche) : null;
  const mieteKlassen = district?.mietpreise?.gesamt;
  const mieteProM2 = mieteKlassen ? preisFuerFlaeche(mieteKlassen, flaeche) : null;
  const kaufVorschlag = kaufProM2 !== null ? Math.round((kaufProM2 * flaeche) / 1000) * 1000 : null;
  const mieteVorschlag = mieteProM2 !== null ? Math.round(mieteProM2 * flaeche) : null;
  const steigerungVorschlag = useMemo(() => {
    const reihe = verlauf?.bezirke[String(bezirkId)];
    return reihe ? mietsteigerungProJahr(reihe, 10) : null;
  }, [verlauf, bezirkId]);

  const kaufpreis = typeof kaufpreisEingabe === "number" && kaufpreisEingabe > 0 ? kaufpreisEingabe : kaufVorschlag;
  const miete = typeof mieteEingabe === "number" && mieteEingabe > 0 ? mieteEingabe : mieteVorschlag;
  // Standard ist bewusst eine neutrale Annahme: Die letzten Jahre waren ein Ausnahmeabschnitt mit hoher Inflation
  // und würden das Ergebnis stark Richtung Kaufen verschieben. Der Wert aus den Daten steht als Hinweis daneben.
  const mietsteigerung = typeof mietsteigerungEingabe === "number" ? mietsteigerungEingabe : STANDARD.mietsteigerung;

  const n = (z: Zahl, fallback: number) => (typeof z === "number" ? z : fallback);

  const ergebnis = useMemo(() => {
    if (kaufpreis === null || miete === null) return null;
    return vergleiche({
      kaufpreis,
      nebenkostenProzent: n(nebenkosten, STANDARD.nebenkosten),
      eigenkapital: n(eigenkapital, 0),
      zinsProzent: n(zins, STANDARD.zins),
      laufzeitJahre: Math.max(1, n(laufzeit, STANDARD.laufzeit)),
      miete,
      mietsteigerungProzent: mietsteigerung,
      wertsteigerungProzent: n(wertsteigerung, STANDARD.wertsteigerung),
      anlageProzent: n(anlage, STANDARD.anlage),
      instandhaltungMonat: n(instandhaltung, STANDARD.instandhaltung) * flaeche,
      verkaufskostenProzent: n(verkaufskosten, STANDARD.verkaufskosten),
      horizontJahre: horizont,
    });
  }, [kaufpreis, miete, nebenkosten, eigenkapital, zins, laufzeit, mietsteigerung, wertsteigerung, anlage, instandhaltung, verkaufskosten, horizont, flaeche]);

  const kaufenVorn = ergebnis ? ergebnis.endeKaufen >= ergebnis.endeMieten : false;
  const vorsprung = ergebnis ? Math.abs(ergebnis.endeKaufen - ergebnis.endeMieten) : 0;

  return (
    <div>
      <div style={{ ...karte, display: "flex", flexDirection: "column", gap: 12 }}>
        <Feld label="Bezirk" id="kf-bezirk">
          <Dropdown
            variant="feld"
            ariaLabelledBy="kf-bezirk"
            value={bezirkId}
            onChange={setBezirkId}
            options={districts.map((d) => ({ value: d.id, label: `${d.id}. ${d.name}` }))}
          />
        </Feld>

        <Feld label="Wohnfläche" id="kf-flaeche">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Slider min={20} max={150} step={5} value={flaeche} onChange={setFlaeche} ariaLabelledBy="kf-flaeche" />
            <NumberField
              size="klein"
              min={10}
              max={300}
              value={flaeche}
              onChange={(v) => setFlaeche(v === "" ? 60 : v)}
              unit="m²"
              ariaLabel="Wohnfläche in Quadratmetern"
            />
          </div>
        </Feld>

        <Feld label="Kaufpreis der Wohnung" id="kf-preis">
          <NumberField
            min={0}
            step={5000}
            placeholder={kaufVorschlag !== null ? `Bezirks-Ø ${kaufVorschlag.toLocaleString("de-AT")}` : "z.B. 350000"}
            value={kaufpreisEingabe}
            onChange={setKaufpreisEingabe}
            unit="€"
            ariaLabelledBy="kf-preis"
          />
        </Feld>

        <Feld label="Miete einer vergleichbaren Wohnung (brutto, pro Monat)" id="kf-miete">
          <NumberField
            min={0}
            step={10}
            placeholder={mieteVorschlag !== null ? `Bezirks-Ø ${mieteVorschlag.toLocaleString("de-AT")}` : "z.B. 1200"}
            value={mieteEingabe}
            onChange={setMieteEingabe}
            unit="€/Monat"
            ariaLabelledBy="kf-miete"
          />
        </Feld>

        <Feld label="Eigenkapital" id="kf-ek">
          <NumberField min={0} step={5000} placeholder="z.B. 60000" value={eigenkapital} onChange={setEigenkapital} unit="€" ariaLabelledBy="kf-ek" />
        </Feld>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Feld label="Kreditzins pro Jahr" id="kf-zins">
            <NumberField min={0} max={15} step={0.1} value={zins} onChange={setZins} unit="%" ariaLabelledBy="kf-zins" />
          </Feld>
          <Feld label="Laufzeit des Kredits" id="kf-laufzeit">
            <NumberField min={1} max={40} step={1} value={laufzeit} onChange={setLaufzeit} unit="Jahre" ariaLabelledBy="kf-laufzeit" />
          </Feld>
        </div>

        <Feld label="Vergleichszeitraum" id="kf-horizont">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Slider min={5} max={40} step={1} value={horizont} onChange={setHorizont} ariaLabelledBy="kf-horizont" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, minWidth: 64, textAlign: "right" }}>{horizont} Jahre</span>
          </div>
        </Feld>

        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Annahmen ändern</summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Feld label="Kaufnebenkosten" id="kf-nk">
              <NumberField min={0} max={25} step={0.5} value={nebenkosten} onChange={setNebenkosten} unit="%" ariaLabelledBy="kf-nk" />
            </Feld>
            <Feld label="Verkaufskosten" id="kf-vk">
              <NumberField min={0} max={15} step={0.5} value={verkaufskosten} onChange={setVerkaufskosten} unit="%" ariaLabelledBy="kf-vk" />
            </Feld>
            <Feld label="Wertsteigerung pro Jahr" id="kf-ws">
              <NumberField min={-5} max={10} step={0.1} value={wertsteigerung} onChange={setWertsteigerung} unit="%" ariaLabelledBy="kf-ws" />
            </Feld>
            <Feld label="Mietsteigerung pro Jahr" id="kf-ms">
              <NumberField
                min={0}
                max={15}
                step={0.1}
                placeholder={String(STANDARD.mietsteigerung)}
                value={mietsteigerungEingabe}
                onChange={setMietsteigerungEingabe}
                unit="%"
                ariaLabelledBy="kf-ms"
              />
            </Feld>
            <Feld label="Rendite für freies Geld" id="kf-an">
              <NumberField min={0} max={12} step={0.1} value={anlage} onChange={setAnlage} unit="%" ariaLabelledBy="kf-an" />
            </Feld>
            <Feld label="Instandhaltung (Eigentum)" id="kf-ih">
              <NumberField min={0} max={10} step={0.1} value={instandhaltung} onChange={setInstandhaltung} unit="€/m²/Mon." ariaLabelledBy="kf-ih" />
            </Feld>
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 10 }}>
            Kaufnebenkosten: grob 10 % (u. a. Grunderwerbsteuer, Grundbuch, Maklerprovision, Vertragserrichtung, Pfandrecht
            für den Kredit); der genaue Wert hängt vom Einzelfall ab. Mietsteigerung: Standard {STANDARD.mietsteigerung} % pro Jahr.
            {steigerungVorschlag !== null && district
              ? ` In den letzten 10 Jahren stiegen die Mieten im ${district.id}. Bezirk um ${steigerungVorschlag.toFixed(1).replace(".", ",")} % pro Jahr, das war eine Ausnahmephase mit hoher Inflation.`
              : ""}{" "}
            Wertsteigerung und Rendite sind Annahmen, keine Prognose.
          </div>
        </details>
      </div>

      {!ergebnis && (
        <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Für diesen Bezirk fehlen Preisdaten. Trage Kaufpreis und Miete selbst ein.
        </div>
      )}

      {ergebnis && kaufpreis !== null && miete !== null && (
        <>
          {/* Ergebnis */}
          <div
            style={{
              ...karte,
              background: kaufenVorn ? "var(--green-bg)" : "color-mix(in srgb, var(--blue) 12%, var(--bg))",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Nach {horizont} Jahren liegt vorn</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.8rem",
                letterSpacing: "-0.03em",
                color: kaufenVorn ? "var(--green)" : "var(--blue)",
              }}
            >
              {kaufenVorn ? "Kaufen" : "Mieten"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 2 }}>
              mit <strong>{euro(vorsprung)}</strong> mehr Vermögen
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
              {ergebnis.breakEvenJahr !== null
                ? `Kaufen holt ab Jahr ${ergebnis.breakEvenJahr} auf.`
                : `Kaufen holt in ${horizont} Jahren nicht auf.`}
            </div>
          </div>

          {/* Verlauf */}
          <div style={karte}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 6, fontWeight: 500 }}>
              Vermögen über die Jahre
            </div>
            <VermoegenChart jahre={ergebnis.jahre} breakEven={ergebnis.breakEvenJahr} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: "0.75rem", marginTop: 6 }}>
              <span>
                <span style={{ display: "inline-block", width: 14, height: 3, background: "var(--green)", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />
                Kaufen: <strong>{euro(ergebnis.endeKaufen)}</strong>
              </span>
              <span>
                <span style={{ display: "inline-block", width: 14, height: 3, background: "var(--blue)", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />
                Mieten: <strong>{euro(ergebnis.endeMieten)}</strong>
              </span>
            </div>
          </div>

          {/* Zahlen */}
          <div style={karte}>
            {[
              ["Kaufpreis", euro(kaufpreis)],
              ["Kaufnebenkosten", euro(ergebnis.nebenkosten)],
              ["Kredit", euro(ergebnis.kredit)],
              ["Rate pro Monat", euro(ergebnis.rate)],
              ["Rate und Instandhaltung pro Monat", euro(ergebnis.kostenKaufenMonat)],
              ["Miete pro Monat (heute)", euro(miete)],
              [`Zinsen in ${horizont} Jahren`, euro(ergebnis.zinsenGesamt)],
            ].map(([label, wert]) => (
              <div key={label} className="detail-row">
                <span>{label}</span>
                <span>{wert}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 4px", marginBottom: 8 }}>
            Vereinfachtes Modell, keine Anlage- oder Finanzberatung. Beide Seiten starten mit demselben Eigenkapital; wer
            monatlich weniger zahlt, legt die Differenz an. Nicht berücksichtigt sind Steuern auf Erträge, wechselnde
            Zinsen, Förderungen, Betriebskosten (gelten für beide Seiten als gleich), Leerstand und persönliche Gründe wie
            Sicherheit oder Flexibilität. Preise: Angebotspreise{kaufpreise ? ` (${monatsname(kaufpreise.meta.stand)})` : ""}, keine
            Abschlüsse. Quelle: immopreise.at / derStandard.at{district ? `, ${district.id}. ${district.name}` : ""}.
          </div>
        </>
      )}
    </div>
  );
}
