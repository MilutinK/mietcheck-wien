import type { District } from "../types/district";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface DistrictsResponse {
  districts: District[];
  meta: Record<string, unknown>;
}

interface CompareResponse {
  district_a: District;
  district_b: District;
}

/**
 * Versucht die API aufzurufen. Bei Fehler → Fallback auf statische JSON.
 */
async function fetchWithFallback<T>(
  apiPath: string,
  staticPath: string
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${apiPath}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch {
    console.info(`API nicht erreichbar → lade ${staticPath}`);
    const res = await fetch(staticPath);
    if (!res.ok) throw new Error(`Static fallback failed: ${res.status}`);
    return await res.json();
  }
}

/**
 * Lädt alle Bezirke (API mit Mietpreise-Merge oder statischer Fallback).
 */
export async function loadDistricts(): Promise<District[]> {
  try {
    // API liefert bereits gemergte Daten
    const data = await fetchWithFallback<DistrictsResponse>(
      "/api/districts",
      "/data/districts.json"
    );

    const districts = data.districts;

    // Falls statischer Fallback: Mietpreise manuell mergen
    const isFromApi = districts.length > 0 && districts[0].bruttomiete_m2 !== undefined;

    if (!isFromApi) {
      try {
        const mietRes = await fetch("/data/mietpreise.json");
        const mietData = await mietRes.json();
        const mietById: Record<number, any> = {};
        for (const m of mietData.bezirke) {
          mietById[m.id] = m;
        }
        for (const d of districts) {
          const m = mietById[d.id];
          if (m) {
            d.bruttomiete_m2 = m.bruttomiete_m2;
            d.miete_veraenderung_prozent = m.veraenderung_prozent;
            d.miete_confirmed = m.confirmed;
          }
        }
      } catch {
        console.warn("Mietpreise konnten nicht geladen werden");
      }
    }

    return districts;
  } catch (err) {
    console.error("Daten konnten nicht geladen werden:", err);
    return [];
  }
}

/**
 * Vergleicht zwei Bezirke (API oder clientseitig).
 */
export async function compareDistricts(
  idA: number,
  idB: number
): Promise<CompareResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/compare?a=${idA}&b=${idB}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback: nicht nötig, Frontend macht den Vergleich selbst
  }
  return null;
}
