import { describe, expect, it } from "vitest";
import { annuitaet, mietsteigerungProJahr, preisFuerFlaeche, vergleiche, type KaufParameter } from "./kaufen";

const basis: KaufParameter = {
  kaufpreis: 100_000,
  nebenkostenProzent: 0,
  eigenkapital: 100_000,
  zinsProzent: 0,
  laufzeitJahre: 10,
  miete: 500,
  mietsteigerungProzent: 0,
  wertsteigerungProzent: 0,
  anlageProzent: 0,
  instandhaltungMonat: 0,
  verkaufskostenProzent: 0,
  horizontJahre: 10,
};

describe("annuitaet", () => {
  it("entspricht dem bekannten Beispiel 200.000 € zu 5 % über 30 Jahre", () => {
    expect(annuitaet(200_000, 5, 30)).toBeCloseTo(1073.64, 2);
  });
  it("tilgt bei Zins 0 gleichmäßig", () => {
    expect(annuitaet(120_000, 0, 10)).toBe(1000);
  });
  it("ist 0 ohne Kredit oder ohne Laufzeit", () => {
    expect(annuitaet(0, 3, 20)).toBe(0);
    expect(annuitaet(1000, 3, 0)).toBe(0);
  });
});

describe("vergleiche", () => {
  it("ohne Kredit, Wachstum und Kosten gewinnt der Käufer die gesparte Miete", () => {
    const e = vergleiche(basis);
    expect(e.kredit).toBe(0);
    expect(e.endeMieten).toBeCloseTo(100_000, 6);
    expect(e.endeKaufen).toBeCloseTo(160_000, 6); // Wert 100.000 plus 120 × 500 € gespart
  });

  it("Nebenkosten und Kredit: Eigenkapital deckt zuerst die Nebenkosten", () => {
    const e = vergleiche({ ...basis, nebenkostenProzent: 10, eigenkapital: 30_000 });
    expect(e.nebenkosten).toBe(10_000);
    expect(e.kredit).toBe(80_000); // 100.000 + 10.000 − 30.000
    expect(e.rate).toBeCloseTo(80_000 / 120, 6);
  });

  it("zahlt den Kredit bis zum Ende der Laufzeit vollständig zurück", () => {
    const e = vergleiche({ ...basis, eigenkapital: 20_000, zinsProzent: 4, laufzeitJahre: 20, horizontJahre: 20 });
    const letzt = e.jahre[e.jahre.length - 1];
    // Nach der Laufzeit gibt es keine Restschuld: Vermögen = Wert (ohne Verkaufskosten) plus Angelegtes
    expect(letzt.kaufen).toBeGreaterThan(100_000 - 1);
    expect(e.zinsenGesamt).toBeGreaterThan(0);
  });

  it("mehr Eigenkapital als nötig bleibt beim Käufer angelegt", () => {
    const e = vergleiche({ ...basis, eigenkapital: 150_000, horizontJahre: 1 });
    expect(e.kredit).toBe(0);
    expect(e.jahre[0].kaufen).toBeCloseTo(100_000 + 50_000, 6);
    expect(e.jahre[0].mieten).toBe(150_000);
  });

  it("findet das Break-even-Jahr, wenn Kaufen irgendwann vorn liegt", () => {
    const e = vergleiche({
      ...basis,
      nebenkostenProzent: 10,
      eigenkapital: 30_000,
      zinsProzent: 3,
      wertsteigerungProzent: 2,
      mietsteigerungProzent: 3,
      anlageProzent: 2,
      instandhaltungMonat: 100,
      verkaufskostenProzent: 2,
    });
    expect(e.breakEvenJahr).not.toBeNull();
    expect(e.breakEvenJahr!).toBeGreaterThan(0);
    const j = e.jahre.find((x) => x.jahr === e.breakEvenJahr)!;
    expect(j.kaufen).toBeGreaterThanOrEqual(j.mieten);
    // davor lag Mieten vorn
    const davor = e.jahre.filter((x) => x.jahr > 0 && x.jahr < e.breakEvenJahr!);
    expect(davor.every((x) => x.kaufen < x.mieten)).toBe(true);
  });

  it("Break-even ist null, wenn Mieten im Horizont immer vorn liegt", () => {
    const e = vergleiche({
      ...basis,
      miete: 100,
      nebenkostenProzent: 10,
      eigenkapital: 10_000,
      zinsProzent: 6,
      wertsteigerungProzent: 0,
      instandhaltungMonat: 300,
    });
    expect(e.breakEvenJahr).toBeNull();
    expect(e.endeMieten).toBeGreaterThan(e.endeKaufen);
  });

  it("liefert für jedes Jahr einen Stand, beginnend bei Jahr 0", () => {
    const e = vergleiche({ ...basis, horizontJahre: 7 });
    expect(e.jahre.map((j) => j.jahr)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("Verkaufskosten drücken das Kaufergebnis", () => {
    const ohne = vergleiche(basis).endeKaufen;
    const mit = vergleiche({ ...basis, verkaufskostenProzent: 5 }).endeKaufen;
    expect(mit).toBeCloseTo(ohne - 5_000, 6);
  });
});

describe("preisFuerFlaeche", () => {
  const k = { unter_50m2: 10, von_51_bis_80m2: 20, von_81_bis_129m2: 30, ueber_130m2: null, durchschnitt: 25 };
  it("wählt die Klasse nach Größe", () => {
    expect(preisFuerFlaeche(k, 45)).toBe(10);
    expect(preisFuerFlaeche(k, 50)).toBe(10);
    expect(preisFuerFlaeche(k, 70)).toBe(20);
    expect(preisFuerFlaeche(k, 100)).toBe(30);
  });
  it("fällt auf den Durchschnitt zurück, wenn die Klasse fehlt", () => {
    expect(preisFuerFlaeche(k, 150)).toBe(25);
  });
});

describe("mietsteigerungProJahr", () => {
  it("berechnet die jährliche Steigerung", () => {
    // 10 Jahre von 10 auf 20 € = 7,18 % pro Jahr
    const reihe = Array.from({ length: 133 }, (_, i) => 10 * Math.pow(2, i / 120));
    expect(mietsteigerungProJahr(reihe, 10)!).toBeGreaterThan(6.5);
    expect(mietsteigerungProJahr(reihe, 10)!).toBeLessThan(7.6);
  });
  it("liefert null bei zu kurzer Reihe", () => {
    expect(mietsteigerungProJahr(Array.from({ length: 30 }, () => 10), 10)).toBeNull();
  });
  it("liefert null ohne Werte", () => {
    expect(mietsteigerungProJahr(Array.from({ length: 80 }, () => null), 10)).toBeNull();
  });
});
