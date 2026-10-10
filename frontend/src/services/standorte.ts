import type { FaktorId, StandortPunkt } from "../types/standorte";

type OgdFaktor = Exclude<FaktorId, "oeffi" | "gemeindebau">;

interface StandorteDatei {
  /** Spaltenreihenfolge: lon, lat, name, detail, gewicht */
  faktoren: Record<OgdFaktor, [number, number, string, string, number][]>;
}

let cache: Promise<Record<OgdFaktor, StandortPunkt[]> | null> | null = null;

/** Lädt standorte.json einmalig. Die Datei ist groß, daher nur bei aktivem Standort-Check aufrufen. */
export function loadStandorte(): Promise<Record<OgdFaktor, StandortPunkt[]> | null> {
  cache ??= fetch("/data/standorte.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Standorte: HTTP ${r.status}`);
      return r.json() as Promise<StandorteDatei>;
    })
    .then((d) => {
      const out = {} as Record<OgdFaktor, StandortPunkt[]>;
      for (const id of Object.keys(d.faktoren) as OgdFaktor[]) {
        out[id] = d.faktoren[id].map(([lon, lat, name, detail, gewicht]): StandortPunkt => ({ lon, lat, name, detail, gewicht }));
      }
      return out;
    })
    .catch((err) => {
      console.warn("Standorte konnten nicht geladen werden:", err);
      return null;
    });
  return cache;
}