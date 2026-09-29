// MapLibre GL 6 lädt seinen Worker als eigene Datei (samt Shared-Chunk).
// Vite bündelt sie nicht, daher vor dev/build nach public/maplibre kopieren.
import { cpSync, mkdirSync } from "node:fs";

const src = "node_modules/maplibre-gl/dist";
const dest = "public/maplibre";
mkdirSync(dest, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  cpSync(`${src}/${f}`, `${dest}/${f}`);
}
