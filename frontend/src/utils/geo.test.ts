import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { distanzM, findeBezirk, flaechenAusGeoJson, punktInPolygon, rasterInWien } from "./geo";

// Zwei aneinandergrenzende Quadrate (je ca. 1 km), das zweite mit Loch
const quadrat = (minLon: number, minLat: number, d = 0.01) => [
  [minLon, minLat], [minLon + d, minLat], [minLon + d, minLat + d], [minLon, minLat + d], [minLon, minLat],
];

const bezirke: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { BEZNR: 1 }, geometry: { type: "Polygon", coordinates: [quadrat(16.3, 48.2)] } },
    {
      type: "Feature",
      properties: { BEZNR: 2 },
      geometry: { type: "Polygon", coordinates: [quadrat(16.31, 48.2), quadrat(16.314, 48.204, 0.002)] },
    },
  ],
};

describe("distanzM", () => {
  it("1 Breitengrad sind ca. 110,5 km", () => {
    expect(distanzM({ lon: 16, lat: 48 }, { lon: 16, lat: 49 })).toBeGreaterThan(110000);
    expect(distanzM({ lon: 16, lat: 48 }, { lon: 16, lat: 49 })).toBeLessThan(111500);
  });

  it("Stephansdom bis Westbahnhof liegt bei etwa 2,6 km", () => {
    const d = distanzM({ lon: 16.3731, lat: 48.2086 }, { lon: 16.3394, lat: 48.1966 });
    expect(d).toBeGreaterThan(2400);
    expect(d).toBeLessThan(2900);
  });

  it("gleicher Punkt hat Entfernung 0", () => {
    expect(distanzM({ lon: 16.3, lat: 48.2 }, { lon: 16.3, lat: 48.2 })).toBe(0);
  });
});

describe("Punkt in Fläche", () => {
  it("erkennt Punkte innen und außen", () => {
    const poly = [quadrat(16.3, 48.2)];
    expect(punktInPolygon(16.305, 48.205, poly)).toBe(true);
    expect(punktInPolygon(16.4, 48.205, poly)).toBe(false);
  });

  it("Löcher gehören nicht zur Fläche", () => {
    const poly = [quadrat(16.31, 48.2), quadrat(16.314, 48.204, 0.002)];
    expect(punktInPolygon(16.315, 48.205, poly)).toBe(false);
    expect(punktInPolygon(16.311, 48.201, poly)).toBe(true);
  });
});

describe("findeBezirk", () => {
  const flaechen = flaechenAusGeoJson(bezirke);

  it("ordnet Punkte dem richtigen Bezirk zu", () => {
    expect(findeBezirk(flaechen, 16.305, 48.205)).toBe(1);
    expect(findeBezirk(flaechen, 16.311, 48.201)).toBe(2);
  });

  it("liefert null außerhalb und im Loch", () => {
    expect(findeBezirk(flaechen, 16.5, 48.5)).toBeNull();
    expect(findeBezirk(flaechen, 16.315, 48.205)).toBeNull();
  });
});

describe("rasterInWien", () => {
  const flaechen = flaechenAusGeoJson(bezirke);

  it("enthält nur Punkte innerhalb der Bezirke", () => {
    const raster = rasterInWien(flaechen, 200);
    expect(raster.length).toBeGreaterThan(20);
    expect(raster.every((p) => findeBezirk(flaechen, p.lon, p.lat) !== null)).toBe(true);
  });

  it("ist ohne Bezirke leer", () => {
    expect(rasterInWien([], 500)).toEqual([]);
  });
});