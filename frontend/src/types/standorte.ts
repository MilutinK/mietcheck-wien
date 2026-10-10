import type { LonLat } from "../utils/geo";

/** Ein Ort, der für den Standort-Check gezählt wird (Haltestelle, Park, Schule, ...) */
export interface StandortPunkt extends LonLat {
  name: string;
  /** Zusatzinfo, z. B. Schulart oder Adresse; kann leer sein */
  detail: string;
  /** Gewicht für Summen (Fläche in m², Wohnungen); sonst 1 */
  gewicht: number;
}

export type FaktorId =
  | "oeffi"
  | "gemeindebau"
  | "gruen"
  | "spielplatz"
  | "schule"
  | "kindergarten"
  | "hausarzt"
  | "apotheke"
  | "markt";