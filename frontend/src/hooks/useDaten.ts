import { useEffect, useState } from "react";
import { loadBezirksflaechen } from "../services/bezirksflaechen";
import { loadHaltestellen } from "../services/haltestellen";
import type { BezirkFlaeche } from "../utils/geo";
import type { Haltestelle } from "../types/haltestellen";

/** Wartet auf eine geteilte, zwischengespeicherte Ladefunktion; null, solange sie lädt oder fehlschlägt. */
function useGeladen<T>(laden: () => Promise<T | null>): T | null {
  const [daten, setDaten] = useState<T | null>(null);
  useEffect(() => {
    let aktiv = true;
    laden().then((d) => {
      if (aktiv) setDaten(d);
    });
    return () => {
      aktiv = false;
    };
  }, [laden]);
  return daten;
}

export const useHaltestellen = (): Haltestelle[] | null => useGeladen(loadHaltestellen);
export const useBezirksflaechen = (): BezirkFlaeche[] | null => useGeladen(loadBezirksflaechen);