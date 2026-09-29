import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import { setWorkerUrl } from "maplibre-gl";

// Worker wird per scripts/copy-maplibre-worker.mjs nach public/maplibre kopiert
setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);

interface Props {
    style: string;
}

// @maplibre/maplibre-gl-leaflet bringt keine Typen mit
interface MapLibreLeafletLayer extends L.Layer {
    getContainer(): HTMLElement | undefined;
}
type MapLibreFactory = (options: { style: string; attribution: string }) => MapLibreLeafletLayer;

export default function MapLibreLayer({ style }: Props) {
    const map = useMap();

    useEffect(() => {
        const layer = (L as unknown as { maplibreGL: MapLibreFactory }).maplibreGL({
            style,
            attribution:
                '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        });

        layer.addTo(map);

        // Layer muss unter den GeoJSON-Overlays bleiben
        layer.getContainer()?.style.setProperty("z-index", "0");

        return () => {
            map.removeLayer(layer);
        };
    }, [map, style]);

    return null;
}