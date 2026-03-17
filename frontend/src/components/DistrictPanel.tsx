import type { District } from "../types/district";
import { RICHTWERT_WIEN } from "../types/district";
import MiniChart from "./MiniChart";

interface Props {
  district: District;
}

/** Format euro value or show k.A. */
const eur = (val: number | null | undefined) =>
  val != null ? `${val.toFixed(2)} €` : "k.A.";

export default function DistrictPanel({ district }: Props) {

  const mp = district.mietpreise;

  const wst = district.wohnsitztyp;
  const bp = district.bauperioden;

  // Altbau-Anteil berechnen (vor 1961 als Proxy für MRG vor 1.7.1953)
  const bpTotal = bp ? Object.values(bp).reduce((a, b) => a + b, 0) : 0;
  const altbauAnteil = bpTotal > 0
    ? Math.round(((bp.vor_1919 + bp.von_1919_bis_1944 + bp.von_1945_bis_1960) / bpTotal) * 100)
    : 0;

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
          <details style={{ marginTop: 10, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-color, #e0e0e0)" }}>
            <summary style={{
              fontSize: "0.75rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "8px 12px",
              fontWeight: 500,
            }}>
              Preise nach Wohnungsgröße
            </summary>
            <div className="detail-list" style={{ padding: "0 12px 10px" }}>
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

      {/* ── Welcher Mietzins gilt? ── */}
      {wst && (
        <div className="panel-section" style={{ marginBottom: 16 }}>
          <h3>Welcher Mietzins gilt?</h3>

          {/* Wohnsitztyp Chart */}
          <MiniChart
            data={[
              { label: "Gemeindebau", value: wst.gemeindebau, color: "#e74c3c" },
              { label: "Genossenschaft", value: wst.genossenschaft, color: "#f39c12" },
              { label: "Miete (frei)", value: wst.miete_frei, color: "#3498db" },
              { label: "Eigentum", value: wst.eigentum, color: "#2ec184" },
              { label: "Andere", value: wst.andere, color: "#95a5a6" },
            ]}
          />
          <div className="detail-list">
            <div className="detail-row">
              <span>Gemeindebau / öffentl. Wohnbau</span>
              <span>{wst.gemeindebau}%</span>
            </div>
            <div className="detail-row">
              <span>Genossenschaft (gemeinnützig)</span>
              <span>{wst.genossenschaft}%</span>
            </div>
            <div className="detail-row">
              <span>Miete freifinanziert</span>
              <span>{wst.miete_frei}%</span>
            </div>
            <div className="detail-row">
              <span>Eigentum</span>
              <span>{wst.eigentum}%</span>
            </div>
            <div className="detail-row">
              <span>Andere</span>
              <span>{wst.andere}%</span>
            </div>
          </div>

          {/* Mietzins-Einschätzung */}
          <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef9e7", borderRadius: 8, border: "1px solid #f9e79f" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 500, marginBottom: 6 }}>
              Mietzins-Einschätzung
            </div>
            <div style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
              <strong>~{altbauAnteil}%</strong> der Wohnungen sind Altbau (vor 1961)
              → bei privater Miete gilt wahrscheinlich <strong>Richtwertmietzins</strong>
              <br />
              Richtwert Wien: <strong>{RICHTWERT_WIEN.toFixed(2)} €/m²</strong> Basis (+ Zuschläge)
              {mp?.altbau?.durchschnitt != null && (
                <>
                  <br />
                  Tatsächlicher Marktpreis Altbau: <strong style={{ color: "#c0392b" }}>
                    {mp.altbau.durchschnitt.toFixed(2)} €/m²
                  </strong>
                  {" "}({(mp.altbau.durchschnitt / RICHTWERT_WIEN).toFixed(1)}× Richtwert)
                </>
              )}
            </div>
          </div>

          {/* Richtwert vs Marktpreis Vergleich */}
          {mp?.altbau?.durchschnitt != null && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <div style={{ textAlign: "center", padding: "6px", background: "#eafaf1", borderRadius: 6 }}>
                <div style={{ fontSize: "1rem", fontWeight: 500, color: "#1e8449" }}>
                  {RICHTWERT_WIEN.toFixed(2)} €
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  Richtwert (Basis)
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "6px", background: "#fdedec", borderRadius: 6 }}>
                <div style={{ fontSize: "1rem", fontWeight: 500, color: "#c0392b" }}>
                  {mp.altbau.durchschnitt.toFixed(2)} €
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  Marktpreis Altbau
                </div>
              </div>
            </div>
          )}

          {/* Aufklappbare Details zu Mietzinsarten */}
          <details style={{ marginTop: 10, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-color, #e0e0e0)" }}>
            <summary style={{
              fontSize: "0.75rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "8px 12px",
              fontWeight: 500,
            }}>
              Mietzinsarten erklärt
            </summary>
            <div style={{ padding: "0 12px 10px", fontSize: "0.7rem", lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Richtwertmietzins</strong> (Altbau vor 1953, Vertrag ab 1994)
                <br />Basis {RICHTWERT_WIEN.toFixed(2)} €/m² + Zu-/Abschläge (Lage, Ausstattung, Lift…). Eingefroren bis April 2026.
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Kategoriemietzins</strong> (Altbau, Vertrag 1982–1994)
                <br />Kat. A: 4,47 €, B: 3,35 €, C: 2,23 €, D: 1,12 €/m². Ebenfalls eingefroren.
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Angemessener Mietzins</strong> (Neubau ab 1953, freifinanziert)
                <br />Orientiert sich am Markt, theoretisch anfechtbar.
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Gemeindebau</strong> (Wiener Wohnen)
                <br />Richtwert-/Kategoriemiete, Mieten 2024/2025 eingefroren.
              </div>
              <div>
                <strong>Genossenschaft</strong> (WGG)
                <br />Kostenmiete + Erhaltungsbeitrag. Ebenfalls gedeckelt.
              </div>
            </div>
          </details>

          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: 8, padding: "6px 8px", background: "var(--bg)", borderRadius: 6 }}>
            Wohnsitztyp: Anteil der Bevölkerung (nicht Wohnungen). Quelle: MA 23, Stichtag 31.10.2021.
            Mietzins-Werte: MRG/RichtWG, Stand 2025.
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