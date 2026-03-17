import type { District, Mietpreise } from "../types/district";

const API_BASE = import.meta.env.VITE_API_URL || "";

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
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}${apiPath}`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`API ${res.status}`);
      return await res.json();
    } catch {
      console.info(`API nicht erreichbar → lade ${staticPath}`);
    }
  }

  const res = await fetch(staticPath);
  if (!res.ok) throw new Error(`Static fallback failed: ${res.status}`);
  return await res.json();
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
    const isFromApi = districts.length > 0 && districts[0].mietpreise !== undefined;

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
            const mietpreise: Mietpreise = {
              gesamt: m.gesamt ?? { durchschnitt: null },
              altbau: m.altbau ?? { durchschnitt: null },
              neubau: m.neubau ?? { durchschnitt: null },
            };
            d.mietpreise = mietpreise;
            d.bruttomiete_m2 = m.gesamt?.durchschnitt ?? null;
          }
        }
      } catch {
        console.warn("Mietpreise konnten nicht geladen werden");
      }
      // Wohnsitztyp mergen
      try {
        const wstRes = await fetch("/data/wohnsitztyp.json");
        const wstData = await wstRes.json();
        const wstById: Record<number, any> = {};
        for (const w of wstData.bezirke) {
          wstById[w.id] = w;
        }
        for (const d of districts) {
          const w = wstById[d.id];
          if (w) {
            d.wohnsitztyp = {
              gemeindebau: w.gemeindebau,
              miete_frei: w.miete_frei,
              eigentum: w.eigentum,
              genossenschaft: w.genossenschaft,
              andere: w.andere,
            };
          }
        }
      } catch {
        console.warn("Wohnsitztyp konnten nicht geladen werden");
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