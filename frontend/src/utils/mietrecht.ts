import { RICHTWERT_WIEN, KATEGORIEMIETZINS } from "../types/district";

/**
 * Vereinfachte Zuordnung einer Wohnung zum Anwendungsbereich des MRG
 * und zur Mietzinsart. Reine Funktion, keine UI.
 *
 * ACHTUNG: Regeln vereinfacht, keine Rechtsberatung. Mit "prüfen" markierte
 * Punkte sind in docs/mietzins-regeln.md zur fachlichen Abstimmung aufgelistet.
 */

export type Traeger = "privat" | "gemeinnuetzig" | "gemeinde";
export type Baubewilligung = "bis_juni_1953" | "ab_juli_1953" | "dachgeschoss_ausbau" | "unbekannt";
export type Gebaeudeart = "mehrparteienhaus" | "ein_zweifamilienhaus";
export type Foerderung = "ja" | "nein" | "unbekannt";
export type Ausstattung = "A" | "B" | "C" | "D_brauchbar" | "D_unbrauchbar" | "unbekannt";
export type Vertragsabschluss = "vor_maerz_1994" | "ab_maerz_1994";

export interface MietzinsEingaben {
  traeger: Traeger;
  baubewilligung: Baubewilligung;
  gebaeudeart: Gebaeudeart;
  gefoerdert: Foerderung;
  ausstattung: Ausstattung;
  nutzflaecheM2: number;
  vertragsabschluss: Vertragsabschluss;
  befristet: boolean;
}

export type Anwendungsbereich =
  | "vollanwendung"
  | "teilanwendung"
  | "wgg"
  | "gemeindewohnung"
  | "unklar";

export type Mietzinsart =
  | "richtwert"
  | "kategorie"
  | "angemessen"
  | "frei"
  | "foerderung"
  | "kostendeckung"
  | "gemeinde"
  | "unklar";

export interface MietzinsErgebnis {
  bereich: Anwendungsbereich;
  mietzinsart: Mietzinsart;
  /** Welche Antworten zu diesem Ergebnis geführt haben */
  begruendung: string[];
  /** Wichtige Einschränkungen und Hinweise */
  hinweise: string[];
  /** Angaben, die fehlen, damit das Ergebnis eindeutig wird */
  offeneFragen: string[];
  /** Basiswert in €/m² (nur Richtwert und Kategorie), ohne Zu-/Abschläge */
  basisProM2?: number;
  /** Basiswert nach Befristungsabschlag, nur wenn der Vertrag befristet ist */
  basisProM2NachBefristung?: number;
}

/** Ab dieser Nutzfläche gilt bei Kategorie A/B der angemessene statt des Richtwertmietzinses (prüfen) */
export const GROSSE_WOHNUNG_M2 = 130;
/** Abschlag für befristete Verträge im Richtwert- und Kategoriesystem (prüfen) */
export const BEFRISTUNGSABSCHLAG = 0.25;

const KATEGORIE_WERT: Record<"A" | "B" | "C" | "D_brauchbar" | "D_unbrauchbar", number> = {
  A: KATEGORIEMIETZINS.A,
  B: KATEGORIEMIETZINS.B,
  C: KATEGORIEMIETZINS.C,
  D_brauchbar: KATEGORIEMIETZINS.D_brauchbar,
  D_unbrauchbar: KATEGORIEMIETZINS.D_unbrauchbar,
};

