import { useMemo } from "react";
import { useBezirksflaechen, useHaltestellen } from "./useDaten";
import { useGemeindebau } from "./useGemeindebau";
import { findeBezirk, rasterInWien, type LonLat } from "../utils/geo";
import { prozentrang, suche, werteImRadius, type InRadius } from "../utils/standort";
import type { GemeindebauAnlage } from "../types/gemeindebau";
import type { Haltestelle } from "../types/haltestellen";

/** Abstand der Vergleichspunkte, mit denen eine Lage eingeordnet wird */
const RASTER_SCHRITT_M = 500;

export interface StandortErgebnis {
  punkt: LonLat;
  radiusM: number;
  bezirkId: number | null;
  oeffi: InRadius<Haltestelle>;
  gemeindebau: InRadius<GemeindebauAnlage> & { wohnungen: number };
  /** Prozentrang gegenüber dem Raster über ganz Wien (null, solange nicht berechenbar) */
  rang: { oeffi: number; gemeindebau: number } | null;
}

const wohnungenVon = (a: GemeindebauAnlage) => a.wohnungen ?? 0;

/**
 * Analysiert einen Punkt auf der Karte: Haltestellen und Gemeindebauten im Radius
 * und die Einordnung gegenüber allen Wiener Lagen. Rechnet nur, wenn ein Punkt gewählt ist.
 */
export function useStandort(punkt: LonLat | null, radiusM: number): StandortErgebnis | null {
  const haltestellen = useHaltestellen();
  const gemeindebau = useGemeindebau();
  const flaechen = useBezirksflaechen();
  const aktiv = punkt !== null;

  const raster = useMemo(() => (aktiv && flaechen ? rasterInWien(flaechen, RASTER_SCHRITT_M) : []), [aktiv, flaechen]);

  const vergleichOeffi = useMemo(
    () => (aktiv && haltestellen ? werteImRadius(raster, haltestellen, radiusM) : []),
    [aktiv, raster, haltestellen, radiusM]
  );
  const vergleichGemeindebau = useMemo(
    () => (aktiv && gemeindebau ? werteImRadius(raster, gemeindebau.anlagen, radiusM, wohnungenVon) : []),
    [aktiv, raster, gemeindebau, radiusM]
  );

  return useMemo(() => {
    if (!punkt || !haltestellen || !gemeindebau) return null;

    const oeffi = suche(haltestellen, punkt, radiusM);
    const gb = suche(gemeindebau.anlagen, punkt, radiusM);
    const wohnungen = gb.treffer.reduce((summe, a) => summe + wohnungenVon(a), 0);
    const hatVergleich = vergleichOeffi.length > 0 && vergleichGemeindebau.length > 0;

    return {
      punkt,
      radiusM,
      bezirkId: flaechen ? findeBezirk(flaechen, punkt.lon, punkt.lat) : null,
      oeffi,
      gemeindebau: { ...gb, wohnungen },
      rang: hatVergleich
        ? {
            oeffi: prozentrang(vergleichOeffi, oeffi.treffer.length),
            gemeindebau: prozentrang(vergleichGemeindebau, wohnungen),
          }
        : null,
    };
  }, [punkt, radiusM, haltestellen, gemeindebau, flaechen, vergleichOeffi, vergleichGemeindebau]);
}