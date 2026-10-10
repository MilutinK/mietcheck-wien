import { distanzM, type LonLat } from "./geo";

export const RADIEN_M = [300, 500, 800] as const;
export type Radius = (typeof RADIEN_M)[number];

export interface InRadius<T> {
  treffer: T[];
  /** Entfernung zum nächsten Punkt überhaupt (auch außerhalb des Radius), null ohne Daten */
  naechsteM: number | null;
  naechster: T | null;
}

/** Alle Punkte im Radius plus der nächste Punkt (für "nächste Haltestelle: 120 m"). */
export function suche<T extends LonLat>(punkte: T[], mitte: LonLat, radiusM: number): InRadius<T> {
  const treffer: T[] = [];
  let naechsteM = Infinity;
  let naechster: T | null = null;
  for (const p of punkte) {
    const d = distanzM(mitte, p);
    if (d <= radiusM) treffer.push(p);
    if (d < naechsteM) {
      naechsteM = d;
      naechster = p;
    }
  }
  return { treffer, naechsteM: naechster ? naechsteM : null, naechster };
}

/** Anzahl (oder Summe) im Radius für viele Rasterpunkte, ohne die Treffer selbst zu behalten. */
export function werteImRadius<T extends LonLat>(
  raster: LonLat[],
  punkte: T[],
  radiusM: number,
  gewicht: (p: T) => number = () => 1
): number[] {
  return raster.map((mitte) => {
    let summe = 0;
    for (const p of punkte) if (distanzM(mitte, p) <= radiusM) summe += gewicht(p);
    return summe;
  });
}

/**
 * Prozentrang (0–100): Anteil der Vergleichswerte unter dem Wert, Gleiche zählen halb.
 * 80 heißt: besser als etwa 80 % der Vergleichslagen.
 */
export function prozentrang(vergleich: number[], wert: number): number {
  if (vergleich.length === 0) return 0;
  let weniger = 0;
  let gleich = 0;
  for (const v of vergleich) {
    if (v < wert) weniger++;
    else if (v === wert) gleich++;
  }
  return Math.round(((weniger + gleich / 2) / vergleich.length) * 100);
}

export type Einstufung = "sehr hoch" | "hoch" | "durchschnittlich" | "niedrig" | "sehr niedrig";

export function einstufung(rang: number): Einstufung {
  if (rang >= 80) return "sehr hoch";
  if (rang >= 60) return "hoch";
  if (rang >= 40) return "durchschnittlich";
  if (rang >= 20) return "niedrig";
  return "sehr niedrig";
}