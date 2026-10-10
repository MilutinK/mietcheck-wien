import type { Groessenklassen } from "../utils/kaufen";

export interface Kaufpreise {
  meta: {
    /** Monat der Daten, "2026-09" */
    stand: string;
    objekte: number | null;
  };
  /** Angebotspreise in EUR pro m2 je Bezirk, nach Größenklasse */
  bezirke: Record<string, Groessenklassen>;
}
