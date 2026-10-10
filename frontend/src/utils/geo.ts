import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export interface LonLat {
  lon: number;
  lat: number;
}

const M_PRO_GRAD_LAT = 110540;
const M_PRO_GRAD_LON_AM_AEQUATOR = 111320;

/**
 * Entfernung in Metern (Näherung für Stadtmaßstab, Fehler unter 0,1 % in Wien).
 * Schneller als Haversine, weil sie für viele Punkte pro Rasterzelle gebraucht wird.
 */
export function distanzM(a: LonLat, b: LonLat): number {
  const dy = (b.lat - a.lat) * M_PRO_GRAD_LAT;
  const dx = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180)) * M_PRO_GRAD_LON_AM_AEQUATOR;
  return Math.hypot(dx, dy);
}

/** Ray-Casting: liegt der Punkt in diesem Ring? Ring = [[lon, lat], ...] */
export function punktInRing(lon: number, lat: number, ring: number[][]): boolean {
  let innen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) innen = !innen;
  }
  return innen;
}

/** Polygon = [äußerer Ring, Löcher...] */
export function punktInPolygon(lon: number, lat: number, polygon: number[][][]): boolean {
  if (!punktInRing(lon, lat, polygon[0])) return false;
  return !polygon.slice(1).some((loch) => punktInRing(lon, lat, loch));
}

export interface BezirkFlaeche {
  id: number;
  polygone: number[][][][];
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
}

type PolygonFeature = Feature<Polygon | MultiPolygon>;

export function flaechenAusGeoJson(fc: FeatureCollection): BezirkFlaeche[] {
  const flaechen: BezirkFlaeche[] = [];
  for (const feature of fc.features as PolygonFeature[]) {
    const id = Number(feature.properties?.BEZNR || feature.properties?.BEZ);
    const geom = feature.geometry;
    if (!id || !geom) continue;
    const polygone = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const poly of polygone) {
      for (const [lon, lat] of poly[0]) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
    flaechen.push({ id, polygone, bbox: [minLon, minLat, maxLon, maxLat] });
  }
  return flaechen;
}

/** Bezirksnummer, in dem der Punkt liegt – null außerhalb von Wien. */
export function findeBezirk(flaechen: BezirkFlaeche[], lon: number, lat: number): number | null {
  for (const f of flaechen) {
    const [minLon, minLat, maxLon, maxLat] = f.bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    if (f.polygone.some((p) => punktInPolygon(lon, lat, p))) return f.id;
  }
  return null;
}

/** Gleichmäßiges Raster über alle Bezirke (Zellabstand in Metern), nur Punkte innerhalb von Wien. */
export function rasterInWien(flaechen: BezirkFlaeche[], schrittM: number): LonLat[] {
  if (flaechen.length === 0) return [];
  const minLon = Math.min(...flaechen.map((f) => f.bbox[0]));
  const minLat = Math.min(...flaechen.map((f) => f.bbox[1]));
  const maxLon = Math.max(...flaechen.map((f) => f.bbox[2]));
  const maxLat = Math.max(...flaechen.map((f) => f.bbox[3]));

  const dLat = schrittM / M_PRO_GRAD_LAT;
  const dLon = schrittM / (Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) * M_PRO_GRAD_LON_AM_AEQUATOR);

  const punkte: LonLat[] = [];
  for (let lat = minLat + dLat / 2; lat < maxLat; lat += dLat) {
    for (let lon = minLon + dLon / 2; lon < maxLon; lon += dLon) {
      if (findeBezirk(flaechen, lon, lat) !== null) punkte.push({ lon, lat });
    }
  }
  return punkte;
}