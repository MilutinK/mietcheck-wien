import { describe, expect, it } from "vitest";
import { einstufung, prozentrang, suche, werteImRadius } from "./standort";

const mitte = { lon: 16.37, lat: 48.2 };
// ca. 0,0009° Breite = 100 m
const nord = (m: number) => ({ lon: 16.37, lat: 48.2 + m / 110540 });

describe("suche", () => {
  const punkte = [{ ...nord(100), id: "a" }, { ...nord(400), id: "b" }, { ...nord(900), id: "c" }];

  it("findet nur Punkte im Radius und den nächsten", () => {
    const r = suche(punkte, mitte, 500);
    expect(r.treffer.map((p) => p.id)).toEqual(["a", "b"]);
    expect(r.naechster?.id).toBe("a");
    expect(Math.round(r.naechsteM ?? 0)).toBe(100);
  });

  it("meldet den nächsten Punkt auch außerhalb des Radius", () => {
    const r = suche(punkte, nord(2000), 300);
    expect(r.treffer).toEqual([]);
    expect(r.naechster?.id).toBe("c");
  });

  it("verträgt eine leere Liste", () => {
    expect(suche([], mitte, 500)).toEqual({ treffer: [], naechsteM: null, naechster: null });
  });
});

describe("werteImRadius", () => {
  it("zählt oder summiert je Rasterpunkt", () => {
    const raster = [mitte, nord(5000)];
    const punkte = [{ ...nord(100), w: 10 }, { ...nord(200), w: 5 }];
    expect(werteImRadius(raster, punkte, 500)).toEqual([2, 0]);
    expect(werteImRadius(raster, punkte, 500, (p) => p.w)).toEqual([15, 0]);
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