import type { Haltestelle } from "../types/haltestellen";

interface HaltestellenDatei {
  /** Spaltenreihenfolge: lon, lat, name */
  haltestellen: [number, number, string][];
}

let cache: Promise<Haltestelle[] | null> | null = null;

/** Lädt haltestellen.json einmalig (Karte und Standort-Check teilen sich den Abruf). */
export function loadHaltestellen(): Promise<Haltestelle[] | null> {
  cache ??= fetch("/data/haltestellen.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Haltestellen: HTTP ${r.status}`);
      return r.json() as Promise<HaltestellenDatei>;
    })
    .then((d) => d.haltestellen.map(([lon, lat, name]): Haltestelle => ({ lon, lat, name })))
    .catch((err) => {
      console.warn("Haltestellen konnten nicht geladen werden:", err);
      return null;
    });
  return cache;
}