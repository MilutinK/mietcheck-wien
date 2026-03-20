import { useState } from "react";
import type { District } from "../types/district";
import { RICHTWERT_WIEN, MIETE_DURCHSCHNITT_WIEN } from "../types/district";

interface Props {
  districtA: District | null;
  districtB: District | null;
}

export default function CompareView({ districtA, districtB }: Props) {
  const [flaeche, setFlaeche] = useState(70);

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
          <strong>{chosen?.name}</strong> gewählt – jetzt den zweiten Bezirk
          anklicken
        </p>
      </div>
    );
  }

  const mw = MIETE_DURCHSCHNITT_WIEN;
  const gemeindebauBrutto = mw.gemeindebau_netto + mw.gemeindebau_bk;
  const genossenschaftBrutto = mw.genossenschaft_netto + mw.genossenschaft_bk;
  const wstA = districtA.wohnsitztyp;
  const wstB = districtB.wohnsitztyp;

  const altA = districtA.mietpreise?.altbau?.durchschnitt;
  const altB = districtB.mietpreise?.altbau?.durchschnitt;
  const neuA = districtA.mietpreise?.neubau?.durchschnitt;
  const neuB = districtB.mietpreise?.neubau?.durchschnitt;
  const gesA = districtA.mietpreise?.gesamt?.durchschnitt;
  const gesB = districtB.mietpreise?.gesamt?.durchschnitt;

  /** Colored badge for winner */
  const winBadge = (valA: number | null | undefined, valB: number | null | undefined, lowerWins = true) => {
    if (valA == null || valB == null || valA === valB) return { a: "", b: "" };
    const aWins = lowerWins ? valA < valB : valA > valB;
    return {
      a: aWins ? "compare-winner" : "",
      b: aWins ? "" : "compare-winner",
    };
  };

  /** Visual percentage bar */
  const PctBar = ({ valueA, valueB, color, label }: { valueA: number; valueB: number; color: string; label: string }) => {
    const max = Math.max(valueA, valueB, 1);
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, minWidth: 32, textAlign: "right" }}>{valueA}%</span>
            <div style={{ width: `${(valueA / max) * 100}%`, minWidth: 2, height: 14, background: color, borderRadius: 3, opacity: 0.8, transition: "width 0.3s ease" }} />
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border-color, #e0e0e0)" }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: `${(valueB / max) * 100}%`, minWidth: 2, height: 14, background: color, borderRadius: 3, opacity: 0.6, transition: "width 0.3s ease" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 500, minWidth: 32 }}>{valueB}%</span>
          </div>
        </div>
      </div>
    );
  };

  /** Simple compare row */
  const Row = ({ label, valA, valB, winnerA }: { label: string; valA: string; valB: string; winnerA?: boolean | null }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "1px solid var(--border-color, #f0f0f0)",
      fontSize: "0.75rem",
    }}>
      <span style={{
        flex: 1,
        textAlign: "right",
        paddingRight: 8,
        fontWeight: winnerA === true ? 600 : 400,
        color: winnerA === true ? "#1e8449" : "inherit",
      }}>{valA}</span>
      <span style={{
        fontSize: "0.65rem",
        color: "var(--text-secondary)",
        minWidth: 90,
        textAlign: "center",
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        flex: 1,
        paddingLeft: 8,
        fontWeight: winnerA === false ? 600 : 400,
        color: winnerA === false ? "#1e8449" : "inherit",
      }}>{valB}</span>
    </div>
  );

  /** Section header */
  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{
      fontSize: "0.65rem",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "var(--text-secondary)",
      padding: "12px 0 6px",
      borderBottom: "2px solid var(--border-color, #e0e0e0)",
      marginBottom: 4,
    }}>{title}</div>
  );

  return (
    <div className="compare-view">
      {/* ── Header ── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#2e86c1" }}>
          {districtA.name}
        </span>
        <span style={{
          fontSize: "0.7rem",
          color: "var(--text-secondary)",
          background: "var(--bg)",
          padding: "2px 10px",
          borderRadius: 12,
        }}>vs</span>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#2e86c1" }}>
          {districtB.name}
        </span>
      </div>

      {/* ── m²-Slider ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        padding: "8px 12px",
        background: "var(--bg)",
        borderRadius: 8,
        border: "1px solid var(--border-color, #e0e0e0)",
      }}>
        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Wohnfläche
        </label>
        <input
          type="range"
          min={20}
          max={150}
          step={5}
          value={flaeche}
          onChange={(e) => setFlaeche(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <input
            type="number"
            min={10}
            max={300}
            value={flaeche}
            onChange={(e) => setFlaeche(Number(e.target.value) || 70)}
            style={{
              width: 48,
              textAlign: "right",
              fontSize: "0.85rem",
              fontWeight: 500,
              border: "1px solid var(--border-color, #e0e0e0)",
              borderRadius: 4,
              padding: "2px 4px",
              background: "transparent",
              color: "inherit",
            }}
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>m²</span>
        </div>
      </div>

      {/* ── Mietkosten Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
        {/* Altbau */}
        <div style={{ background: "#fef5e7", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#b7950b", marginBottom: 4, fontWeight: 500 }}>Altbau {flaeche} m²</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#b7950b" }}>
            {altA != null ? `${(altA * flaeche).toFixed(0)}` : "–"}
            <span style={{ fontSize: "0.7rem", fontWeight: 400 }}> vs </span>
            {altB != null ? `${(altB * flaeche).toFixed(0)}` : "–"}
            <span style={{ fontSize: "0.7rem" }}> €</span>
          </div>
        </div>
        {/* Neubau */}
        <div style={{ background: "#eafaf1", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#1e8449", marginBottom: 4, fontWeight: 500 }}>Neubau {flaeche} m²</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e8449" }}>
            {neuA != null ? `${(neuA * flaeche).toFixed(0)}` : "–"}
            <span style={{ fontSize: "0.7rem", fontWeight: 400 }}> vs </span>
            {neuB != null ? `${(neuB * flaeche).toFixed(0)}` : "–"}
            <span style={{ fontSize: "0.7rem" }}> €</span>
          </div>
        </div>
      </div>

      {/* Gemeindebau / Genossenschaft / Richtwert */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{(gemeindebauBrutto * flaeche).toFixed(0)} €</div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>Gemeindebau</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{(genossenschaftBrutto * flaeche).toFixed(0)} €</div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>Genossenschaft</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{(RICHTWERT_WIEN * flaeche).toFixed(0)} €</div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>Richtwert</div>
        </div>
      </div>

      {/* ── Preise pro m² ── */}
      <SectionHeader title="Mietpreise pro m²" />
      <Row label="Altbau" valA={altA != null ? `${altA.toFixed(2)} €` : "–"} valB={altB != null ? `${altB.toFixed(2)} €` : "–"} winnerA={altA != null && altB != null ? (altA < altB ? true : altA > altB ? false : null) : null} />
      <Row label="Neubau" valA={neuA != null ? `${neuA.toFixed(2)} €` : "–"} valB={neuB != null ? `${neuB.toFixed(2)} €` : "–"} winnerA={neuA != null && neuB != null ? (neuA < neuB ? true : neuA > neuB ? false : null) : null} />
      <Row label="Ø Gesamt" valA={gesA != null ? `${gesA.toFixed(2)} €` : "–"} valB={gesB != null ? `${gesB.toFixed(2)} €` : "–"} winnerA={gesA != null && gesB != null ? (gesA < gesB ? true : gesA > gesB ? false : null) : null} />

      {/* ── Wohnsitztyp ── */}
      {wstA && wstB && (
        <>
          <SectionHeader title="Wohnsitztyp (Bevölkerung)" />
          <PctBar valueA={wstA.gemeindebau} valueB={wstB.gemeindebau} color="#e74c3c" label="Gemeindebau" />
          <PctBar valueA={wstA.genossenschaft} valueB={wstB.genossenschaft} color="#f39c12" label="Genossenschaft" />
          <PctBar valueA={wstA.miete_frei} valueB={wstB.miete_frei} color="#3498db" label="Miete (frei)" />
          <PctBar valueA={wstA.eigentum} valueB={wstB.eigentum} color="#2ec184" label="Eigentum" />
        </>
      )}

      {/* ── Bezirksdaten ── */}
      <SectionHeader title="Bezirksdaten" />
      <Row label="Einwohner" valA={districtA.bevoelkerung.toLocaleString("de-AT")} valB={districtB.bevoelkerung.toLocaleString("de-AT")} />
      <Row label="Wohnungen" valA={districtA.wohnungen_gesamt.toLocaleString("de-AT")} valB={districtB.wohnungen_gesamt.toLocaleString("de-AT")} />
      <Row label="Einwohner/km²" valA={districtA.einwohner_pro_km2.toLocaleString("de-AT")} valB={districtB.einwohner_pro_km2.toLocaleString("de-AT")} />
      <Row label="Fläche" valA={`${districtA.flaeche_km2} km²`} valB={`${districtB.flaeche_km2} km²`} />
      <Row
        label="Öffi-Score"
        valA={districtA.oeffi.score.toFixed(1)}
        valB={districtB.oeffi.score.toFixed(1)}
        winnerA={districtA.oeffi.score > districtB.oeffi.score ? true : districtA.oeffi.score < districtB.oeffi.score ? false : null}
      />
      <Row label="Haltestellen" valA={districtA.oeffi.haltestellen_anzahl.toString()} valB={districtB.oeffi.haltestellen_anzahl.toString()} />
      <Row label="Gebäude" valA={districtA.gebaeude_anzahl.toLocaleString("de-AT")} valB={districtB.gebaeude_anzahl.toLocaleString("de-AT")} />

      {/* ── Quellen ── */}
      <div style={{ fontSize: "0.55rem", color: "var(--text-secondary)", marginTop: 12, lineHeight: 1.5 }}>
        Mietpreise: immopreise.at. Gemeindebau/Genossenschaft: Wien-weite Ø (Mikrozensus 2023).
        Wohnsitztyp: MA 23, Stichtag 31.10.2021. Richtwert: {RICHTWERT_WIEN.toFixed(2)} €/m² (MRG, Stand 2025).
      </div>
    </div>
  );
}