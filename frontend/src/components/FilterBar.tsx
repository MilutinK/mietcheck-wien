import type { MetricKey } from "../types/district";
import { METRIC_LABELS } from "../types/district";

interface Props {
    metric: MetricKey;
    onChange: (metric: MetricKey) => void;
}

const METRICS = Object.keys(METRIC_LABELS) as MetricKey[];

export default function FilterBar({ metric, onChange }: Props) {
    return (
        <div className="filter-bar">
            <label className="filter-label">Karte einfärben nach:</label>
            <select
                className="filter-select"
                value={metric}
                onChange={(e) => onChange(e.target.value as MetricKey)}
            >
                {METRICS.map((key) => (
                    <option key={key} value={key}>
                        {METRIC_LABELS[key]}
                    </option>
                ))}
            </select>
        </div>
    );
}