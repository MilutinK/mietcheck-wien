export interface Mietverlauf {
  /** Monate als "YYYY-MM", aufsteigend */
  monate: string[];
  /** Durchschnittspreis (EUR/m2 brutto) je Bezirk, gleich lang wie monate; null = keine Angabe */
  bezirke: Record<string, (number | null)[]>;
  /** Zahl der berücksichtigten Objekte je Monat (nicht über Jahre vergleichbar) */
  objekte: (number | null)[];
}
