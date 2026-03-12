export interface Rechtsverhaeltnis {
    eigentum: number;
    hauptmiete: number;
    gemeinde: number;
    genossenschaft: number;
    sonstige: number;
}

export interface Nutzflaechenverteilung {
    unter_35m2: number;
    von_35_bis_60m2: number;
    von_60_bis_90m2: number;
    von_90_bis_130m2: number;
    ueber_130m2: number;
}

export interface Bauperioden {
    vor_1919: number;
    von_1919_bis_1944: number;
    von_1945_bis_1960: number;
    von_1961_bis_1980: number;
    von_1981_bis_2000: number;
    nach_2001: number;
}

export interface OeffiScore {
    haltestellen_anzahl: number;
    haltestellen_pro_km2: number;
    score: number;
}

export interface BaujahrStats {
    median?: number;
    aeltestes?: number;
    juengstes?: number;
    anzahl_mit_baujahr?: number;
}

export interface District {
    id: number;
    name: string;
    name_full: string;
    wohnungen_gesamt: number;
    bevoelkerung: number;
    flaeche_km2: number;
    einwohner_pro_km2: number;
    rechtsverhaeltnis: Rechtsverhaeltnis;
    nutzflaechen: Nutzflaechenverteilung;
    bauperioden: Bauperioden;
    oeffi: OeffiScore;
    gebaeude_anzahl: number;
    baujahr_stats: BaujahrStats;
}

export type MetricKey =
    | "einwohner_pro_km2"
    | "wohnungen_gesamt"
    | "oeffi_score"
    | "anteil_altbau"
    | "anteil_gemeinde"
    | "gebaeude_anzahl";

export const METRIC_LABELS: Record<MetricKey, string> = {
    einwohner_pro_km2: "Einwohner/km²",
    wohnungen_gesamt: "Wohnungen gesamt",
    oeffi_score: "Öffi-Score",
    anteil_altbau: "Altbau-Anteil",
    anteil_gemeinde: "Gemeindewohnungen",
    gebaeude_anzahl: "Gebäude",
};

export function getMetricValue(district: District, metric: MetricKey): number {
    switch (metric) {
        case "einwohner_pro_km2":
            return district.einwohner_pro_km2;
        case "wohnungen_gesamt":
            return district.wohnungen_gesamt;
        case "oeffi_score":
            return district.oeffi.score;
        case "anteil_altbau": {
            const bp = district.bauperioden;
            const total = Object.values(bp).reduce((a, b) => a + b, 0);
            return total > 0
                ? Math.round(((bp.vor_1919 + bp.von_1919_bis_1944) / total) * 100)
                : 0;
        }
        case "anteil_gemeinde": {
            const rv = district.rechtsverhaeltnis;
            const total = Object.values(rv).reduce((a, b) => a + b, 0);
            return total > 0 ? Math.round((rv.gemeinde / total) * 100) : 0;
        }
        case "gebaeude_anzahl":
            return district.gebaeude_anzahl;
    }
}

export function formatMetricValue(value: number, metric: MetricKey): string {
    switch (metric) {
        case "anteil_altbau":
        case "anteil_gemeinde":
            return `${value}%`;
        case "oeffi_score":
            return value.toFixed(1);
        default:
            return value.toLocaleString("de-AT");
    }
}