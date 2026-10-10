import { useEffect, useState } from "react";
import { loadKaufpreise } from "../services/kaufpreise";
import type { Kaufpreise } from "../types/kaufpreise";

/** Kaufpreise je Bezirk; null, solange sie laden oder nicht verfügbar sind. */
export function useKaufpreise(): Kaufpreise | null {
  const [daten, setDaten] = useState<Kaufpreise | null>(null);
  useEffect(() => {
    let aktiv = true;
    loadKaufpreise().then((d) => {
      if (aktiv) setDaten(d);
    });
    return () => {
      aktiv = false;
    };
  }, []);
  return daten;
}
