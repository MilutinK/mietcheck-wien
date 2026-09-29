import { useState } from "react";
import type { District, MetricKey } from "../types/district";
import { METRIC_LABELS, getMetricValue, formatMetricValue } from "../types/district";

interface Props {
  districts: District[];
  onSelect: (district: District) => void;
}

const COLUMNS: MetricKey[] = [
  "bruttomiete_m2",
  "miete_altbau",
  "miete_neubau",
  "einwohner_pro_km2",
  "oeffi_score",
  "anteil_altbau",
  "anteil_miete",
  "anteil_gemeindebau",
  "anteil_genossenschaft",
  "anteil_miete_frei",
  "wohnungen_gesamt",
  "gebaeude_anzahl",
];

type SortKey = MetricKey | "id";

const cell = { padding: "8px 10px", whiteSpace: "nowrap", textAlign: "right" } as const;

export default function RankingView({ districts, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("bruttomiete_m2");
  const [desc, setDesc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(false);
    }
  };

  const value = (d: District) => (sortKey === "id" ? d.id : getMetricValue(d, sortKey));

  // Fehlende Werte (0 = k.A.) immer ans Ende
  const rows = [...districts].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const missA = sortKey !== "id" && va === 0;
    const missB = sortKey !== "id" && vb === 0;
    if (missA !== missB) return missA ? 1 : -1;
    return desc ? vb - va : va - vb;
  });

  const arrow = (key: SortKey) => (key === sortKey ? (desc ? " ▼" : " ▲") : "");

  const th = {
    ...cell,
    position: "sticky",
    top: 0,
    background: "var(--surface, #fff)",
    borderBottom: "2px solid var(--border, #e0e0e0)",
    cursor: "pointer",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    zIndex: 2,
  } as const;

  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--panel-bg, #fff)" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%" }}>
        <thead>
          <tr>
            <th
              style={{ ...th, textAlign: "left", left: 0, zIndex: 3 }}
              onClick={() => handleSort("id")}
              aria-sort={sortKey === "id" ? (desc ? "descending" : "ascending") : "none"}
            >
              Bezirk{arrow("id")}
            </th>
            {COLUMNS.map((key) => (
              <th
                key={key}
                style={th}
                onClick={() => handleSort(key)}
                aria-sort={sortKey === key ? (desc ? "descending" : "ascending") : "none"}
              >
                {METRIC_LABELS[key]}
                {arrow(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d)}
              style={{ cursor: "pointer", borderBottom: "1px solid var(--border, #eee)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <td
                style={{
                  ...cell,
                  textAlign: "left",
                  position: "sticky",
                  left: 0,
                  background: "var(--panel-bg, #fff)",
                  fontWeight: 500,
                }}
              >
                {d.id}. {d.name}
              </td>
              {COLUMNS.map((key) => {
                const v = getMetricValue(d, key);
                const missing = v === 0 && key !== "anteil_gemeindebau";
                return (
                  <td
                    key={key}
                    style={{
                      ...cell,
                      fontWeight: key === sortKey ? 600 : 400,
                      color: missing ? "var(--text-secondary)" : "inherit",
                    }}
                  >
                    {missing ? "k.A." : formatMetricValue(v, key)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
