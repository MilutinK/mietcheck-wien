import type { District } from "../types/district";
import MiniChart from "./MiniChart";

interface Props {
    district: District;
}

export default function DistrictPanel({ district }: Props) {
    const rv = district.rechtsverhaeltnis;
    const rvTotal = Object.values(rv).reduce((a, b) => a + b, 0);

    const nf = district.nutzflaechen;
    const nfTotal = Object.values(nf).reduce((a, b) => a + b, 0);

    const pct = (val: number, total: number) =>
        total > 0 ? `${Math.round((val / total) * 100)}%` : "–";

    return (
        <div className="district-panel">
            <h2>{district.name_full}</h2>

            <div className="stat-grid">
                <div className="stat-card">
                    <span className="stat-value">
                        {district.bevoelkerung.toLocaleString("de-AT")}
                    </span>
                    <span className="stat-label">Einwohner</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">
                        {district.wohnungen_gesamt.toLocaleString("de-AT")}
                    </span>
                    <span className="stat-label">Wohnungen</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">
                        {district.einwohner_pro_km2.toLocaleString("de-AT")}
                    </span>
                    <span className="stat-label">Einwohner/km²</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{district.oeffi.score.toFixed(1)}</span>
                    <span className="stat-label">Öffi-Score</span>
                </div>
            </div>

            <div className="panel-section">
                <h3>Rechtsverhältnis</h3>
                <MiniChart
                    data={[
                        { label: "Eigentum", value: rv.eigentum, color: "#2e86c1" },
                        { label: "Hauptmiete", value: rv.hauptmiete, color: "#e74c3c" },
                        { label: "Gemeinde", value: rv.gemeinde, color: "#27ae60" },
                        { label: "Genossenschaft", value: rv.genossenschaft, color: "#f39c12" },
                        { label: "Sonstige", value: rv.sonstige, color: "#95a5a6" },
                    ]}
                />
                <div className="detail-list">
                    <div className="detail-row">
                        <span>Eigentum</span>
                        <span>{pct(rv.eigentum, rvTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>Hauptmiete</span>
                        <span>{pct(rv.hauptmiete, rvTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>Gemeinde</span>
                        <span>{pct(rv.gemeinde, rvTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>Genossenschaft</span>
                        <span>{pct(rv.genossenschaft, rvTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="panel-section">
                <h3>Wohnungsgrößen</h3>
                <div className="detail-list">
                    <div className="detail-row">
                        <span>unter 35 m²</span>
                        <span>{pct(nf.unter_35m2, nfTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>35–60 m²</span>
                        <span>{pct(nf.von_35_bis_60m2, nfTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>60–90 m²</span>
                        <span>{pct(nf.von_60_bis_90m2, nfTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>90–130 m²</span>
                        <span>{pct(nf.von_90_bis_130m2, nfTotal)}</span>
                    </div>
                    <div className="detail-row">
                        <span>über 130 m²</span>
                        <span>{pct(nf.ueber_130m2, nfTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="panel-section">
                <h3>Gebäude</h3>
                <div className="detail-list">
                    <div className="detail-row">
                        <span>Anzahl erfasst</span>
                        <span>{district.gebaeude_anzahl.toLocaleString("de-AT")}</span>
                    </div>
                    {district.baujahr_stats?.median && (
                        <div className="detail-row">
                            <span>Baujahr (Median)</span>
                            <span>{district.baujahr_stats.median}</span>
                        </div>
                    )}
                    {district.baujahr_stats?.aeltestes && (
                        <div className="detail-row">
                            <span>Ältestes Gebäude</span>
                            <span>{district.baujahr_stats.aeltestes}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="panel-section">
                <h3>Öffi-Anbindung</h3>
                <div className="detail-list">
                    <div className="detail-row">
                        <span>Haltestellen</span>
                        <span>{district.oeffi.haltestellen_anzahl}</span>
                    </div>
                    <div className="detail-row">
                        <span>pro km²</span>
                        <span>{district.oeffi.haltestellen_pro_km2}</span>
                    </div>
                    <div className="detail-row">
                        <span>Fläche</span>
                        <span>{district.flaeche_km2} km²</span>
                    </div>
                </div>
            </div>
        </div>
    );
}