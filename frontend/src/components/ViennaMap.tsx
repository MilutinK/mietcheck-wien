import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { District, MetricKey } from "../types/district";
import { getMetricValue, formatMetricValue, METRIC_LABELS } from "../types/district";
import { getColorForValue, getMinMax, getLegendSteps } from "../utils/colors";

interface Props {
    districts: District[];
    metric: MetricKey;
    selected: District | null;
    compareA: District | null;
    compareB: District | null;
    onDistrictClick: (district: District) => void;
}

export default function ViennaMap({
    districts,
    metric,
    selected,
    compareA,
    compareB,
    onDistrictClick,
}: Props) {
    const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
    const geoJsonRef = useRef<any>(null);

    useEffect(() => {
        fetch("/data/bezirksgrenzen.json")
            .then((r) => r.json())
            .then(setGeoData);
    }, []);

    // GeoJSON neu rendern wenn sich Metric, Selection oder Daten ändern
    const [geoKey, setGeoKey] = useState(0);
    useEffect(() => {
        setGeoKey((k) => k + 1);
    }, [metric, selected, compareA, compareB, districts]);

    if (!geoData || districts.length === 0) {
        return <div className="map-loading">Lade Karte...</div>;
    }

    const [min, max] = getMinMax(districts, metric);

    const getDistrict = (feature: Feature): District | undefined => {
        const bezNr = feature.properties?.BEZNR || feature.properties?.BEZ;
        return districts.find((d) => d.id === Number(bezNr));
    };

    const style = (feature?: Feature) => {
        if (!feature) return {};
        const district = getDistrict(feature);
        if (!district) return { fillColor: "#ccc", weight: 1 };

        const value = getMetricValue(district, metric);
        const fillColor = getColorForValue(value, min, max);

        const isSelected = selected?.id === district.id;
        const isCompareA = compareA?.id === district.id;
        const isCompareB = compareB?.id === district.id;
        const highlighted = isSelected || isCompareA || isCompareB;

        return {
            fillColor,
            fillOpacity: highlighted ? 0.9 : 0.7,
            color: highlighted ? "#e74c3c" : "#fff",
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
            `<strong>${district.name_full}</strong><br/>${label}: ${formatMetricValue(value, metric)}`,
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

    const legend = getLegendSteps(min, max);

    return (
        <>
            <MapContainer
                center={[48.2082, 16.3738]}
                zoom={12}
                className="leaflet-map"
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                />
                <GeoJSON
                    key={geoKey}
                    ref={geoJsonRef}
                    data={geoData}
                    style={style}
                    onEachFeature={onEachFeature}
                />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                    pane="tooltipPane"
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