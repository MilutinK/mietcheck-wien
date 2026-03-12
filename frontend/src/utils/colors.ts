import type { District, MetricKey } from "../types/district";
import { getMetricValue } from "../types/district";

const COLOR_RAMP = [
    "#f7fbff",
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

export function getColorForValue(
    value: number,
    min: number,
    max: number
): string {
    if (max === min) return COLOR_RAMP[5];
    const ratio = (value - min) / (max - min);
    const index = Math.min(Math.floor(ratio * COLOR_RAMP.length), COLOR_RAMP.length - 1);
    return COLOR_RAMP[index];
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
    max: number
): { color: string; label: string }[] {
    const steps = 5;
    const result = [];
    for (let i = 0; i < steps; i++) {
        const value = min + (max - min) * (i / (steps - 1));
        const colorIndex = Math.floor((i / (steps - 1)) * (COLOR_RAMP.length - 1));
        result.push({
            color: COLOR_RAMP[colorIndex],
            label: Math.round(value).toLocaleString("de-AT"),
        });
    }
    return result;
}