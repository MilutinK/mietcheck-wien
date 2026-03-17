// ── Interfaces ──────────────────────────────────────────────

export interface MietpreiseGesamt {
  durchschnitt: number | null;
  unter_50m2: number | null;
  von_51_bis_80m2: number | null;
  von_81_bis_129m2: number | null;
  ueber_130m2: number | null;
}

export interface MietpreiseAltbauNeubau {
  durchschnitt: number | null;
  unter_80m2: number | null;
  von_81_bis_129m2: number | null;
  ueber_130m2: number | null;
}

export interface Mietpreise {
  gesamt: MietpreiseGesamt;
  altbau: MietpreiseAltbauNeubau;
  neubau: MietpreiseAltbauNeubau;
}

export interface Rechtsverhaeltnis {
  hauseigentum: number;
  wohnungseigentum: number;
  hauptmiete: number;
  sonstige: number;
}

export interface Bauperioden {
  vor_1919: number;
  von_1919_bis_1944: number;
  von_1945_bis_1960: number;
  von_1961_bis_1970: number;
  von_1971_bis_1980: number;
  von_1981_bis_1990: number;
  von_1991_bis_2000: number;
  von_2001_bis_2010: number;
  von_2011_bis_2020: number;
  nach_2020: number;
}

export interface Oeffi {
  haltestellen_anzahl: number;
  haltestellen_pro_km2: number;
  score: number;
}

export interface Wohnsitztyp {
  gemeindebau: number;      // % der Bevölkerung
  miete_frei: number;       // % freifinanzierte Miete
  eigentum: number;         // % Eigentum
  genossenschaft: number;   // % Genossenschaft/Gemeinnützig
  andere: number;           // % Sonstige
}

export interface District {
  id: number;
  name: string;
  bevoelkerung: number;
  flaeche_km2: number;
  einwohner_pro_km2: number;
  wohnungen_gesamt: number;
  gebaeude_anzahl: number;
  rechtsverhaeltnis: Rechtsverhaeltnis;
  bauperioden: Bauperioden;
  oeffi: Oeffi;

  // Mietpreise (immopreise.at / derStandard.at)
  mietpreise?: Mietpreise;
  // Shortcut für Karten-Choropleth (= mietpreise.gesamt.durchschnitt)
  bruttomiete_m2?: number;
  // Wohnsitztyp (MA 23, Bezirke in Zahlen 2024)
  wohnsitztyp?: Wohnsitztyp;
}

// ── Metriken für Karte & Filter ─────────────────────────────

export type MetricKey =
  | "bruttomiete_m2"
  | "miete_altbau"
  | "miete_neubau"
  | "einwohner_pro_km2"
  | "wohnungen_gesamt"
  | "oeffi_score"
  | "anteil_altbau"
  | "anteil_miete"
  | "gebaeude_anzahl";

export const METRIC_LABELS: Record<MetricKey, string> = {
  bruttomiete_m2: "Miete Gesamt €/m²",
  miete_altbau: "Miete Altbau €/m²",
  miete_neubau: "Miete Neubau €/m²",
  einwohner_pro_km2: "Einwohner/km²",
  wohnungen_gesamt: "Wohnungen gesamt",
  oeffi_score: "Öffi-Score",
  anteil_altbau: "Altbau-Anteil (vor 1961)",
  anteil_miete: "Mietanteil",
  gebaeude_anzahl: "Gebäude",
};

// ── Gesetzliche Mietzins-Werte (Stand 2025) ─────────────────

export const RICHTWERT_WIEN = 6.67;  // €/m², eingefroren bis April 2026

export const KATEGORIEMIETZINS = {
  A: 4.47,
  B: 3.35,
  C: 2.23,
  D_brauchbar: 2.23,
  D_unbrauchbar: 1.12,
};

// ── Hilfsfunktionen ─────────────────────────────────────────

export function getMetricValue(district: District, metric: MetricKey): number {
  switch (metric) {
    case "bruttomiete_m2":
      return district.mietpreise?.gesamt?.durchschnitt ?? district.bruttomiete_m2 ?? 0;
    case "miete_altbau":
      return district.mietpreise?.altbau?.durchschnitt ?? 0;
    case "miete_neubau":
      return district.mietpreise?.neubau?.durchschnitt ?? 0;
    case "einwohner_pro_km2":
      return district.einwohner_pro_km2;
    case "wohnungen_gesamt":
      return district.wohnungen_gesamt;
    case "oeffi_score":
      return district.oeffi?.score ?? 0;
    case "anteil_altbau": {
      const bp = district.bauperioden;
      const total = Object.values(bp).reduce((a, b) => a + b, 0);
      return total > 0
        ? Math.round(
            ((bp.vor_1919 + bp.von_1919_bis_1944 + bp.von_1945_bis_1960) / total) * 100
          )
        : 0;
    }
    case "anteil_miete": {
      const rv = district.rechtsverhaeltnis;
      const total = Object.values(rv).reduce((a, b) => a + b, 0);
      return total > 0 ? Math.round((rv.hauptmiete / total) * 100) : 0;
    }
    case "gebaeude_anzahl":
      return district.gebaeude_anzahl;
    default:
      return 0;
  }
}

export function formatMetricValue(value: number, metric: MetricKey): string {  switch (metric) {
    case "bruttomiete_m2":
    case "miete_altbau":
    case "miete_neubau":
      return value > 0 ? `${value.toFixed(1)} €` : "k.A.";
    case "einwohner_pro_km2":
      return value.toLocaleString("de-AT");
    case "wohnungen_gesamt":
    case "gebaeude_anzahl":
      return value.toLocaleString("de-AT");
    case "oeffi_score":
      return value.toFixed(1);
    case "anteil_altbau":
    case "anteil_miete":
      return `${value}%`;
    default:
      return String(value);
  }
}