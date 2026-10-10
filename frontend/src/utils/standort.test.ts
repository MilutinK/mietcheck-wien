import { describe, expect, it } from "vitest";
import { distanzM } from "./geo";
import { PunktIndex, einstufung, prozentrang, werteImRadius } from "./standort";

const mitte = { lon: 16.37, lat: 48.2 };
// 100 m nach Norden entsprechen ca. 0,0009° Breite
const nord = (m: number) => ({ lon: 16.37, lat: 48.2 + m / 110540 });

describe("PunktIndex.suche", () => {
  const punkte = [{ ...nord(100), id: "a" }, { ...nord(400), id: "b" }, { ...nord(900), id: "c" }];
  const index = new PunktIndex(punkte);

  it("findet nur Punkte im Radius und den nächsten", () => {
    const r = index.suche(mitte, 500);
    expect(r.treffer.map((p) => p.id).sort()).toEqual(["a", "b"]);
    expect(r.naechster?.id).toBe("a");
    expect(Math.round(r.naechsteM ?? 0)).toBe(100);
  });

  it("meldet den nächsten Punkt auch außerhalb des Radius", () => {
    const r = index.suche(nord(2000), 300);
    expect(r.treffer).toEqual([]);
    expect(r.naechster?.id).toBe("c");
  });

  it("verträgt eine leere Liste", () => {
    expect(new PunktIndex([]).suche(mitte, 500)).toEqual({ treffer: [], naechsteM: null, naechster: null });
  });

  it("liefert dasselbe wie die Suche über alle Punkte", () => {
    // Raster aus Punkten über mehrere Zellen, Suche an verschiedenen Mitten
    const viele = [];
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) viele.push({ lon: 16.3 + i * 0.002, lat: 48.15 + j * 0.0015 });
    const idx = new PunktIndex(viele);
    for (const m of [{ lon: 16.33, lat: 48.18 }, { lon: 16.3, lat: 48.15 }, { lon: 16.38, lat: 48.2 }]) {
      for (const r of [300, 500, 800]) {
        const erwartet = viele.filter((p) => distanzM(m, p) <= r).length;
        expect(idx.suche(m, r).treffer.length).toBe(erwartet);
        expect(idx.summe(m, r)).toBe(erwartet);
      }
    }
  });
});

describe("werteImRadius", () => {
  it("zählt oder summiert je Rasterpunkt", () => {
    const raster = [mitte, nord(5000)];
    const index = new PunktIndex([{ ...nord(100), w: 10 }, { ...nord(200), w: 5 }]);
    expect(werteImRadius(raster, index, 500)).toEqual([2, 0]);
    expect(werteImRadius(raster, index, 500, (p) => p.w)).toEqual([15, 0]);
  });
});

describe("prozentrang", () => {
  it("Maximum liegt über allen anderen", () => {
    expect(prozentrang([1, 2, 3, 4], 10)).toBe(100);
  });

  it("Minimum liegt bei 0", () => {
    expect(prozentrang([1, 2, 3, 4], 0)).toBe(0);
  });

  it("gleiche Werte zählen halb", () => {
    expect(prozentrang([1, 2, 2, 3], 2)).toBe(50);
  });

  it("ohne Vergleichswerte 0", () => {
    expect(prozentrang([], 5)).toBe(0);
  });
});

describe("einstufung", () => {
  it("teilt in fünf Stufen", () => {
    expect([5, 30, 50, 70, 95].map(einstufung)).toEqual([
      "sehr niedrig", "niedrig", "durchschnittlich", "hoch", "sehr hoch",
    ]);
  });
});