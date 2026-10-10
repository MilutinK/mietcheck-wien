import type { Mietverlauf } from "../types/mietverlauf";

let cache: Promise<Mietverlauf | null> | null = null;

/** Lädt mietverlauf.json einmalig (rund 25 KB). */
export function loadMietverlauf(): Promise<Mietverlauf | null> {
  cache ??= fetch("/data/mietverlauf.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Mietverlauf: HTTP ${r.status}`);
      return r.json() as Promise<Mietverlauf>;
    })
    .catch((err) => {
      console.warn("Mietverlauf konnte nicht geladen werden:", err);
      return null;
    });
  return cache;
}
