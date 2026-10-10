import { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, GeoJSON, Pane, CircleMarker, Tooltip } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { District, MetricKey } from "../types/district";
import { getMetricValue, formatMetricValue, METRIC_LABELS } from "../types/district";
import { getColorForValue, getMinMax, getLegendSteps } from "../utils/colors";
import MapLibreLayer from "./MapLibreLayer";
import { useGemeindebau } from "../hooks/useGemeindebau";
import StandortLayer from "./StandortLayer";
import KartenZeitregler from "./KartenZeitregler";
import { useMietverlauf } from "../hooks/useMietverlauf";
import { monatsname, zeitreiseAus } from "../utils/verlauf";
import type { StandortErgebnis } from "../hooks/useStandort";
import type { FaktorId } from "../types/standorte";

interface Props {
    districts: District[];
    metric: MetricKey;
    selected: District | null;
    compareA: District | null;
    compareB: District | null;
    onDistrictClick: (district: District) => void;
    dark: boolean;
    /** Standort-Check: Klick auf die Karte setzt einen Punkt statt einen Bezirk zu wählen */
    standortAktiv: boolean;
    standort: StandortErgebnis | null;
    standortSichtbar: FaktorId[];
    /** Karte beim ersten Anzeigen auf den Standort zoomen (geteilter Link) */
    standortZentrieren: boolean;
    onStandortClick: (lat: number, lon: number) => void;
}

// Wien mit etwas Rand – begrenzt Weit-Rauszoomen und Verschieben
const VIENNA_BOUNDS: [[number, number], [number, number]] = [
    [48.08, 16.15],
    [48.36, 16.62],
];

