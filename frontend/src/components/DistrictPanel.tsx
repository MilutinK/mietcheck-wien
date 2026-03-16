import type { District } from "../types/district";
import MiniChart from "./MiniChart";

interface Props {
  district: District;
}

/** Format euro value or show k.A. */
const eur = (val: number | null | undefined) =>
  val != null ? `${val.toFixed(2)} €` : "k.A.";

export default function DistrictPanel({ district }: Props) {
  const rv = district.rechtsverhaeltnis;
  const rvTotal = Object.values(rv).reduce((a, b) => a + b, 0);

  const pct = (val: number, total: number) =>
    total > 0 ? `${Math.round((val / total) * 100)}%` : "–";

  const mp = district.mietpreise;

  return (
    <div className="district-panel">
      <h2>{district.id}. {district.name}</h2>

      {/* ── Mietpreise Card ── */}
      {mp?.gesamt?.durchschnitt != null && (
        <div className="panel-section" style={{ marginBottom: 16 }}>
          <div className="stat-card" style={{ background: "#e8f4fd", textAlign: "center" }}>
            <span className="stat-value" style={{ fontSize: "1.6rem", color: "#2e86c1" }}>
              {mp.gesamt.durchschnitt.toFixed(2)} €/m²
            </span>
            <span className="stat-label">Bruttomiete (Durchschnitt)</span>
          </div>

          {/* Altbau vs Neubau */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div className="stat-card" style={{ background: "#fef5e7", textAlign: "center" }}>
              <span className="stat-value" style={{ fontSize: "1.1rem", color: "#b7950b" }}>
                {mp.altbau?.durchschnitt != null ? `${mp.altbau.durchschnitt.toFixed(2)} €` : "k.A."}
              </span>
              <span className="stat-label">Altbau /m²</span>
            </div>
            <div className="stat-card" style={{ background: "#eafaf1", textAlign: "center" }}>
              <span className="stat-value" style={{ fontSize: "1.1rem", color: "#1e8449" }}>
                {mp.neubau?.durchschnitt != null ? `${mp.neubau.durchschnitt.toFixed(2)} €` : "k.A."}
              </span>
              <span className="stat-label">Neubau /m²</span>
            </div>
          </div>

          {/* 70m² Beispielrechnung */}
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 8, textAlign: "center" }}>
            70 m² Wohnung: <strong>{(mp.gesamt.durchschnitt * 70).toFixed(0)} €/Monat</strong>
            {mp.altbau?.durchschnitt != null && (
              <> (Altbau: {(mp.altbau.durchschnitt * 70).toFixed(0)} €)</>
            )}
          </div>

          {/* Größenkategorien Gesamt */}
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: "0.75rem", cursor: "pointer", color: "var(--text-secondary)" }}>
              Preise nach Wohnungsgröße
            </summary>
            <div className="detail-list" style={{ marginTop: 6 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: 4, color: "#2e86c1" }}>
                Gesamt (März 2025)
              </div>
              <div className="detail-row">
                <span>&lt; 50 m²</span>
                <span>{eur(mp.gesamt.unter_50m2)}</span>
              </div>
              <div className="detail-row">
                <span>51–80 m²</span>
                <span>{eur(mp.gesamt.von_51_bis_80m2)}</span>
              </div>
              <div className="detail-row">
                <span>81–129 m²</span>
                <span>{eur(mp.gesamt.von_81_bis_129m2)}</span>
              </div>
              <div className="detail-row">
                <span>&gt; 130 m²</span>
                <span>{eur(mp.gesamt.ueber_130m2)}</span>
              </div>

              {mp.altbau?.durchschnitt != null && (
                <>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, marginTop: 8, marginBottom: 4, color: "#b7950b" }}>
                    Altbau (Juli 2025)
                  </div>
                  <div className="detail-row">
                    <span>&lt; 80 m²</span>
                    <span>{eur(mp.altbau.unter_80m2)}</span>
                  </div>
                  <div className="detail-row">
                    <span>81–129 m²</span>
                    <span>{eur(mp.altbau.von_81_bis_129m2)}</span>
                  </div>
                  <div className="detail-row">
                    <span>&gt; 130 m²</span>
                    <span>{eur(mp.altbau.ueber_130m2)}</span>
                  </div>
                </>
              )}

              {mp.neubau?.durchschnitt != null && (
                <>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, marginTop: 8, marginBottom: 4, color: "#1e8449" }}>
                    Neubau (März 2025)
                  </div>
                  <div className="detail-row">
                    <span>&lt; 80 m²</span>
                    <span>{eur(mp.neubau.unter_80m2)}</span>
                  </div>
                  <div className="detail-row">
                    <span>81–129 m²</span>
                    <span>{eur(mp.neubau.von_81_bis_129m2)}</span>
                  </div>
                  <div className="detail-row">
                    <span>&gt; 130 m²</span>
                    <span>{eur(mp.neubau.ueber_130m2)}</span>
                  </div>
                </>
              )}
            </div>
          </details>

          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: 8, padding: "6px 8px", background: "var(--bg)", borderRadius: 6 }}>
            Quelle: immopreise.at / derStandard.at Immobilien. Angebotspreise inkl. BK und USt.
          </div>
        </div>
      )}

      {/* ── Übersicht ── */}
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
          <span className="stat-value">{district.oeffi?.score?.toFixed(1) ?? "–"}</span>
          <span className="stat-label">Öffi-Score</span>
        </div>
      </div>

      {/* ── Rechtsverhältnis ── */}
      <div className="panel-section">
        <h3>Rechtsverhältnis (Personen)</h3>
        <MiniChart
          data={[
            { label: "Hauptmiete", value: rv.hauptmiete, color: "#e74c3c" },
            { label: "Hauseigentum", value: rv.hauseigentum, color: "#2e86c1" },
            { label: "Whg.-Eigentum", value: rv.wohnungseigentum, color: "#3498db" },
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

      {/* ── Gebäude ── */}
      <div className="panel-section">
        <h3>Gebäude</h3>
        <div className="detail-list">
          <div className="detail-row">
            <span>Anzahl erfasst</span>
            <span>{district.gebaeude_anzahl.toLocaleString("de-AT")}</span>
          </div>
        </div>
      </div>

      {/* ── Öffi-Anbindung ── */}
      <div className="panel-section">
        <h3>Öffi-Anbindung</h3>
        <div className="detail-list">
          <div className="detail-row">
            <span>Haltestellen</span>
            <span>{district.oeffi?.haltestellen_anzahl ?? "–"}</span>
          </div>
          <div className="detail-row">
            <span>pro km²</span>
            <span>{district.oeffi?.haltestellen_pro_km2?.toFixed(1) ?? "–"}</span>
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