import { FAKTOR_IDS, STANDARD_AUF_KARTE } from "./faktoren";
import type { LonLat } from "./geo";
import { RADIEN_M, type Radius } from "./standort";
import type { FaktorId } from "../types/standorte";

export interface GeteilterStandort {
  punkt: LonLat;
  radius: Radius;
  sichtbar: FaktorId[];
}

// Grobe Grenzen um Wien: schützt vor Unsinn in der URL (und vor Karten-Sprüngen ins Nirgendwo)
const LAT = [48.0, 48.5] as const;
const LON = [16.0, 16.8] as const;

const PARAMS = ["standort", "r", "karte"] as const;

const rund = (v: number) => Math.round(v * 1e5) / 1e5;

function gleicheMenge(a: FaktorId[], b: FaktorId[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Liest ?standort=48.2,16.37&r=500&karte=oeffi,gruen; null, wenn nichts oder Ungültiges drinsteht. */
export function leseStandortParams(search: string): GeteilterStandort | null {
  const params = new URLSearchParams(search);
  const roh = params.get("standort");
  if (!roh) return null;

  const teile = roh.split(",");
  if (teile.length !== 2) return null;
  const [lat, lon] = teile.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < LAT[0] || lat > LAT[1] || lon < LON[0] || lon > LON[1]) return null;

  const r = Number(params.get("r"));
  const radius = (RADIEN_M as readonly number[]).includes(r) ? (r as Radius) : 500;

  const karte = params.get("karte");
  let sichtbar: FaktorId[] = STANDARD_AUF_KARTE;
  if (karte !== null) {
    sichtbar = karte
      .split(",")
      .filter((id): id is FaktorId => (FAKTOR_IDS as string[]).includes(id));
  }

  return { punkt: { lat, lon }, radius, sichtbar };
}

/**
 * Schreibt den Standort in die Parameter (bzw. entfernt ihn bei null). Standardwerte
 * (500 m, voreingestellte Karten-Ebenen) bleiben weg, damit der Link kurz bleibt.
 */
export function schreibeStandortParams(params: URLSearchParams, stand: GeteilterStandort | null): void {
  for (const name of PARAMS) params.delete(name);
  if (!stand) return;

  params.set("standort", `${rund(stand.punkt.lat)},${rund(stand.punkt.lon)}`);
  if (stand.radius !== 500) params.set("r", String(stand.radius));
  if (!gleicheMenge(stand.sichtbar, STANDARD_AUF_KARTE)) params.set("karte", stand.sichtbar.join(","));
}
