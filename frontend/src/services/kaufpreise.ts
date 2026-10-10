import type { Kaufpreise } from "../types/kaufpreise";

let cache: Promise<Kaufpreise | null> | null = null;

/** Lädt kaufpreise.json einmalig (rund 3 KB). */
export function loadKaufpreise(): Promise<Kaufpreise | null> {
  cache ??= fetch("/data/kaufpreise.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Kaufpreise: HTTP ${r.status}`);
      return r.json() as Promise<Kaufpreise>;
    })
    .catch((err) => {
      console.warn("Kaufpreise konnten nicht geladen werden:", err);
      return null;
    });
  return cache;
}
