import type { FeatureCollection } from "geojson";
import { flaechenAusGeoJson, type BezirkFlaeche } from "../utils/geo";

let cache: Promise<BezirkFlaeche[] | null> | null = null;

/** Bezirksgrenzen als Flächen für Punkt-in-Polygon-Abfragen (einmalig geladen). */
export function loadBezirksflaechen(): Promise<BezirkFlaeche[] | null> {
  cache ??= fetch("/data/bezirksgrenzen.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Bezirksgrenzen: HTTP ${r.status}`);
      return r.json() as Promise<FeatureCollection>;
    })
    .then(flaechenAusGeoJson)
    .catch((err) => {
      console.warn("Bezirksgrenzen konnten nicht geladen werden:", err);
      return null;
    });
  return cache;
}