export function ermittleMietzins(e: MietzinsEingaben): MietzinsErgebnis {
  const begruendung: string[] = [];
  const hinweise: string[] = [
    "Vereinfachte Einschätzung, keine Rechtsberatung. Zuschläge und Abschläge (Lage, Ausstattung) sind nicht eingerechnet.",
  ];
  const offeneFragen: string[] = [];

  // 1) Träger: Gemeinde Wien und gemeinnützige Bauvereinigungen haben eigene Regeln
  if (e.traeger === "gemeinde") {
    begruendung.push("Die Wohnung gehört der Stadt Wien (Gemeindewohnung).");
    hinweise.push("Für Gemeindewohnungen gilt eine eigene Mietzinsbildung. Eine Berechnung ist hier nicht vorgesehen.");
    return { bereich: "gemeindewohnung", mietzinsart: "gemeinde", begruendung, hinweise, offeneFragen };
  }

  if (e.traeger === "gemeinnuetzig") {
    begruendung.push("Die Wohnung gehört einer gemeinnützigen Bauvereinigung (Genossenschaft).");
    hinweise.push("Es gilt das Wohnungsgemeinnützigkeitsgesetz (WGG) mit Kostendeckungsprinzip, nicht der Richtwert.");
    return { bereich: "wgg", mietzinsart: "kostendeckung", begruendung, hinweise, offeneFragen };
  }

  // 2) Unklare Eingaben sammeln, bevor Regeln greifen
  if (e.baubewilligung === "unbekannt") {
    offeneFragen.push("Wann wurde das Gebäude baubewilligt? (vor oder nach dem 1. Juli 1953)");
  }

  // 3) Ein-/Zweifamilienhaus: Teilanwendung (prüfen: nicht Vollausnahme)
  if (e.gebaeudeart === "ein_zweifamilienhaus") {
    begruendung.push("Das Gebäude hat höchstens zwei selbständige Wohnungen.");
    hinweise.push("Hier gilt im Regelfall der freie Mietzins. Gesetzliche Obergrenzen gelten nur eingeschränkt.");
    return { bereich: "teilanwendung", mietzinsart: "frei", begruendung, hinweise, offeneFragen };
  }

  // 4) Neubau und Dachgeschossausbau: Teilanwendung, ggf. Förderung
  if (e.baubewilligung === "ab_juli_1953" || e.baubewilligung === "dachgeschoss_ausbau") {
    begruendung.push(
      e.baubewilligung === "dachgeschoss_ausbau"
        ? "Es handelt sich um einen Dachgeschossausbau oder eine Aufstockung."
        : "Das Gebäude wurde nach dem 30. Juni 1953 baubewilligt."
    );
    if (e.gefoerdert === "ja") {
      begruendung.push("Das Gebäude wurde mit öffentlichen Mitteln errichtet oder saniert.");
      hinweise.push("Bei geförderten Wohnungen bestimmen die Förderbedingungen die zulässige Miete.");
      return { bereich: "teilanwendung", mietzinsart: "foerderung", begruendung, hinweise, offeneFragen };
    }
    if (e.gefoerdert === "unbekannt") {
      offeneFragen.push("Wurde das Gebäude mit öffentlichen Mitteln gefördert? Das ändert die zulässige Miete.");
    } else {
      begruendung.push("Es gab keine Förderung mit öffentlichen Mitteln.");
    }
    hinweise.push("Es gilt der freie Mietzins. Er darf nur nicht gröblich unangemessen sein.");
    return {
      bereich: offeneFragen.length > 0 ? "unklar" : "teilanwendung",
      mietzinsart: offeneFragen.length > 0 ? "unklar" : "frei",
      begruendung,
      hinweise,
      offeneFragen,
    };
  }

  // 5) Altbau im Mehrparteienhaus: Vollanwendung
  if (e.baubewilligung === "bis_juni_1953") {
    begruendung.push("Das Gebäude wurde bis zum 30. Juni 1953 baubewilligt und hat mehr als zwei Wohnungen.");
    return vollanwendung(e, begruendung, hinweise, offeneFragen);
  }

  // Baubewilligung unbekannt
  hinweise.push("Ohne Angabe zum Baujahr kann der Anwendungsbereich nicht bestimmt werden.");
  return { bereich: "unklar", mietzinsart: "unklar", begruendung, hinweise, offeneFragen };
}

function vollanwendung(
  e: MietzinsEingaben,
  begruendung: string[],
  hinweise: string[],
  offeneFragen: string[]
): MietzinsErgebnis {
  if (e.ausstattung === "unbekannt") {
    offeneFragen.push("In welcher Ausstattungskategorie (A–D) ist die Wohnung? Das steht im Mietvertrag.");
    return { bereich: "vollanwendung", mietzinsart: "unklar", begruendung, hinweise, offeneFragen };
  }

  begruendung.push(`Die Wohnung hat Ausstattungskategorie ${e.ausstattung.replace("_", " ")}.`);

  const abschlag = e.befristet ? 1 - BEFRISTUNGSABSCHLAG : 1;
  const nachBefristung = (basis: number) => (e.befristet ? round2(basis * abschlag) : undefined);

  // Kategorie C und D: Kategoriemietzins (prüfen)
  const kategorieC_D = e.ausstattung === "C" || e.ausstattung === "D_brauchbar" || e.ausstattung === "D_unbrauchbar";
  // Verträge vor dem 1. März 1994: Kategoriemietzins bzw. alter Hauptmietzins (prüfen)
  const altvertrag = e.vertragsabschluss === "vor_maerz_1994";

  if (kategorieC_D || altvertrag) {
    const basis = KATEGORIE_WERT[e.ausstattung];
    begruendung.push(
      altvertrag
        ? "Der Mietvertrag wurde vor dem 1. März 1994 abgeschlossen."
        : "Bei Kategorie C und D gilt der Kategoriemietzins."
    );
    if (altvertrag) {
      hinweise.push("Bei Altverträgen können zusätzlich Regeln zum alten Hauptmietzins greifen.");
    }
    return {
      bereich: "vollanwendung",
      mietzinsart: "kategorie",
      begruendung,
      hinweise,
      offeneFragen,
      basisProM2: basis,
      basisProM2NachBefristung: nachBefristung(basis),
    };
  }

  // Kategorie A/B ab 1994
  if (e.nutzflaecheM2 > GROSSE_WOHNUNG_M2) {
    begruendung.push(`Die Nutzfläche liegt über ${GROSSE_WOHNUNG_M2} m².`);
    hinweise.push("Bei großen Wohnungen der Kategorie A/B gilt der angemessene Mietzins statt des Richtwerts.");
    return { bereich: "vollanwendung", mietzinsart: "angemessen", begruendung, hinweise, offeneFragen };
  }

  begruendung.push("Der Mietvertrag wurde ab dem 1. März 1994 abgeschlossen.");
  hinweise.push("Zu- und Abschläge (z. B. für die Lage) können den Richtwert erhöhen oder senken.");
  return {
    bereich: "vollanwendung",
    mietzinsart: "richtwert",
    begruendung,
    hinweise,
    offeneFragen,
    basisProM2: RICHTWERT_WIEN,
    basisProM2NachBefristung: nachBefristung(RICHTWERT_WIEN),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
