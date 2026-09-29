import type { District, MetricKey } from "../types/district";
import { getMetricValue } from "../types/district";

// Neutrale Kennzahlen: Papier → tiefes Blau
const COLOR_RAMP = [
    "#f1ebde",
    "#d4e6f1",
    "#a9cce3",
    "#7fb3d3",
    "#5499c7",
    "#2e86c1",
    "#1a6fa5",
    "#0e5a8a",
    "#08476e",
    "#023858",
];

// Mietpreise: Türkis (günstig) → Tomatenrot (teuer), wie im Ranking
const RENT_RAMP = [
    "#1f8a78",
    "#4a9a6a",
    "#7aa95c",
    "#a9b355",
    "#d0b754",
    "#e3a94b",
    "#e58a42",
    "#e0693a",
    "#d9482b",
    "#b93a20",
];

function rampFor(rent: boolean): string[] {
    return rent ? RENT_RAMP : COLOR_RAMP;
}

export function getColorForValue(
    value: number,
    min: number,
    max: number,
    rent = false
): string {
    const ramp = rampFor(rent);
    if (max === min) return ramp[5];
    const ratio = (value - min) / (max - min);
    const index = Math.min(Math.floor(ratio * ramp.length), ramp.length - 1);
    return ramp[Math.max(0, index)];
}

export function getMinMax(
    districts: District[],
    metric: MetricKey
): [number, number] {
    const values = districts.map((d) => getMetricValue(d, metric));
    return [Math.min(...values), Math.max(...values)];
}

export function getLegendSteps(
    min: number,
    max: number,
    rent = false
): { color: string; label: string }[] {
    const ramp = rampFor(rent);
    const steps = 5;
    const result = [];
    for (let i = 0; i < steps; i++) {
        const value = min + (max - min) * (i / (steps - 1));
        const colorIndex = Math.floor((i / (steps - 1)) * (ramp.length - 1));
        result.push({
            color: ramp[colorIndex],
            label: Math.round(value).toLocaleString("de-AT"),
        });
    }
    return result;
}