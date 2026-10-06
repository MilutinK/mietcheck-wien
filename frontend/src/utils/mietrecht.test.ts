import { describe, expect, it } from "vitest";
import { RICHTWERT_WIEN, KATEGORIEMIETZINS } from "../types/district";
import { ermittleMietzins, type MietzinsEingaben } from "./mietrecht";

/** Typischer Wiener Altbau-Neuvertrag als Ausgangspunkt, einzelne Felder werden überschrieben */
const altbau: MietzinsEingaben = {
  traeger: "privat",
  baubewilligung: "bis_juni_1953",
  gebaeudeart: "mehrparteienhaus",
  gefoerdert: "nein",
  ausstattung: "A",
  nutzflaecheM2: 70,
  vertragsabschluss: "ab_maerz_1994",
  befristet: false,
};

const mit = (o: Partial<MietzinsEingaben>): MietzinsEingaben => ({ ...altbau, ...o });

describe("ermittleMietzins", () => {
  it("Altbau Kat. A, Neuvertrag: Vollanwendung mit Richtwert", () => {
    const r = ermittleMietzins(altbau);
    expect(r.bereich).toBe("vollanwendung");
    expect(r.mietzinsart).toBe("richtwert");
    expect(r.basisProM2).toBe(RICHTWERT_WIEN);
    expect(r.basisProM2NachBefristung).toBeUndefined();
  });

  it("befristeter Vertrag: 25 % Abschlag auf den Richtwert", () => {
    const r = ermittleMietzins(mit({ befristet: true }));
    expect(r.basisProM2NachBefristung).toBe(Math.round(RICHTWERT_WIEN * 0.75 * 100) / 100);
  });

  it("Altbau über 130 m² Kat. A/B: angemessener Mietzins", () => {
    const r = ermittleMietzins(mit({ nutzflaecheM2: 131, ausstattung: "B" }));
    expect(r.mietzinsart).toBe("angemessen");
    expect(r.basisProM2).toBeUndefined();
  });

  it("genau 130 m² zählt noch nicht als große Wohnung", () => {
    expect(ermittleMietzins(mit({ nutzflaecheM2: 130 })).mietzinsart).toBe("richtwert");
  });

  it("Kategorie C: Kategoriemietzins", () => {
    const r = ermittleMietzins(mit({ ausstattung: "C" }));
    expect(r.mietzinsart).toBe("kategorie");
    expect(r.basisProM2).toBe(KATEGORIEMIETZINS.C);
  });

  it("Kategorie D unbrauchbar hat den niedrigsten Wert", () => {
    expect(ermittleMietzins(mit({ ausstattung: "D_unbrauchbar" })).basisProM2).toBe(KATEGORIEMIETZINS.D_unbrauchbar);
  });

  it("Altvertrag vor März 1994: Kategoriemietzins auch bei Kat. A", () => {
    const r = ermittleMietzins(mit({ vertragsabschluss: "vor_maerz_1994" }));
    expect(r.mietzinsart).toBe("kategorie");
    expect(r.basisProM2).toBe(KATEGORIEMIETZINS.A);
  });

  it("Altbau ohne Kategorie: offene Frage statt Raten", () => {
    const r = ermittleMietzins(mit({ ausstattung: "unbekannt" }));
    expect(r.mietzinsart).toBe("unklar");
    expect(r.offeneFragen.length).toBe(1);
  });

  it("ungeförderter Neubau: Teilanwendung, freier Mietzins", () => {
    const r = ermittleMietzins(mit({ baubewilligung: "ab_juli_1953" }));
    expect(r.bereich).toBe("teilanwendung");
    expect(r.mietzinsart).toBe("frei");
  });

  it("geförderter Neubau: Miete nach Förderbedingungen", () => {
    const r = ermittleMietzins(mit({ baubewilligung: "ab_juli_1953", gefoerdert: "ja" }));
    expect(r.mietzinsart).toBe("foerderung");
  });

  it("Neubau mit unbekannter Förderung: unklar und offene Frage", () => {
    const r = ermittleMietzins(mit({ baubewilligung: "ab_juli_1953", gefoerdert: "unbekannt" }));
    expect(r.bereich).toBe("unklar");
    expect(r.offeneFragen.length).toBe(1);
  });

  it("Dachgeschossausbau: Teilanwendung, freier Mietzins", () => {
    const r = ermittleMietzins(mit({ baubewilligung: "dachgeschoss_ausbau" }));
    expect(r.bereich).toBe("teilanwendung");
    expect(r.mietzinsart).toBe("frei");
  });

  it("Ein-/Zweifamilienhaus: Teilanwendung, freier Mietzins", () => {
    const r = ermittleMietzins(mit({ gebaeudeart: "ein_zweifamilienhaus" }));
    expect(r.bereich).toBe("teilanwendung");
    expect(r.mietzinsart).toBe("frei");
  });

  it("Genossenschaft: WGG mit Kostendeckung, unabhängig vom Baujahr", () => {
    const r = ermittleMietzins(mit({ traeger: "gemeinnuetzig", baubewilligung: "ab_juli_1953" }));
    expect(r.bereich).toBe("wgg");
    expect(r.mietzinsart).toBe("kostendeckung");
  });

  it("Gemeindewohnung: eigene Mietzinsbildung", () => {
    const r = ermittleMietzins(mit({ traeger: "gemeinde" }));
    expect(r.bereich).toBe("gemeindewohnung");
    expect(r.mietzinsart).toBe("gemeinde");
  });

  it("unbekanntes Baujahr: unklar mit offener Frage", () => {
    const r = ermittleMietzins(mit({ baubewilligung: "unbekannt" }));
    expect(r.bereich).toBe("unklar");
    expect(r.offeneFragen.length).toBeGreaterThan(0);
  });

  it("jedes Ergebnis enthält den Rechtshinweis", () => {
    expect(ermittleMietzins(altbau).hinweise[0]).toMatch(/keine Rechtsberatung/);
  });
});
