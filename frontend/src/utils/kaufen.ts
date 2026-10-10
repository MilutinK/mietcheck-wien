import { ersterUndLetzterWert, gleitenderMedian, type Reihe } from "./verlauf";

/** Preise je Größenklasse (EUR/m2); die Namen entsprechen mietpreise.json und kaufpreise.json */
export interface Groessenklassen {
  unter_50m2: number | null;
  von_51_bis_80m2: number | null;
  von_81_bis_129m2: number | null;
  ueber_130m2: number | null;
  durchschnitt: number | null;
}

/** Preis pro m2 passend zur Wohnungsgröße; ohne Wert für die Klasse gilt der Durchschnitt. */
export function preisFuerFlaeche(klassen: Groessenklassen, flaecheM2: number): number | null {
  const klasse =
    flaecheM2 <= 50
      ? klassen.unter_50m2
      : flaecheM2 <= 80
        ? klassen.von_51_bis_80m2
        : flaecheM2 < 130
          ? klassen.von_81_bis_129m2
          : klassen.ueber_130m2;
  return klasse ?? klassen.durchschnitt;
}

/**
 * Mietsteigerung pro Jahr in Prozent aus einer Zeitreihe (gleitender 12-Monats-Median), gemessen über bis zu
 * `jahre` Jahre bis zum letzten Wert. Gibt null zurück, wenn weniger als drei Jahre Daten vorliegen.
 */
export function mietsteigerungProJahr(reihe: Reihe, jahre = 10): number | null {
  const glatt = gleitenderMedian(reihe, 12, 8);
  const grenzen = ersterUndLetzterWert(glatt);
  if (!grenzen) return null;
  const [erster, ende] = grenzen;
  let start = Math.max(erster, ende - jahre * 12);
  // Startpunkt ohne Wert: nächsten mit Wert nehmen
  while (start < ende && glatt[start] === null) start++;
  const monate = ende - start;
  const von = glatt[start];
  const bis = glatt[ende];
  if (monate < 36 || von == null || bis == null || von <= 0) return null;
  return (Math.pow(bis / von, 12 / monate) - 1) * 100;
}

export interface KaufParameter {
  kaufpreis: number;
  /** Kaufnebenkosten in Prozent des Preises (Steuern, Gebühren, Provision) */
  nebenkostenProzent: number;
  eigenkapital: number;
  zinsProzent: number;
  laufzeitJahre: number;
  /** Miete im ersten Monat, brutto inkl. Betriebskosten */
  miete: number;
  mietsteigerungProzent: number;
  wertsteigerungProzent: number;
  /** Netto-Rendite, mit der freies Geld angelegt wird */
  anlageProzent: number;
  /** Instandhaltung und Rücklage für Eigentümer, EUR pro Monat im ersten Jahr */
  instandhaltungMonat: number;
  /** Kosten beim Verkauf in Prozent des Werts */
  verkaufskostenProzent: number;
  horizontJahre: number;
}

export interface JahresStand {
  jahr: number;
  /** Vermögen, wenn du in diesem Jahr verkaufst (Wert minus Kredit minus Verkaufskosten plus Angelegtes) */
  kaufen: number;
  /** Vermögen, wenn du mietest und das Geld anlegst */
  mieten: number;
}

export interface KaufErgebnis {
  nebenkosten: number;
  kredit: number;
  /** Monatliche Kreditrate (0 ohne Kredit) */
  rate: number;
  /** Kreditrate plus Instandhaltung im ersten Monat */
  kostenKaufenMonat: number;
  jahre: JahresStand[];
  /** Erstes Jahr, in dem Kaufen vorn liegt; null, wenn es im Horizont nicht passiert */
  breakEvenJahr: number | null;
  /** Summe der gezahlten Zinsen im Horizont */
  zinsenGesamt: number;
  endeKaufen: number;
  endeMieten: number;
}

