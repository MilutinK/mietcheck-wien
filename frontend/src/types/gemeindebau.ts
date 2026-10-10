/** Eine Gemeindebau-Anlage (Mittelpunkt der Gebäudefläche) */
export interface GemeindebauAnlage {
  lon: number;
  lat: number;
  wohnungen: number | null;
  baujahr: number | null;
  bezirk: number | null;
  name: string;
  adresse: string;
}

export interface GemeindebauSumme {
  anlagen: number;
  wohnungen: number;
}

export interface GemeindebauDaten {
  anlagen: GemeindebauAnlage[];
  /** Summen pro Bezirk, Schlüssel = Bezirksnummer */
  bezirke: Record<string, GemeindebauSumme>;
  wohnungenGesamt: number;
}