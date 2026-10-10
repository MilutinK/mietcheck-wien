import { useEffect, useState } from "react";
import { loadGemeindebau } from "../services/gemeindebau";
import type { GemeindebauDaten } from "../types/gemeindebau";

/** Gemeindebau-Standorte; null, solange sie laden oder nicht verfügbar sind. */
export function useGemeindebau(): GemeindebauDaten | null {
  const [daten, setDaten] = useState<GemeindebauDaten | null>(null);

  useEffect(() => {
    let aktiv = true;
    loadGemeindebau().then((d) => {
      if (aktiv) setDaten(d);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  return daten;
}