export default function ViennaMap({
    districts,
    metric,
    selected,
    compareA,
    compareB,
    onDistrictClick,
    dark,
    standortAktiv,
    standort,
    standortSichtbar,
    standortZentrieren,
    onStandortClick,
}: Props) {
    const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
    const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
    const [showGemeindebau, setShowGemeindebau] = useState(false);
    const gemeindebau = useGemeindebau();
    // Zeitreise: Bezirke nach Monat einfärben (nur für die Gesamtmiete, dort gibt es die lange Reihe)
    const verlauf = useMietverlauf();
    const zeit = useMemo(() => (verlauf ? zeitreiseAus(verlauf) : null), [verlauf]);
    const [zeitIndex, setZeitIndex] = useState<number | null>(null);
    const zeitMoeglich = metric === "bruttomiete_m2" && zeit !== null && verlauf !== null;
    const zeitAktiv = zeitMoeglich && zeitIndex !== null;

    useEffect(() => {
        fetch("/data/bezirksgrenzen.json")
            .then((r) => r.json())
            .then(setGeoData);
    }, []);

    // GeoJSON neu rendern wenn sich Metric, Selection oder Daten ändern
    const geoKey = [metric, selected?.id, compareA?.id, compareB?.id, districts.length, standortAktiv, zeitAktiv ? zeitIndex : "heute"].join("-");

    if (!geoData || districts.length === 0) {
        return <div className="map-loading">Lade Karte...</div>;
    }

    const [min, max] = zeitAktiv ? [zeit!.min, zeit!.max] : getMinMax(districts, metric);
    const wertFuer = (d: District): number | null =>
        zeitAktiv ? (zeit!.reihen[d.id]?.[zeitIndex!] ?? null) : getMetricValue(d, metric);
    const zeitLabel = zeitAktiv ? monatsname(verlauf!.monate[zeitIndex!]) : null;
    const isRent =
        metric === "bruttomiete_m2" || metric === "miete_altbau" || metric === "miete_neubau";

    const getDistrict = (feature: Feature): District | undefined => {
        const bezNr = feature.properties?.BEZNR || feature.properties?.BEZ;
        return districts.find((d) => d.id === Number(bezNr));
    };

    const style = (feature?: Feature) => {
        if (!feature) return {};
        const district = getDistrict(feature);
        if (!district) return { fillColor: dark ? "#444" : "#ccc", weight: 1 };

        const value = wertFuer(district);
        const fillColor = value === null ? (dark ? "#444" : "#ccc") : getColorForValue(value, min, max, isRent);

        const isSelected = selected?.id === district.id;
        const isCompareA = compareA?.id === district.id;
        const isCompareB = compareB?.id === district.id;
        const highlighted = isSelected || isCompareA || isCompareB;

        return {
            fillColor,
            fillOpacity: highlighted ? 0.85 : dark ? 0.6 : 0.55,
            color: highlighted ? (dark ? "#ece9e2" : "#16181d") : dark ? "#1a1d22" : "#f3eee4",
            weight: highlighted ? 3 : 1.5,
            dashArray: isCompareB ? "5 5" : undefined,
        };
    };

    const onEachFeature = (feature: Feature, layer: Layer) => {
        const district = getDistrict(feature);
        if (!district) return;

        const value = wertFuer(district);
        const label = zeitLabel ? `${METRIC_LABELS[metric]} (${zeitLabel})` : METRIC_LABELS[metric];

        layer.bindTooltip(
            `<strong>${district.name}</strong><br/>${label}: ${value === null ? "k.A." : formatMetricValue(value, metric)}`,
            { sticky: true, className: "district-tooltip" }
        );

        layer.on({
            click: (e: LeafletMouseEvent) =>
                standortAktiv ? onStandortClick(e.latlng.lat, e.latlng.lng) : onDistrictClick(district),
            mouseover: (e: LeafletMouseEvent) => {
                const target = e.target;
                target.setStyle({ fillOpacity: 0.9, weight: 3 });
                target.bringToFront();
            },
            mouseout: (e: LeafletMouseEvent) => {
                geoJsonRef.current?.resetStyle(e.target);
            },
        });
    };

    const legend = getLegendSteps(min, max, isRent);

    return (
        <>
            <MapContainer
                center={[48.2082, 16.3738]}
                zoom={12}
                minZoom={11}
                maxZoom={16}
                maxBounds={VIENNA_BOUNDS}
                maxBoundsViscosity={1}
                className="leaflet-map"
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <MapLibreLayer style={`https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`} />
                <GeoJSON
                    key={geoKey}
                    ref={geoJsonRef}
                    data={geoData}
                    style={style}
                    onEachFeature={onEachFeature}
                />
                {/* Eigene Ebene über den Bezirksflächen, damit sie beim Neuzeichnen oben bleibt */}
                {showGemeindebau && gemeindebau && (
                    <Pane name="gemeindebau" style={{ zIndex: 450 }}>
                        {gemeindebau.anlagen.map((a, i) => (
                            <CircleMarker
                                key={i}
                                center={[a.lat, a.lon]}
                                radius={a.wohnungen ? Math.min(9, 2.5 + Math.sqrt(a.wohnungen) / 10) : 2.5}
                                pathOptions={{
                                    color: dark ? "#1a1d22" : "#f3eee4",
                                    weight: 1,
                                    fillColor: dark ? "#ece9e2" : "#16181d",
                                    fillOpacity: 0.8,
                                }}
                                eventHandlers={{
                                    click: () => {
                                        if (standortAktiv) {
                                            onStandortClick(a.lat, a.lon);
                                            return;
                                        }
                                        const d = districts.find((x) => x.id === a.bezirk);
                                        if (d) onDistrictClick(d);
                                    },
                                }}
                            >
                                <Tooltip sticky className="district-tooltip">
                                    <strong>{a.adresse || a.name}</strong>
                                    <br />
                                    {a.wohnungen ? `${a.wohnungen.toLocaleString("de-AT")} Wohnungen` : "Wohnungszahl unbekannt"}
                                    {a.baujahr ? ` · Baujahr ${a.baujahr}` : ""}
                                </Tooltip>
                            </CircleMarker>
                        ))}
                    </Pane>
                )}
                {standortAktiv && standort && <StandortLayer ergebnis={standort} sichtbar={standortSichtbar} dark={dark} zentrieren={standortZentrieren} />}
            </MapContainer>

            {gemeindebau && (
                <button
                    className="map-layer-toggle"
                    aria-pressed={showGemeindebau}
                    onClick={() => setShowGemeindebau((v) => !v)}
                >
                    <span className="map-layer-dot" aria-hidden="true" />
                    Gemeindebauten
                </button>
            )}

            {zeitMoeglich && (
                <KartenZeitregler
                    monate={verlauf!.monate}
                    erster={zeit!.erster}
                    letzter={zeit!.letzter}
                    index={zeitIndex}
                    onChange={setZeitIndex}
                />
            )}

            <div className={`map-legend${zeitAktiv ? " map-legend--zeit" : ""}`}>
                <div className="legend-title">{zeitLabel ? `${METRIC_LABELS[metric]} · ${zeitLabel}` : METRIC_LABELS[metric]}</div>
                <div className="legend-scale">
                    {legend.map((step, i) => (
                        <div key={i} className="legend-step">
                            <div
                                className="legend-color"
                                style={{ backgroundColor: step.color }}
                            />
                            <span>{step.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}