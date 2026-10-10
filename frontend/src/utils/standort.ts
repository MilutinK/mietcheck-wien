import { distanzM, type LonLat } from "./geo";

export const RADIEN_M = [300, 500, 800] as const;
export type Radius = (typeof RADIEN_M)[number];

export interface InRadius<T> {
  treffer: T[];
  /** Entfernung zum nächsten Punkt überhaupt (auch außerhalb des Radius), null ohne Daten */
  naechsteM: number | null;
  naechster: T | null;
}

const M_PRO_GRAD_LAT = 110540;
const M_PRO_GRAD_LON = 111320 * Math.cos((48.2 * Math.PI) / 180);

/**
 * Räumlicher Index: Punkte werden in Zellen sortiert, eine Umkreissuche prüft nur die
 * Nachbarzellen statt aller Punkte. Nötig, weil für jede Lage hunderte Vergleichspunkte
 * über tausende Orte gezählt werden.
 */
export class PunktIndex<T extends LonLat> {
  private readonly zellen = new Map<string, T[]>();
  readonly punkte: T[];
  private readonly zelleM: number;

  constructor(punkte: T[], zelleM = 800) {
    this.punkte = punkte;
    this.zelleM = zelleM;
    for (const p of punkte) {
      const key = this.key(...this.zelle(p));
      const liste = this.zellen.get(key);
      if (liste) liste.push(p);
      else this.zellen.set(key, [p]);
    }
  }

  private zelle(p: LonLat): [number, number] {
    return [Math.floor((p.lon * M_PRO_GRAD_LON) / this.zelleM), Math.floor((p.lat * M_PRO_GRAD_LAT) / this.zelleM)];
  }

  private key(ix: number, iy: number): string {
    return `${ix}:${iy}`;
  }

  /** Ruft für jeden Punkt im Umkreis `fn` auf (ohne Zwischenliste). */
  private jedeImUmkreis(mitte: LonLat, radiusM: number, fn: (p: T, distanz: number) => void): void {
    const [cx, cy] = this.zelle(mitte);
    const ring = Math.ceil(radiusM / this.zelleM);
    for (let ix = cx - ring; ix <= cx + ring; ix++) {
      for (let iy = cy - ring; iy <= cy + ring; iy++) {
        const liste = this.zellen.get(this.key(ix, iy));
        if (!liste) continue;
        for (const p of liste) {
          const d = distanzM(mitte, p);
          if (d <= radiusM) fn(p, d);
        }
      }
    }
  }

  /** Summe der Gewichte im Umkreis (Standard: Anzahl). */
  summe(mitte: LonLat, radiusM: number, gewicht: (p: T) => number = () => 1): number {
    let s = 0;
    this.jedeImUmkreis(mitte, radiusM, (p) => {
      s += gewicht(p);
    });
    return s;
  }

  /** Alle Punkte im Umkreis plus der nächste Punkt (bei leerem Umkreis per Gesamtsuche). */
  suche(mitte: LonLat, radiusM: number): InRadius<T> {
    const treffer: T[] = [];
    let naechsteM = Infinity;
    let naechster: T | null = null;

    this.jedeImUmkreis(mitte, radiusM, (p, d) => {
      treffer.push(p);
      if (d < naechsteM) {
        naechsteM = d;
        naechster = p;
      }
    });

    if (!naechster) {
      for (const p of this.punkte) {
        const d = distanzM(mitte, p);
        if (d < naechsteM) {
          naechsteM = d;
          naechster = p;
        }
      }
    }
    return { treffer, naechsteM: naechster ? naechsteM : null, naechster };
  }
}

/** Messwert für viele Rasterpunkte (Anzahl oder Summe der Gewichte im Umkreis). */
export function werteImRadius<T extends LonLat>(
  raster: LonLat[],
  index: PunktIndex<T>,
  radiusM: number,
  gewicht?: (p: T) => number
): number[] {
  return raster.map((mitte) => index.summe(mitte, radiusM, gewicht));
}

/**
 * Prozentrang (0–100): Anteil der Vergleichswerte unter dem Wert, Gleiche zählen halb.
 * 80 heißt: mehr als etwa 80 % der Vergleichslagen.
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