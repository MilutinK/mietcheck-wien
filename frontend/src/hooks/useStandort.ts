import { useMemo } from "react";
import { useBezirksflaechen, useHaltestellen, useStandorte } from "./useDaten";
import { useGemeindebau } from "./useGemeindebau";
import { findeBezirk, rasterInWien, type LonLat } from "../utils/geo";
import { FAKTOREN } from "../utils/faktoren";
import { PunktIndex, prozentrang, werteImRadius } from "../utils/standort";
import type { FaktorId, StandortPunkt } from "../types/standorte";

/** Abstand der Vergleichspunkte, mit denen eine Lage eingeordnet wird */
const RASTER_SCHRITT_M = 500;

export interface FaktorErgebnis {
  id: FaktorId;
  treffer: StandortPunkt[];
  anzahl: number;
  /** Summe der Gewichte (Fläche in m², Wohnungen) */
  summe: number;
  naechster: StandortPunkt | null;
  naechsteM: number | null;
  /** Prozentrang gegenüber dem Raster über ganz Wien; null, wenn nicht aussagekräftig */
  rang: number | null;
}

export interface StandortErgebnis {
  punkt: LonLat;
  radiusM: number;
  bezirkId: number | null;
  /** In der Reihenfolge von FAKTOREN */
  faktoren: FaktorErgebnis[];
}

const gewichtVon = (p: StandortPunkt) => p.gewicht;

/**
 * Analysiert einen Punkt auf der Karte: Orte im Umkreis je Faktor und Einordnung gegenüber
 * allen Wiener Lagen. Lädt und rechnet erst, wenn ein Punkt gewählt ist.
 */
export function useStandort(punkt: LonLat | null, radiusM: number): StandortErgebnis | null {
  const aktiv = punkt !== null;
  const haltestellen = useHaltestellen(aktiv);
  const standorte = useStandorte(aktiv);
  const flaechen = useBezirksflaechen(aktiv);
  const gemeindebau = useGemeindebau();

  // Alle Faktoren in einheitlicher Form
  const daten = useMemo<Record<FaktorId, StandortPunkt[]> | null>(() => {
    if (!haltestellen || !standorte || !gemeindebau) return null;
    return {
      oeffi: haltestellen.map((h) => ({ lon: h.lon, lat: h.lat, name: h.name, detail: "", gewicht: 1 })),
      gemeindebau: gemeindebau.anlagen.map((a) => ({
        lon: a.lon,
        lat: a.lat,
        name: a.adresse || a.name,
        detail: a.baujahr ? `Baujahr ${a.baujahr}` : "",
        gewicht: a.wohnungen ?? 0,
      })),
      gruen: standorte.gruen,
      spielplatz: standorte.spielplatz,
      schule: standorte.schule,
      kindergarten: standorte.kindergarten,
      hausarzt: standorte.hausarzt,
      apotheke: standorte.apotheke,
      markt: standorte.markt,
    };
  }, [haltestellen, standorte, gemeindebau]);

  const indizes = useMemo(() => {
    if (!daten) return null;
    return Object.fromEntries(FAKTOREN.map((f) => [f.id, new PunktIndex(daten[f.id])])) as Record<FaktorId, PunktIndex<StandortPunkt>>;
  }, [daten]);

  const raster = useMemo(() => (aktiv && flaechen ? rasterInWien(flaechen, RASTER_SCHRITT_M) : []), [aktiv, flaechen]);

  // Vergleichswerte für alle Rasterpunkte, einmal je Radius
  const vergleich = useMemo(() => {
    if (!aktiv || !indizes || raster.length === 0) return null;
    return Object.fromEntries(
      FAKTOREN.map((f) => [
        f.id,
        werteImRadius(raster, indizes[f.id], radiusM, f.messwert === "gewicht" ? gewichtVon : undefined),
      ])
    ) as Record<FaktorId, number[]>;
  }, [aktiv, indizes, raster, radiusM]);

  return useMemo(() => {
    if (!punkt || !indizes) return null;

    const faktoren = FAKTOREN.map((f): FaktorErgebnis => {
      const { treffer, naechster, naechsteM } = indizes[f.id].suche(punkt, radiusM);
      const summe = treffer.reduce((s, p) => s + p.gewicht, 0);
      const wert = f.messwert === "gewicht" ? summe : treffer.length;
      return {
        id: f.id,
        treffer,
        anzahl: treffer.length,
        summe,
        naechster,
        naechsteM,
        rang: f.zeigeRang && vergleich ? prozentrang(vergleich[f.id], wert) : null,
      };
    });

    return {
      punkt,
      radiusM,
      bezirkId: flaechen ? findeBezirk(flaechen, punkt.lon, punkt.lat) : null,
      faktoren,
    };
  }, [punkt, radiusM, indizes, vergleich, flaechen]);
}