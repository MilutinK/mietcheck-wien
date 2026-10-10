import type { GemeindebauAnlage, GemeindebauDaten, GemeindebauSumme } from "../types/gemeindebau";

interface GemeindebauDatei {
  meta: { wohnungen: number };
  bezirke: Record<string, GemeindebauSumme>;
  /** Spaltenreihenfolge: lon, lat, wohnungen, baujahr, bezirk, name, adresse */
  anlagen: [number, number, number | null, number | null, number | null, string, string][];
}

let cache: Promise<GemeindebauDaten | null> | null = null;

/** Lädt gemeindebau.json einmalig (Karte und Bezirkspanel teilen sich den Abruf). */
export function loadGemeindebau(): Promise<GemeindebauDaten | null> {
  cache ??= fetch("/data/gemeindebau.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Gemeindebau-Daten: HTTP ${r.status}`);
      return r.json() as Promise<GemeindebauDatei>;
    })
    .then((d): GemeindebauDaten => ({
      bezirke: d.bezirke,
      wohnungenGesamt: d.meta.wohnungen,
      anlagen: d.anlagen.map(
        ([lon, lat, wohnungen, baujahr, bezirk, name, adresse]): GemeindebauAnlage => ({
          lon, lat, wohnungen, baujahr, bezirk, name, adresse,
        })
      ),
    }))
    .catch((err) => {
      console.warn("Gemeindebau-Daten konnten nicht geladen werden:", err);
      return null;
    });
  return cache;
}