import { describe, expect, it } from "vitest";
import { ersterUndLetzterWert, gleitenderMedian, median, monatsname, veraenderungProzent, wienMedian } from "./verlauf";

describe("median", () => {
  it("ungerade und gerade Anzahl", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it("leer ergibt null", () => {
    expect(median([])).toBeNull();
  });
});

describe("gleitenderMedian", () => {
  it("liefert erst ab vollem Fenster Werte", () => {
    const r = gleitenderMedian([1, 2, 3, 4, 5], 3);
    expect(r).toEqual([null, null, 2, 3, 4]);
  });

  it("dämpft einen Ausreißer", () => {
    const r = gleitenderMedian([10, 10, 10, 99, 10, 10], 3);
    expect(r[3]).toBe(10);
    expect(r[4]).toBe(10);
  });

  it("verträgt Lücken, solange genug Werte im Fenster sind", () => {
    const r = gleitenderMedian([10, null, 12, 14], 3, 2);
    expect(r).toEqual([null, null, 11, 13]);
  });

  it("gibt null, wenn zu viele Werte fehlen", () => {
    expect(gleitenderMedian([10, null, null, 14], 3, 2)[3]).toBeNull();
  });
});

describe("wienMedian", () => {
  it("nimmt je Monat den Median über die Bezirke", () => {
    expect(wienMedian([[1, 10], [2, 20], [9, null]])).toEqual([2, 15]);
  });
  it("ohne Bezirke leer", () => {
    expect(wienMedian([])).toEqual([]);
  });
});

describe("veraenderungProzent", () => {
  it("rechnet die Veränderung", () => {
    expect(veraenderungProzent(10, 15)).toBe(50);
    expect(veraenderungProzent(20, 15)).toBe(-25);
  });
  it("null bei fehlenden Werten oder Start 0", () => {
    expect(veraenderungProzent(null, 5)).toBeNull();
    expect(veraenderungProzent(5, undefined)).toBeNull();
    expect(veraenderungProzent(0, 5)).toBeNull();
  });
});

describe("ersterUndLetzterWert", () => {
  it("findet Anfang und Ende", () => {
    expect(ersterUndLetzterWert([null, 1, null, 2, null])).toEqual([1, 3]);
  });
  it("berücksichtigt den Startindex", () => {
    expect(ersterUndLetzterWert([1, 2, 3], 2)).toEqual([2, 2]);
  });
  it("leer ergibt null", () => {
    expect(ersterUndLetzterWert([null, null])).toBeNull();
  });
});

describe("monatsname", () => {
  it("schreibt den Monat deutsch (Österreich)", () => {
    expect(monatsname("2024-01")).toBe("Jänner 2024");
    expect(monatsname("2026-10")).toBe("Oktober 2026");
  });
});
