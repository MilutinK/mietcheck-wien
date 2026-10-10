import type { Mietverlauf } from "../types/mietverlauf";

export type Reihe = (number | null)[];

/** Median einer Zahlenliste; null bei leerer Liste. */
export function median(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const s = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(s.length / 2);
  return s.length % 2 ? s[mitte] : (s[mitte - 1] + s[mitte]) / 2;
}

/**
 * Gleitender Median über die letzten `fenster` Monate (mit dem aktuellen Monat). Der Median ist
 * robuster als der Mittelwert, weil einzelne Monate in den Quelldaten Ausreißer haben.
 * Erst ab `mindestens` vorhandenen Werten im Fenster wird ein Wert ausgegeben, davor null.
 */
export function gleitenderMedian(reihe: Reihe, fenster = 12, mindestens = fenster): Reihe {
  return reihe.map((_, i) => {
    if (i + 1 < fenster) return null;
    const teil = reihe.slice(i + 1 - fenster, i + 1).filter((v): v is number => v !== null);
    return teil.length >= mindestens ? median(teil) : null;
  });
}

/** Wien-Wert je Monat: Median der Bezirkswerte (ungewichtet, es gibt keine Gewichte in den Quelldaten). */
export function wienMedian(bezirke: Reihe[]): Reihe {
  const laenge = bezirke[0]?.length ?? 0;
  return Array.from({ length: laenge }, (_, i) =>
    median(bezirke.map((r) => r[i]).filter((v): v is number => v !== null))
  );
}

/** Prozentuale Veränderung zwischen zwei Werten; null, wenn einer fehlt oder der Start 0 ist. */
export function veraenderungProzent(von: number | null | undefined, bis: number | null | undefined): number | null {
  if (von == null || bis == null || von === 0) return null;
  return ((bis - von) / von) * 100;
}

/** Erster und letzter Index mit Wert; null, wenn die Reihe leer ist. */
export function ersterUndLetzterWert(reihe: Reihe, ab = 0): [number, number] | null {
  let erster = -1;
  let letzter = -1;
  for (let i = ab; i < reihe.length; i++) {
    if (reihe[i] !== null) {
      if (erster < 0) erster = i;
      letzter = i;
    }
  }
  return erster < 0 ? null : [erster, letzter];
}

/** "2024-03" -> "März 2024" */
export function monatsname(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  const namen = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${namen[m - 1]} ${jahr}`;
}

export interface Zeitreise {
  /** Geglättete Reihe (12-Monats-Median) je Bezirksnummer */
  reihen: Record<number, Reihe>;
  /** Erster Monatsindex, für den es Werte gibt (davor fehlt das 12-Monats-Fenster) */
  erster: number;
  letzter: number;
  /** Kleinster und größter Wert über alle Bezirke und Monate: feste Farbskala für den Zeitvergleich */
  min: number;
  max: number;
}

/** Bereitet die Zeitreihen für die Karte auf; null, wenn es keine Werte gibt. */
export function zeitreiseAus(verlauf: Mietverlauf): Zeitreise | null {
  const reihen: Record<number, Reihe> = {};
  let min = Infinity;
  let max = -Infinity;
  let erster = Infinity;
  for (const [id, roh] of Object.entries(verlauf.bezirke)) {
    const glatt = gleitenderMedian(roh, 12, 8);
    reihen[Number(id)] = glatt;
    const grenzen = ersterUndLetzterWert(glatt);
    if (grenzen) erster = Math.min(erster, grenzen[0]);
    for (const v of glatt) {
      if (v === null) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min)) return null;
  return { reihen, erster, letzter: verlauf.monate.length - 1, min, max };
}
