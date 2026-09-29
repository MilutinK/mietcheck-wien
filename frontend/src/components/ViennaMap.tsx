import { useEffect, useState, useRef } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { District, MetricKey } from "../types/district";
import { getMetricValue, formatMetricValue, METRIC_LABELS } from "../types/district";
import { getColorForValue, getMinMax, getLegendSteps } from "../utils/colors";
import MapLibreLayer from "./MapLibreLayer";

interface Props {
    districts: District[];
    metric: MetricKey;
    selected: District | null;
    compareA: District | null;
    compareB: District | null;
    onDistrictClick: (district: District) => void;
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
}: Props) {
    const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
    const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

    useEffect(() => {
        fetch("/data/bezirksgrenzen.json")
            .then((r) => r.json())
            .then(setGeoData);
    }, []);

    // GeoJSON neu rendern wenn sich Metric, Selection oder Daten ändern
    const geoKey = [metric, selected?.id, compareA?.id, compareB?.id, districts.length].join("-");

    if (!geoData || districts.length === 0) {
        return <div className="map-loading">Lade Karte...</div>;
    }

    const [min, max] = getMinMax(districts, metric);
    const isRent =
        metric === "bruttomiete_m2" || metric === "miete_altbau" || metric === "miete_neubau";

    const getDistrict = (feature: Feature): District | undefined => {
        const bezNr = feature.properties?.BEZNR || feature.properties?.BEZ;
        return districts.find((d) => d.id === Number(bezNr));
    };

    const style = (feature?: Feature) => {
        if (!feature) return {};
        const district = getDistrict(feature);
        if (!district) return { fillColor: "#ccc", weight: 1 };

        const value = getMetricValue(district, metric);
        const fillColor = getColorForValue(value, min, max, isRent);

        const isSelected = selected?.id === district.id;
        const isCompareA = compareA?.id === district.id;
        const isCompareB = compareB?.id === district.id;
        const highlighted = isSelected || isCompareA || isCompareB;

        return {
            fillColor,
            fillOpacity: highlighted ? 0.8 : 0.55,
            color: highlighted ? "#16181d" : "#f3eee4",
            weight: highlighted ? 3 : 1.5,
            dashArray: isCompareB ? "5 5" : undefined,
        };
    };

    const onEachFeature = (feature: Feature, layer: Layer) => {
        const district = getDistrict(feature);
        if (!district) return;

        const value = getMetricValue(district, metric);
        const label = METRIC_LABELS[metric];

        layer.bindTooltip(
            `<strong>${district.name}</strong><br/>${label}: ${formatMetricValue(value, metric)}`,
            { sticky: true, className: "district-tooltip" }
        );

        layer.on({
            click: () => onDistrictClick(district),
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
                <MapLibreLayer style="https://tiles.openfreemap.org/styles/positron" />
                <GeoJSON
                    key={geoKey}
                    ref={geoJsonRef}
                    data={geoData}
                    style={style}
                    onEachFeature={onEachFeature}
                />
            </MapContainer>

            <div className="map-legend">
                <div className="legend-title">{METRIC_LABELS[metric]}</div>
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