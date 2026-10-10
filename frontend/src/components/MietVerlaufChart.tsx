import { useId, useMemo, useState } from "react";
import { useMietverlauf } from "../hooks/useMietverlauf";
import {
  ersterUndLetzterWert,
  gleitenderMedian,
  monatsname,
  reihenFuerArt,
  type Art,
  veraenderungProzent,
  wienMedian,
  type Reihe,
} from "../utils/verlauf";
import Slider from "./Slider";

interface Props {
  bezirkId: number;
  bezirkName: string;
}

const BEREICHE = [
  { key: "alles", label: "Alles", monate: Infinity },
  { key: "10", label: "10 Jahre", monate: 120 },
  { key: "5", label: "5 Jahre", monate: 60 },
  { key: "2", label: "2 Jahre", monate: 24 },
] as const;
type BereichKey = (typeof BEREICHE)[number]["key"];

const ARTEN: { key: Art; label: string }[] = [
  { key: "gesamt", label: "Gesamt" },
  { key: "altbau", label: "Altbau" },
  { key: "neubau", label: "Neubau" },
];

// Zeichenfläche
const W = 348;
const H = 170;
const RAND = { l: 34, r: 8, t: 8, b: 22 };

const fmt = (v: number | null | undefined) => (v == null ? "k. A." : `${v.toFixed(1).replace(".", ",")} €`);
const fmtProzent = (p: number | null) =>
  p == null ? "k. A." : `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(0)} %`;

/** Schöne Achsenwerte: Schrittweite 1, 2, 5 oder 10 € je nach Spanne */
function achsenwerte(min: number, max: number): number[] {
  const spanne = max - min;
  const schritt = spanne <= 4 ? 1 : spanne <= 10 ? 2 : spanne <= 25 ? 5 : 10;
  const start = Math.ceil(min / schritt) * schritt;
  const werte: number[] = [];
  for (let v = start; v <= max; v += schritt) werte.push(v);
  return werte;
}

