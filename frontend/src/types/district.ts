/**
 * Daten-Schema für mietcheck-wien
 *
 * Diese Interfaces definieren die Struktur der aufbereiteten
 * Bezirksdaten, die vom Backend an das Frontend geliefert werden.
 */

/** Verteilung von Wohnungen nach Rechtsverhältnis */
export interface Rechtsverhaeltnis {
  eigentum: number;
  hauptmiete: number;
  gemeinde: number;
  genossenschaft: number;
  sonstige: number;
}

/** Verteilung von Wohnungen nach Nutzfläche */
export interface Nutzflaechenverteilung {
  unter_35m2: number;
  von_35_bis_60m2: number;
  von_60_bis_90m2: number;
  von_90_bis_130m2: number;
  ueber_130m2: number;
}

/** Verteilung von Gebäuden nach Bauperiode */
export interface Bauperioden {
  vor_1919: number;
  von_1919_bis_1944: number;
  von_1945_bis_1960: number;
  von_1961_bis_1980: number;
  von_1981_bis_2000: number;
  nach_2001: number;
}

/** Öffi-Anbindung eines Bezirks */
export interface OeffiScore {
  haltestellen_anzahl: number;
  haltestellen_pro_km2: number;
  score: number; // 1-10 normalisiert
}

/** Hauptdatenstruktur: Ein Wiener Bezirk */
export interface District {
  id: number; // 1-23
  name: string; // z.B. "Innere Stadt"
  name_full: string; // z.B. "1. Innere Stadt"

  // Basisdaten
  wohnungen_gesamt: number;
  bevoelkerung: number;
  flaeche_km2: number;
  einwohner_pro_km2: number;

  // Wohnungsstruktur
  rechtsverhaeltnis: Rechtsverhaeltnis;
  nutzflaechen: Nutzflaechenverteilung;
  bauperioden: Bauperioden;

  // Öffi-Anbindung
  oeffi: OeffiScore;

  // Gebäudeinformation
  gebaeude_anzahl: number;
}

/** API-Response für /api/districts */
export interface DistrictsResponse {
  districts: District[];
  meta: {
    source: string;
    stand: string;
    lizenz: string;
  };
}

/** API-Response für /api/compare?a=X&b=Y */
export interface CompareResponse {
  district_a: District;
  district_b: District;
}
