import { useState } from "react";
import type { District, MetricKey } from "../types/district";
import { METRIC_LABELS, getMetricValue, formatMetricValue } from "../types/district";

interface Props {
  districts: District[];
  onSelect: (district: District) => void;
}

const RENT_METRICS: MetricKey[] = ["bruttomiete_m2", "miete_altbau", "miete_neubau"];
const RENT_CHIPS: { key: MetricKey; label: string }[] = [
  { key: "bruttomiete_m2", label: "Gesamt" },
  { key: "miete_altbau", label: "Altbau" },
  { key: "miete_neubau", label: "Neubau" },
];
const OTHER_METRICS = (Object.keys(METRIC_LABELS) as MetricKey[]).filter((k) => !RENT_METRICS.includes(k));

// Türkis (günstig) → Tomatenrot (teuer)
function rentColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  return `hsl(${Math.round(168 - 156 * c)}, 58%, ${Math.round(40 + 4 * c)}%)`;
}

const NEUTRAL_BAR = "#2f5d8a";

const de1 = (v: number) => v.toFixed(1).replace(".", ",");

export default function RankingView({ districts, onSelect }: Props) {
  const [metric, setMetric] = useState<MetricKey>("bruttomiete_m2");
  const [desc, setDesc] = useState(false);

  const isRent = RENT_METRICS.includes(metric);

  const withValue = districts.map((d) => {
    const v = getMetricValue(d, metric);
    return { d, v, oeffi: d.oeffi?.score ?? 0, missing: v === 0 && (isRent || metric === "oeffi_score") };
  });

  const present = withValue.filter((r) => !r.missing).sort((a, b) => (desc ? b.v - a.v : a.v - b.v));
  const missing = withValue.filter((r) => r.missing);
  const rows = [...present, ...missing];

  const values = present.map((r) => r.v);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;
  const low = desc ? present[present.length - 1] : present[0];
  const high = desc ? present[0] : present[present.length - 1];

  const fmt = (v: number) => formatMetricValue(v, metric);

  return (
    <div className="rk">
      <div className="rk-inner">
        <div>
          <h2 className="rk-title">
            {isRent && lo > 0 ? (
              <>
                Wien kostet <span className="rk-accent">{de1(hi / lo)}×</span> mehr, je nachdem wo du wohnst.
              </>
            ) : (
              <>Bezirke nach {METRIC_LABELS[metric]}</>
            )}
          </h2>
          <p className="rk-lead">
            {isRent
              ? `Vom günstigsten bis zum teuersten Bezirk liegen ${de1(hi - lo)} € pro Quadratmeter. Klicke einen Bezirk für Details.`
              : "Sortiert nach der gewählten Kennzahl. Klicke einen Bezirk für Details."}
          </p>
        </div>

        <div className="rk-body">
          <div className="rk-list-col">
            <div className="rk-controls">
              <div className="rk-chips" role="group" aria-label="Kennzahl">
                {RENT_CHIPS.map((c) => (
                  <button
                    key={c.key}
                    className={`rk-chip${metric === c.key ? " rk-chip-on" : ""}`}
                    aria-pressed={metric === c.key}
                    onClick={() => setMetric(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
                <select
                  className={`rk-chip rk-select${!isRent ? " rk-chip-on" : ""}`}
                  aria-label="Weitere Kennzahl"
                  value={isRent ? "" : metric}
                  onChange={(e) => e.target.value && setMetric(e.target.value as MetricKey)}
                >
                  <option value="" disabled>
                    Mehr …
                  </option>
                  {OTHER_METRICS.map((k) => (
                    <option key={k} value={k}>
                      {METRIC_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="rk-sort" onClick={() => setDesc(!desc)}>
                {desc ? "▼ höchste zuerst" : "▲ niedrigste zuerst"}
              </button>
            </div>

            <ol className="rk-list">
              {rows.map((r, i) => {
                const t = hi > lo ? (r.v - lo) / (hi - lo) : 0;
                return (
                  <li key={r.d.id}>
                    <button className="rk-row" onClick={() => onSelect(r.d)}>
                      <span className="rk-rank">{r.missing ? "–" : i + 1}</span>
                      <span className="rk-name">
                        {r.d.id}. {r.d.name}
                      </span>
                      <span className="rk-track" aria-hidden="true">
                        <span
                          className="rk-bar"
                          style={{
                            width: r.missing || hi <= 0 ? "0%" : `${Math.max(3, (r.v / hi) * 100)}%`,
                            background: isRent ? rentColor(t) : NEUTRAL_BAR,
                          }}
                        />
                      </span>
                      <span className="rk-val">{r.missing ? "k. A." : fmt(r.v)}</span>
                      <span className="rk-oeffi">Öffi {de1(r.oeffi)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {low && high && (
            <aside className="rk-side">
              <div className="rk-card rk-card-low">
                <div className="rk-card-label">{isRent ? "Am günstigsten" : "Niedrigster Wert"}</div>
                <div className="rk-card-name">
                  {low.d.id}. {low.d.name}
                </div>
                <div className="rk-card-val">
                  {fmt(low.v)}
                  {isRent && " /m²"}
                </div>
              </div>
              <div className="rk-card rk-card-high">
                <div className="rk-card-label">{isRent ? "Am teuersten" : "Höchster Wert"}</div>
                <div className="rk-card-name">
                  {high.d.id}. {high.d.name}
                </div>
                <div className="rk-card-val">
                  {fmt(high.v)}
                  {isRent && " /m²"}
                </div>
              </div>
              <p className="rk-source">
                Quelle: immopreise.at (Angebotspreise brutto), MA 23, Registerzählung 2023. Bezirke ohne Wert haben zu
                wenige Inserate.
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
