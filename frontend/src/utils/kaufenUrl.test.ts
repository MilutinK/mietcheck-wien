import { describe, expect, it } from "vitest";
import { KAUF_STANDARD, leseKaufParams, schreibeKaufParams, type KaufEingaben } from "./kaufenUrl";

describe("leseKaufParams", () => {
  it("liefert null ohne rechner=kaufen", () => {
    expect(leseKaufParams("")).toBeNull();
    expect(leseKaufParams("?kp=300000")).toBeNull();
    expect(leseKaufParams("?rechner=leistbarkeit")).toBeNull();
  });

  it("nimmt Standardwerte, wenn nur der Modus gesetzt ist", () => {
    expect(leseKaufParams("?rechner=kaufen")).toEqual(KAUF_STANDARD);
  });

  it("liest gültige Werte", () => {
    const e = leseKaufParams("?rechner=kaufen&kb=7&kf=85&kp=420000&km=1500&ke=90000&kz=4.2&kl=25&kh=15&kw=1.5&ks=3.5")!;
    expect(e.bezirkId).toBe(7);
    expect(e.flaeche).toBe(85);
    expect(e.kaufpreis).toBe(420000);
    expect(e.miete).toBe(1500);
    expect(e.eigenkapital).toBe(90000);
    expect(e.zins).toBe(4.2);
    expect(e.laufzeit).toBe(25);
    expect(e.horizont).toBe(15);
    expect(e.wertsteigerung).toBe(1.5);
    expect(e.mietsteigerung).toBe(3.5);
    expect(e.nebenkosten).toBe(KAUF_STANDARD.nebenkosten); // nicht gesetzt
  });

  it("ignoriert Werte außerhalb des erlaubten Bereichs und Unsinn", () => {
    const e = leseKaufParams("?rechner=kaufen&kb=99&kf=5&kp=-1&kz=abc&kl=100&kh=7.5&kw=50")!;
    expect(e).toEqual(KAUF_STANDARD);
  });

  it("negative Wertsteigerung ist erlaubt", () => {
    expect(leseKaufParams("?rechner=kaufen&kw=-2")!.wertsteigerung).toBe(-2);
  });

  it("leere Parameter zählen nicht als 0", () => {
    expect(leseKaufParams("?rechner=kaufen&kp=&ke=")!.eigenkapital).toBe(KAUF_STANDARD.eigenkapital);
  });
});

describe("schreibeKaufParams", () => {
  it("schreibt bei Standardwerten nur den Modus", () => {
    const p = new URLSearchParams();
    schreibeKaufParams(p, KAUF_STANDARD);
    expect(p.toString()).toBe("rechner=kaufen");
  });

  it("schreibt nur Abweichungen", () => {
    const p = new URLSearchParams();
    schreibeKaufParams(p, { ...KAUF_STANDARD, bezirkId: 7, kaufpreis: 420000, zins: 4 });
    expect(p.get("kb")).toBe("7");
    expect(p.get("kp")).toBe("420000");
    expect(p.get("kz")).toBe("4");
    expect(p.has("kf")).toBe(false);
    expect(p.has("kl")).toBe(false);
  });

  it("entfernt alles bei null und lässt fremde Parameter in Ruhe", () => {
    const p = new URLSearchParams("rechner=kaufen&kb=7&kp=1&monat=2020-05");
    schreibeKaufParams(p, null);
    expect(p.toString()).toBe("monat=2020-05");
  });

  it("Schreiben und Lesen sind umkehrbar", () => {
    const e: KaufEingaben = {
      ...KAUF_STANDARD,
      bezirkId: 19,
      flaeche: 95,
      kaufpreis: 610000,
      miete: 1900,
      eigenkapital: 150000,
      zins: 3.9,
      laufzeit: 25,
      horizont: 30,
      nebenkosten: 11.5,
      wertsteigerung: -1,
      anlage: 4,
      instandhaltung: 1.4,
      verkaufskosten: 3,
      mietsteigerung: 2.5,
    };
    const p = new URLSearchParams();
    schreibeKaufParams(p, e);
    expect(leseKaufParams("?" + p.toString())).toEqual(e);
  });
});