/** Monatsrate eines Annuitätendarlehens; bei Zins 0 gleichmäßige Tilgung. */
export function annuitaet(kredit: number, zinsProzent: number, laufzeitJahre: number): number {
  const n = Math.round(laufzeitJahre * 12);
  if (kredit <= 0 || n <= 0) return 0;
  const r = zinsProzent / 100 / 12;
  return r === 0 ? kredit / n : (kredit * r) / (1 - Math.pow(1 + r, -n));
}

const INFLATION = 0.02; // lässt die Instandhaltungskosten jährlich steigen
const monatlich = (jahreszins: number) => Math.pow(1 + jahreszins, 1 / 12) - 1;

/**
 * Vergleicht Kaufen und Mieten über den Horizont. Beide beginnen mit demselben Eigenkapital. Wer monatlich
 * weniger zahlt, legt die Differenz an. Am Ende zählt das Vermögen: beim Kauf Wert minus Restkredit minus
 * Verkaufskosten plus Angelegtes, beim Mieten das Angelegte.
 */
export function vergleiche(p: KaufParameter): KaufErgebnis {
  const nebenkosten = (p.kaufpreis * p.nebenkostenProzent) / 100;
  const bedarf = p.kaufpreis + nebenkosten;
  const kredit = Math.max(0, bedarf - p.eigenkapital);
  const rate = annuitaet(kredit, p.zinsProzent, p.laufzeitJahre);
  const raten = Math.round(p.laufzeitJahre * 12);
  const rMonat = p.zinsProzent / 100 / 12;
  const anlageMonat = monatlich(p.anlageProzent / 100);

  let restschuld = kredit;
  let anlageKaufen = Math.max(0, p.eigenkapital - bedarf); // Eigenkapital über den Bedarf hinaus bleibt angelegt
  let anlageMieten = p.eigenkapital;
  let zinsenGesamt = 0;

  const jahre: JahresStand[] = [];
  const stand = (monat: number): JahresStand => {
    const wert = p.kaufpreis * Math.pow(1 + p.wertsteigerungProzent / 100, monat / 12);
    return {
      jahr: monat / 12,
      kaufen: wert * (1 - p.verkaufskostenProzent / 100) - restschuld + anlageKaufen,
      mieten: anlageMieten,
    };
  };
  jahre.push(stand(0));

  const monate = Math.round(p.horizontJahre * 12);
  for (let t = 1; t <= monate; t++) {
    const jahrIndex = Math.floor((t - 1) / 12);
    const miete = p.miete * Math.pow(1 + p.mietsteigerungProzent / 100, jahrIndex);
    const instandhaltung = p.instandhaltungMonat * Math.pow(1 + INFLATION, jahrIndex);

    let kreditRate = 0;
    if (t <= raten && restschuld > 0) {
      const zinsen = restschuld * rMonat;
      zinsenGesamt += zinsen;
      kreditRate = Math.min(rate, restschuld + zinsen);
      restschuld = Math.max(0, restschuld - (kreditRate - zinsen));
    }

    const kostenKaufen = kreditRate + instandhaltung;
    anlageKaufen *= 1 + anlageMonat;
    anlageMieten *= 1 + anlageMonat;
    const differenz = kostenKaufen - miete;
    if (differenz > 0) anlageMieten += differenz; // Mieten ist günstiger: Differenz anlegen
    else anlageKaufen += -differenz; // Kaufen ist günstiger

    if (t % 12 === 0) jahre.push(stand(t));
  }

  const ende = jahre[jahre.length - 1];
  const vorn = jahre.find((j) => j.jahr > 0 && j.kaufen >= j.mieten);
  return {
    nebenkosten,
    kredit,
    rate,
    kostenKaufenMonat: rate + p.instandhaltungMonat,
    jahre,
    breakEvenJahr: vorn ? vorn.jahr : null,
    zinsenGesamt,
    endeKaufen: ende.kaufen,
    endeMieten: ende.mieten,
  };
}
