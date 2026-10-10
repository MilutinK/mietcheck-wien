export interface Mietverlauf {
  /** Monate als "YYYY-MM", aufsteigend */
  monate: string[];
  /** Durchschnittspreis (EUR/m2 brutto) je Bezirk, gleich lang wie monate; null = keine Angabe */
  bezirke: Record<string, (number | null)[]>;
  /** Wie bezirke, nur für Altbau bzw. Neubau (null bei zu wenigen Inseraten, in kleinen Bezirken oft) */
  altbau?: Record<string, (number | null)[]>;
  neubau?: Record<string, (number | null)[]>;
  /** Zahl der berücksichtigten Objekte je Monat (nicht über Jahre vergleichbar) */
  objekte: (number | null)[];
}
