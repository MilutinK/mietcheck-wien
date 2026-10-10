import { describe, expect, it } from "vitest";
import { STANDARD_AUF_KARTE } from "./faktoren";
import { leseStandortParams, schreibeStandortParams } from "./standortUrl";

describe("leseStandortParams", () => {
  it("liest Punkt, Radius und Ebenen", () => {
    const s = leseStandortParams("?standort=48.2086,16.3731&r=800&karte=oeffi,schule");
    expect(s).toEqual({ punkt: { lat: 48.2086, lon: 16.3731 }, radius: 800, sichtbar: ["oeffi", "schule"] });
  });

  it("nimmt Standardwerte, wenn r und karte fehlen", () => {
    const s = leseStandortParams("?standort=48.2,16.37");
    expect(s?.radius).toBe(500);
    expect(s?.sichtbar).toEqual(STANDARD_AUF_KARTE);
  });

  it("verwirft ungültige Radien und Ebenen", () => {
    const s = leseStandortParams("?standort=48.2,16.37&r=999&karte=oeffi,gibtsnicht");
    expect(s?.radius).toBe(500);
    expect(s?.sichtbar).toEqual(["oeffi"]);
  });

  it("leeres karte= heißt: keine Ebene sichtbar", () => {
    expect(leseStandortParams("?standort=48.2,16.37&karte=")?.sichtbar).toEqual([]);
  });

  it.each([
    "",
    "?bezirk=7",
    "?standort=",
    "?standort=48.2",
    "?standort=abc,def",
    "?standort=48.2,16.37,1",
    "?standort=51.5,0.1", // London
    "?standort=0,0",
  ])("liefert null für %s", (suche) => {
    expect(leseStandortParams(suche)).toBeNull();
  });
});

describe("schreibeStandortParams", () => {
  const standard = { punkt: { lat: 48.2086, lon: 16.3731 }, radius: 500 as const, sichtbar: STANDARD_AUF_KARTE };

  it("lässt Standardwerte weg", () => {
    const p = new URLSearchParams();
    schreibeStandortParams(p, standard);
    expect(p.toString()).toBe("standort=48.2086%2C16.3731");
  });

  it("schreibt abweichenden Radius und andere Ebenen", () => {
    const p = new URLSearchParams();
    schreibeStandortParams(p, { ...standard, radius: 300, sichtbar: ["oeffi", "schule"] });
    expect(p.get("r")).toBe("300");
    expect(p.get("karte")).toBe("oeffi,schule");
  });

  it("rundet auf 5 Nachkommastellen", () => {
    const p = new URLSearchParams();
    schreibeStandortParams(p, { ...standard, punkt: { lat: 48.208612345, lon: 16.373198765 } });
    expect(p.get("standort")).toBe("48.20861,16.3732");
  });

  it("entfernt alte Parameter bei null und fasst fremde nicht an", () => {
    const p = new URLSearchParams("standort=1,2&r=300&karte=oeffi&bezirk=7");
    schreibeStandortParams(p, null);
    expect(p.toString()).toBe("bezirk=7");
  });

  it("Schreiben und Lesen sind umkehrbar", () => {
    const p = new URLSearchParams();
    const stand = { punkt: { lat: 48.19876, lon: 16.34567 }, radius: 800 as const, sichtbar: ["gruen", "apotheke"] as ("gruen" | "apotheke")[] };
    schreibeStandortParams(p, stand);
    expect(leseStandortParams("?" + p.toString())).toEqual(stand);
  });
});
