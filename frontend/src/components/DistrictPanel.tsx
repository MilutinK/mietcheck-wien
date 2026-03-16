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

            {district.bruttomiete_m2 && (
                <div className="panel-section" style={{ marginBottom: 16 }}>
                    <div className="stat-card" style={{ background: "#e8f4fd", textAlign: "center" }}>
                        <span className="stat-value" style={{ fontSize: "1.6rem", color: "#2e86c1" }}>
                            {district.bruttomiete_m2.toFixed(1)} €/m²
                        </span>
                        <span className="stat-label">
                            Bruttomiete (Median)
                            {district.miete_veraenderung_prozent !== undefined && (
                                <span style={{ color: district.miete_veraenderung_prozent >= 0 ? "#e74c3c" : "#27ae60" }}>
                                    {" "}({district.miete_veraenderung_prozent >= 0 ? "+" : ""}{district.miete_veraenderung_prozent}% gg. Vorjahr)
                                </span>
                            )}
                        </span>
                        <span className="stat-label" style={{ fontSize: "0.65rem", marginTop: 4 }}>
                            Quelle: ImmoScout24, Jan–Okt 2025{!district.miete_confirmed && " (geschätzt)"}
                        </span>
                    </div>
                </div>
            )}

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
        <h3>Rechtsverhältnis (Personen)</h3>
        <MiniChart
          data={[
            { label: "Hauptmiete", value: rv.hauptmiete, color: "#e74c3c" },
            { label: "Hauseigentum", value: rv.hauseigentum, color: "#2e86c1" },
            { label: "Whg.-Eigentum", value: rv.wohnungseigentum, color: "#11c56e" },
            { label: "Sonstige", value: rv.sonstige, color: "#95a5a6" },
          ]}
        />
        <div className="detail-list">
          <div className="detail-row">
            <span>Hauptmiete</span>
            <span>{pct(rv.hauptmiete, rvTotal)}</span>
          </div>
          <div className="detail-row">
            <span>Hauseigentum</span>
            <span>{pct(rv.hauseigentum, rvTotal)}</span>
          </div>
          <div className="detail-row">
            <span>Wohnungseigentum</span>
            <span>{pct(rv.wohnungseigentum, rvTotal)}</span>
          </div>
          <div className="detail-row">
            <span>Sonstige</span>
            <span>{pct(rv.sonstige, rvTotal)}</span>
          </div>
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 8, padding: "6px 8px", background: "var(--bg)", borderRadius: 6 }}>
          ℹ️ Werte zeigen Personen nach Wohnverhältnis (Registerzählung 2023).
          Wien-weit: ~21% Gemeinde, ~21% Genossenschaft, ~33% private Miete, ~20% Eigentum.
          <br/>Quelle: Statistik Austria, Mikrozensus 2024
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