import { useEffect, useState } from "react";
import { loadBezirksflaechen } from "../services/bezirksflaechen";
import { loadHaltestellen } from "../services/haltestellen";
import { loadStandorte } from "../services/standorte";
import type { BezirkFlaeche } from "../utils/geo";
import type { Haltestelle } from "../types/haltestellen";
import type { StandortPunkt } from "../types/standorte";

/**
 * Wartet auf eine geteilte, zwischengespeicherte Ladefunktion. Geladen wird erst, wenn `aktiv` wahr ist
 * (große Dateien nur bei Bedarf); null, solange sie lädt oder fehlschlägt.
 */
function useGeladen<T>(laden: () => Promise<T | null>, aktiv: boolean): T | null {
  const [daten, setDaten] = useState<T | null>(null);
  useEffect(() => {
    if (!aktiv) return;
    let noch = true;
    laden().then((d) => {
      if (noch) setDaten(d);
    });
    return () => {
      noch = false;
    };
  }, [laden, aktiv]);
  return daten;
}

export const useHaltestellen = (aktiv = true): Haltestelle[] | null => useGeladen(loadHaltestellen, aktiv);
export const useBezirksflaechen = (aktiv = true): BezirkFlaeche[] | null => useGeladen(loadBezirksflaechen, aktiv);
export const useStandorte = (aktiv = true) => useGeladen<Record<string, StandortPunkt[]>>(loadStandorte, aktiv);