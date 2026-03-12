interface DataPoint {
    label: string;
    value: number;
    color: string;
}

interface Props {
    data: DataPoint[];
}

export default function MiniChart({ data }: Props) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return null;

    return (
        <div className="mini-chart">
            <div className="mini-chart-bar">
                {data.map((d, i) => {
                    const pct = (d.value / total) * 100;
                    if (pct < 1) return null;
                    return (
                        <div
                            key={i}
                            className="mini-chart-segment"
                            style={{ width: `${pct}%`, backgroundColor: d.color }}
                            title={`${d.label}: ${Math.round(pct)}%`}
                        />
                    );
                })}
            </div>
            <div className="mini-chart-legend">
                {data.map((d, i) => {
                    const pct = (d.value / total) * 100;
                    if (pct < 3) return null;
                    return (
                        <div key={i} className="mini-chart-legend-item">
                            <span
                                className="mini-chart-dot"
                                style={{ backgroundColor: d.color }}
                            />
                            <span>{d.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}