import { useEffect, useState } from "react";
import { loadMietverlauf } from "../services/mietverlauf";
import type { Mietverlauf } from "../types/mietverlauf";

/** Zeitreihen der Mietpreise; null, solange sie laden oder nicht verfügbar sind. */
export function useMietverlauf(): Mietverlauf | null {
  const [daten, setDaten] = useState<Mietverlauf | null>(null);
  useEffect(() => {
    let aktiv = true;
    loadMietverlauf().then((d) => {
      if (aktiv) setDaten(d);
    });
    return () => {
      aktiv = false;
    };
  }, []);
  return daten;
}
