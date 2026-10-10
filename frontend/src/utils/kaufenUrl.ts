export type Zahl = number | "";

/** Alle Eingaben des Rechners "Mieten oder kaufen?". "" = Feld leer (dann gilt der Vorschlag bzw. Standard). */
export interface KaufEingaben {
  bezirkId: number;
  flaeche: number;
  /** Eigener Kaufpreis; leer = Bezirksdurchschnitt */
  kaufpreis: Zahl;
  /** Eigene Miete pro Monat; leer = Bezirksdurchschnitt */
  miete: Zahl;
  eigenkapital: Zahl;
  zins: Zahl;
  laufzeit: Zahl;
  horizont: number;
  nebenkosten: Zahl;
  wertsteigerung: Zahl;
  anlage: Zahl;
  instandhaltung: Zahl;
  verkaufskosten: Zahl;
  /** Leer = Standard */
  mietsteigerung: Zahl;
}

/** Standardwerte der Annahmen (als Zahlen, für Rückfälle bei leeren Feldern) */
export const KAUF_ZAHLEN = {
  zins: 3.5,
  laufzeit: 30,
  horizont: 20,
  nebenkosten: 10,
  wertsteigerung: 2.5,
  anlage: 3,
  instandhaltung: 1,
  verkaufskosten: 2,
  mietsteigerung: 3,
} as const;

export const KAUF_STANDARD: KaufEingaben = {
  bezirkId: 10,
  flaeche: 60,
  kaufpreis: "",
  miete: "",
  eigenkapital: 60_000,
  zins: KAUF_ZAHLEN.zins,
  laufzeit: KAUF_ZAHLEN.laufzeit,
  horizont: KAUF_ZAHLEN.horizont,
  nebenkosten: KAUF_ZAHLEN.nebenkosten,
  wertsteigerung: KAUF_ZAHLEN.wertsteigerung,
  anlage: KAUF_ZAHLEN.anlage,
  instandhaltung: KAUF_ZAHLEN.instandhaltung,
  verkaufskosten: KAUF_ZAHLEN.verkaufskosten,
  mietsteigerung: "",
};

/** URL-Parameter je Feld mit erlaubtem Bereich; Werte außerhalb werden ignoriert */
const FELDER: { feld: keyof KaufEingaben; param: string; min: number; max: number; ganz?: boolean }[] = [
  { feld: "bezirkId", param: "kb", min: 1, max: 23, ganz: true },
  { feld: "flaeche", param: "kf", min: 10, max: 300 },
  { feld: "kaufpreis", param: "kp", min: 0, max: 50_000_000 },
  { feld: "miete", param: "km", min: 0, max: 100_000 },
  { feld: "eigenkapital", param: "ke", min: 0, max: 50_000_000 },
  { feld: "zins", param: "kz", min: 0, max: 15 },
  { feld: "laufzeit", param: "kl", min: 1, max: 40 },
  { feld: "horizont", param: "kh", min: 5, max: 40, ganz: true },
  { feld: "nebenkosten", param: "kn", min: 0, max: 25 },
  { feld: "wertsteigerung", param: "kw", min: -5, max: 10 },
  { feld: "anlage", param: "kr", min: 0, max: 12 },
  { feld: "instandhaltung", param: "ki", min: 0, max: 10 },
  { feld: "verkaufskosten", param: "kv", min: 0, max: 15 },
  { feld: "mietsteigerung", param: "ks", min: 0, max: 15 },
];

const MODUS_PARAM = "rechner";
const MODUS_KAUFEN = "kaufen";

/**
 * Liest einen geteilten Rechner aus der URL, z. B. ?rechner=kaufen&kb=7&kp=420000&kz=4.
 * Fehlende oder ungültige Werte bleiben beim Standard; null, wenn gar kein Kauf-Rechner geteilt wurde.
 */
export function leseKaufParams(search: string): KaufEingaben | null {
  const params = new URLSearchParams(search);
  if (params.get(MODUS_PARAM) !== MODUS_KAUFEN) return null;

  const eingaben: KaufEingaben = { ...KAUF_STANDARD };
  for (const { feld, param, min, max, ganz } of FELDER) {
    const roh = params.get(param);
    if (roh === null || roh.trim() === "") continue;
    const wert = Number(roh);
    if (!Number.isFinite(wert) || wert < min || wert > max) continue;
    if (ganz && !Number.isInteger(wert)) continue;
    (eingaben[feld] as Zahl | number) = wert;
  }
  return eingaben;
}

/** Schreibt den Rechner in die URL-Parameter bzw. entfernt ihn bei null; nur Abweichungen vom Standard kommen hinein. */
export function schreibeKaufParams(params: URLSearchParams, eingaben: KaufEingaben | null): void {
  params.delete(MODUS_PARAM);
  for (const { param } of FELDER) params.delete(param);
  if (!eingaben) return;

  params.set(MODUS_PARAM, MODUS_KAUFEN);
  for (const { feld, param } of FELDER) {
    const wert = eingaben[feld];
    if (wert === "" || wert === KAUF_STANDARD[feld]) continue; // leere Felder und Standardwerte bleiben weg
    params.set(param, String(wert));
  }
}