export default function MietVerlaufChart({ bezirkId, bezirkName }: Props) {
  const daten = useMietverlauf();
  const [bereich, setBereich] = useState<BereichKey>("alles");
  const [art, setArt] = useState<Art>("gesamt");
  const [auswahl, setAuswahl] = useState<number | null>(null); // Index in daten.monate, null = letzter Monat
  const clipId = useId();

  const reihen = useMemo(() => {
    if (!daten) return null;
    const alleReihen = reihenFuerArt(daten, art);
    const roh: Reihe = alleReihen[String(bezirkId)] ?? [];
    const alle = Object.values(alleReihen);
    return {
      roh,
      bezirk: gleitenderMedian(roh, 12, 8),
      wien: gleitenderMedian(wienMedian(alle), 12, 8),
    };
  }, [daten, bezirkId, art]);

  if (!daten || !reihen) return null;

  const letzter = daten.monate.length - 1;
  const monateSicht = BEREICHE.find((b) => b.key === bereich)!.monate;

  // Welche Art (Gesamt, Altbau, Neubau) angezeigt wird; Altbau und Neubau gibt es nur, wenn die Daten sie enthalten
  const artAuswahl = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }} role="group" aria-label="Art der Wohnung">
      {ARTEN.filter((a) => a.key === "gesamt" || daten[a.key] !== undefined).map((a) => (
        <button
          key={a.key}
          className="faktor-toggle"
          aria-pressed={art === a.key}
          onClick={() => {
            setArt(a.key);
            setAuswahl(null);
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );

  // Erster und letzter Monat, für den es eine geglättete Linie gibt (12-Monats-Fenster; bei Altbau in kleinen Bezirken oft später)
  const bezirkGlatt = ersterUndLetzterWert(reihen.bezirk);
  if (!bezirkGlatt) {
    return (
      <div className="panel-section" style={{ marginBottom: 16 }}>
        <h3>Mieten im Zeitverlauf</h3>
        {artAuswahl}
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Für {bezirkName} gibt es bei dieser Art zu wenige Inserate, um einen Verlauf zu zeigen. Wähle „Gesamt“ oder
          eine andere Art.
        </p>
      </div>
    );
  }
  const [ersterGlatt, ende] = bezirkGlatt;
  // Ohne eigene Wahl zeigt die Auswahl den letzten Monat mit Wert für diesen Bezirk
  const gewaehlt = auswahl ?? ende;
  const start = Math.max(ersterGlatt, Number.isFinite(monateSicht) ? letzter - monateSicht + 1 : 0);
  const anzahl = letzter - start + 1;

  // Wertebereich der sichtbaren Linien (Rohwerte bleiben bewusst draußen, damit Ausreißer die Achse nicht verzerren)
  const sichtbar = [...reihen.bezirk.slice(start), ...reihen.wien.slice(start)].filter((v): v is number => v !== null);
  const lo = Math.min(...sichtbar);
  const hi = Math.max(...sichtbar);
  const pad = (hi - lo) * 0.12 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const x = (i: number) => RAND.l + ((i - start) / Math.max(1, anzahl - 1)) * (W - RAND.l - RAND.r);
  const y = (v: number) => RAND.t + (1 - (v - yMin) / (yMax - yMin)) * (H - RAND.t - RAND.b);

  const pfad = (reihe: Reihe) => {
    let d = "";
    let offen = false;
    for (let i = start; i <= letzter; i++) {
      const v = reihe[i];
      if (v === null) {
        offen = false;
        continue;
      }
      d += `${offen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      offen = true;
    }
    return d.trim();
  };

  // Jahresmarken auf der x-Achse (ab 5 Jahren nur jedes zweite Jahr)
  const jahresSchritt = anzahl > 100 ? 2 : 1;
  const jahre: { i: number; label: string }[] = [];
  for (let i = start; i <= letzter; i++) {
    const [jahr, monat] = daten.monate[i].split("-").map(Number);
    if (monat === 1 && jahr % jahresSchritt === 0) jahre.push({ i, label: String(jahr) });
  }

  // Veränderung im sichtbaren Zeitraum (geglättet)
  const aenderungBezirk = veraenderungProzent(reihen.bezirk[start], reihen.bezirk[ende]);
  const aenderungWien = veraenderungProzent(reihen.wien[start], reihen.wien[letzter]);

  const zeigeAuswahl = Math.min(Math.max(gewaehlt, start), letzter);
  const wertBezirk = reihen.bezirk[zeigeAuswahl];
  const wertWien = reihen.wien[zeigeAuswahl];
  const rohBezirk = reihen.roh[zeigeAuswahl];

  const bildText =
    `Mietpreisentwicklung ${bezirkName} seit ${monatsname(daten.monate[start])}: ` +
    `${fmt(reihen.bezirk[start])} auf ${fmt(reihen.bezirk[letzter])} (${fmtProzent(aenderungBezirk)}), ` +
    `Wien ${fmtProzent(aenderungWien)}.`;

  const zeigeX = x(zeigeAuswahl);

  const ausPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(start + ((px - RAND.l) / (W - RAND.l - RAND.r)) * (anzahl - 1));
    setAuswahl(Math.min(letzter, Math.max(start, i)));
  };

  return (
    <div className="panel-section" style={{ marginBottom: 16 }}>
      <h3>Mieten im Zeitverlauf</h3>

      {artAuswahl}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {BEREICHE.map((b) => (
          <button
            key={b.key}
            className="faktor-toggle"
            aria-pressed={bereich === b.key}
            onClick={() => {
              setBereich(b.key);
              setAuswahl(null);
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
            {fmtProzent(aenderungBezirk)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 6 }}>
            {ende < letzter ? `${monatsname(daten.monate[start])} bis ${monatsname(daten.monate[ende])}` : `seit ${monatsname(daten.monate[start])}`}
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Wien {fmtProzent(aenderungWien)}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={bildText}
        style={{ display: "block", marginTop: 6, touchAction: "pan-y", cursor: "crosshair" }}
        onPointerMove={ausPointer}
        onPointerDown={ausPointer}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={RAND.l} y={RAND.t} width={W - RAND.l - RAND.r} height={H - RAND.t - RAND.b} />
          </clipPath>
        </defs>

        {/* Gitter und y-Achse */}
        {achsenwerte(yMin, yMax).map((v) => (
          <g key={v}>
            <line x1={RAND.l} x2={W - RAND.r} y1={y(v)} y2={y(v)} stroke="var(--border-color)" strokeWidth="1" />
            <text x={RAND.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
              {v} €
            </text>
          </g>
        ))}

        {/* x-Achse */}
        {jahre.map((j) => (
          <text key={j.i} x={x(j.i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
            {j.label}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {/* Einzelmonate des Bezirks, blass */}
          <path d={pfad(reihen.roh)} fill="none" stroke="var(--text)" strokeOpacity="0.18" strokeWidth="1" />
          {/* Wien */}
          <path d={pfad(reihen.wien)} fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" />
          {/* Bezirk */}
          <path d={pfad(reihen.bezirk)} fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Auswahl */}
        <line x1={zeigeX} x2={zeigeX} y1={RAND.t} y2={H - RAND.b} stroke="var(--danger)" strokeWidth="1.2" />
        {wertWien !== null && <circle cx={zeigeX} cy={y(wertWien)} r="3.5" fill="var(--surface)" stroke="var(--text-secondary)" strokeWidth="2" />}
        {wertBezirk !== null && <circle cx={zeigeX} cy={y(wertBezirk)} r="4.5" fill="var(--danger)" stroke="var(--surface)" strokeWidth="2" />}
      </svg>

      {/* Zeitregler: Monat wählen (auch per Tastatur) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
        <Slider min={start} max={letzter} step={1} value={zeigeAuswahl} onChange={setAuswahl} ariaLabel="Monat wählen" />
      </div>

      <div style={{ marginTop: 6, fontSize: "0.8rem", lineHeight: 1.6 }} aria-live="polite">
        <strong>{monatsname(daten.monate[zeigeAuswahl])}</strong>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>
            <span style={{ display: "inline-block", width: 14, height: 3, background: "var(--text)", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />
            {bezirkName}: <strong>{fmt(wertBezirk)}</strong>
            {rohBezirk != null && wertBezirk != null && Math.abs(rohBezirk - wertBezirk) > 0.05 && (
              <span style={{ color: "var(--text-secondary)" }}> (Einzelmonat {fmt(rohBezirk)})</span>
            )}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-block", width: 14, borderTop: "2px dashed var(--text-secondary)", marginRight: 6, verticalAlign: "middle" }} />
            Wien: <strong>{fmt(wertWien)}</strong>
          </span>
        </div>
      </div>

      <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 8 }}>
        Gleitender 12-Monats-Median der Angebotspreise (brutto, €/m²), blass die Einzelmonate. „Wien“ ist der Median der
        23 Bezirke, ungewichtet (bei Altbau und Neubau nur der Bezirke mit Angaben). Die Zahl der berücksichtigten Inserate schwankt über die Jahre stark, frühe Werte sind
        weniger belastbar. Quelle: immopreise.at / derStandard.at.
      </div>
    </div>
  );
}
