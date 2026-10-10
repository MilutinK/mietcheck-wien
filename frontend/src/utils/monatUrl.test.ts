import { describe, expect, it } from "vitest";
import { leseMonatParam, schreibeMonatParam } from "./monatUrl";

describe("leseMonatParam", () => {
  it("liest gültige Monate", () => {
    expect(leseMonatParam("?monat=2019-05")).toBe("2019-05");
    expect(leseMonatParam("?bezirk=7&monat=2026-10")).toBe("2026-10");
  });

  it.each(["", "?monat=", "?monat=2019-13", "?monat=2019-00", "?monat=2019-5", "?monat=19-05", "?monat=abc", "?monat=2019-05-01"])(
    "liefert null für %s",
    (suche) => {
      expect(leseMonatParam(suche)).toBeNull();
    }
  );
});

describe("schreibeMonatParam", () => {
  it("setzt und entfernt den Monat, ohne andere Parameter anzufassen", () => {
    const p = new URLSearchParams("bezirk=7");
    schreibeMonatParam(p, "2019-05");
    expect(p.toString()).toBe("bezirk=7&monat=2019-05");
    schreibeMonatParam(p, null);
    expect(p.toString()).toBe("bezirk=7");
  });

  it("schreibt keine ungültigen Werte", () => {
    const p = new URLSearchParams("monat=2019-05");
    schreibeMonatParam(p, "kaputt");
    expect(p.has("monat")).toBe(false);
  });

  it("Schreiben und Lesen sind umkehrbar", () => {
    const p = new URLSearchParams();
    schreibeMonatParam(p, "2021-11");
    expect(leseMonatParam("?" + p.toString())).toBe("2021-11");
  });
});
