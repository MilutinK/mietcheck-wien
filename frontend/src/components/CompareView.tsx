import type { District } from "../types/district";

interface Props {
    districtA: District | null;
    districtB: District | null;
}

interface CompareRow {
    label: string;
    valueA: string | number;
    valueB: string | number;
    winner?: "a" | "b" | "none";
}

export default function CompareView({ districtA, districtB }: Props) {
    if (!districtA && !districtB) {
        return (
            <div className="panel-empty">
                <p>Wähle zwei Bezirke auf der Karte zum Vergleichen</p>
            </div>
        );
    }

    if (!districtA || !districtB) {
        const chosen = districtA || districtB;
        return (
            <div className="panel-empty">
                <p>
                    <strong>{chosen?.name_full}</strong> gewählt – jetzt den zweiten
                    Bezirk anklicken
                </p>
            </div>
        );
    }

    const pct = (val: number, total: number) =>
        total > 0 ? `${Math.round((val / total) * 100)}%` : "–";

    const rvTotalA = Object.values(districtA.rechtsverhaeltnis).reduce(
        (a, b) => a + b,
        0
    );
    const rvTotalB = Object.values(districtB.rechtsverhaeltnis).reduce(
        (a, b) => a + b,
        0
    );

    const rows: CompareRow[] = [
        {
            label: "Bruttomiete €/m²",
            valueA: districtA.bruttomiete_m2 ? `${districtA.bruttomiete_m2.toFixed(1)} €` : "–",
            valueB: districtB.bruttomiete_m2 ? `${districtB.bruttomiete_m2.toFixed(1)} €` : "–",
            winner:
                (districtA.bruttomiete_m2 ?? 99) < (districtB.bruttomiete_m2 ?? 99)
                    ? "a"
                    : (districtB.bruttomiete_m2 ?? 99) < (districtA.bruttomiete_m2 ?? 99)
                        ? "b"
                        : "none",
        },
        {
            label: "Miete 70m² Wohnung",
            valueA: districtA.bruttomiete_m2 ? `${(districtA.bruttomiete_m2 * 70).toFixed(0)} €` : "–",
            valueB: districtB.bruttomiete_m2 ? `${(districtB.bruttomiete_m2 * 70).toFixed(0)} €` : "–",
        },
        {
            label: "Einwohner",
            valueA: districtA.bevoelkerung.toLocaleString("de-AT"),
            valueB: districtB.bevoelkerung.toLocaleString("de-AT"),
        },
        {
            label: "Wohnungen",
            valueA: districtA.wohnungen_gesamt.toLocaleString("de-AT"),
            valueB: districtB.wohnungen_gesamt.toLocaleString("de-AT"),
        },
        {
            label: "Einwohner/km²",
            valueA: districtA.einwohner_pro_km2.toLocaleString("de-AT"),
            valueB: districtB.einwohner_pro_km2.toLocaleString("de-AT"),
        },
        {
            label: "Fläche",
            valueA: `${districtA.flaeche_km2} km²`,
            valueB: `${districtB.flaeche_km2} km²`,
        },
        {
            label: "Öffi-Score",
            valueA: districtA.oeffi.score.toFixed(1),
            valueB: districtB.oeffi.score.toFixed(1),
            winner:
                districtA.oeffi.score > districtB.oeffi.score
                    ? "a"
                    : districtA.oeffi.score < districtB.oeffi.score
                        ? "b"
                        : "none",
        },
        {
            label: "Haltestellen",
            valueA: districtA.oeffi.haltestellen_anzahl.toString(),
            valueB: districtB.oeffi.haltestellen_anzahl.toString(),
        },
        {
            label: "Gebäude",
            valueA: districtA.gebaeude_anzahl.toLocaleString("de-AT"),
            valueB: districtB.gebaeude_anzahl.toLocaleString("de-AT"),
        },
        {
            label: "Baujahr (Median)",
            valueA: districtA.baujahr_stats?.median?.toString() || "–",
            valueB: districtB.baujahr_stats?.median?.toString() || "–",
        },
        {
            label: "Mietanteil",
            valueA: pct(districtA.rechtsverhaeltnis.hauptmiete, rvTotalA),
            valueB: pct(districtB.rechtsverhaeltnis.hauptmiete, rvTotalB),
        },
        {
            label: "Eigentum gesamt",
            valueA: pct(
                districtA.rechtsverhaeltnis.hauseigentum + districtA.rechtsverhaeltnis.wohnungseigentum,
                rvTotalA
            ),
            valueB: pct(
                districtB.rechtsverhaeltnis.hauseigentum + districtB.rechtsverhaeltnis.wohnungseigentum,
                rvTotalB
            ),
        },
    ];

    return (
        <div className="compare-view">
            <div className="compare-header">
                <div className="compare-name compare-a">{districtA.name_full}</div>
                <div className="compare-vs">vs</div>
                <div className="compare-name compare-b">{districtB.name_full}</div>
            </div>

            <div className="compare-table">
                {rows.map((row, i) => (
                    <div key={i} className="compare-row">
                        <div
                            className={`compare-cell compare-value-a ${row.winner === "a" ? "winner" : ""
                                }`}
                        >
                            {row.valueA}
                        </div>
                        <div className="compare-cell compare-label">{row.label}</div>
                        <div
                            className={`compare-cell compare-value-b ${row.winner === "b" ? "winner" : ""
                                }`}
                        >
                            {row.valueB}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}