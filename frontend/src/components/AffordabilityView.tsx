import { useState } from "react";
import type { District } from "../types/district";
import {
  MIETE_DURCHSCHNITT_WIEN,
  gemeindebauGrenze,
} from "../types/district";

interface Props {
  districts: District[];
}

type Praeferenz = "egal" | "altbau" | "neubau";

const BUDGET_QUOTE = 0.3;

const fmtEuro = (v: number) => `${Math.round(v).toLocaleString("de-AT")} €`;

const labelStyle = {
  fontSize: "0.7rem",
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 4,
} as const;

const fieldStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-color, #e0e0e0)",
  fontSize: "0.95rem",
  fontWeight: 500,
  background: "var(--panel-bg, #fff)",
  color: "inherit",
} as const;

export default function AffordabilityView({ districts }: Props) {
  const [einkommen, setEinkommen] = useState<number | "">("");
  const [gehaelter, setGehaelter] = useState<12 | 14>(14);
  const [personen, setPersonen] = useState(1);
  const [flaeche, setFlaeche] = useState(60);
  const [praeferenz, setPraeferenz] = useState<Praeferenz>("egal");

  const einkommenNum = typeof einkommen === "number" ? einkommen : 0;
  const hatEingabe = einkommenNum > 0;

  // Einkommen über 12 Monate gemittelt (14 Gehälter → 14/12 pro Monat)
  const jahresNetto = einkommenNum * gehaelter;
  const monatlichSchnitt = jahresNetto / 12;
  const budget = monatlichSchnitt * BUDGET_QUOTE;
  const budgetProM2 = flaeche > 0 ? budget / flaeche : 0;

  const grenzeJahr = gemeindebauGrenze(personen);
  const gemeindebauBerechtigt = jahresNetto <= grenzeJahr;

  const mw = MIETE_DURCHSCHNITT_WIEN;
  const gemeindebauKosten = (mw.gemeindebau_netto + mw.gemeindebau_bk) * flaeche;
  const genossenschaftKosten = (mw.genossenschaft_netto + mw.genossenschaft_bk) * flaeche;

  // Preis pro Bezirk je nach Präferenz (bei "egal" der günstigere Typ)
  const bezirke = districts
    .map((d) => {
      const alt = d.mietpreise?.altbau?.durchschnitt ?? null;
      const neu = d.mietpreise?.neubau?.durchschnitt ?? null;
      const gesamt = d.mietpreise?.gesamt?.durchschnitt ?? null;
      let preis: number | null;
      if (praeferenz === "altbau") preis = alt ?? gesamt;
      else if (praeferenz === "neubau") preis = neu ?? gesamt;
      else {
        const kandidaten = [alt, neu].filter((v): v is number => v != null);
        preis = kandidaten.length > 0 ? Math.min(...kandidaten) : gesamt;
      }
      return { d, alt, neu, preis, kosten: preis != null ? preis * flaeche : null };
    })
    .filter((b): b is typeof b & { preis: number; kosten: number } => b.preis != null)
    .sort((a, b) => a.preis - b.preis);

  const passend = bezirke.filter((b) => b.kosten <= budget);
  const guenstigster = bezirke[0];

  const ampel = (ok: boolean) => ({
    color: ok ? "#1e8449" : "#c0392b",
    bg: ok ? "#eafaf1" : "#fdedec",
    icon: ok ? "✓" : "✗",
  });

  const segmente = [
    {
      name: "Gemeindebau",
      farbe: "#e74c3c",
      ok: gemeindebauBerechtigt && gemeindebauKosten <= budget,
      detail: !gemeindebauBerechtigt
        ? `Einkommen über der Grenze (${fmtEuro(grenzeJahr)}/Jahr)`
        : `~${fmtEuro(gemeindebauKosten)}/Monat · Anspruch auf Wiener Wohn-Ticket`,
    },
    {
      name: "Genossenschaft",
      farbe: "#f39c12",
      ok: genossenschaftKosten <= budget,
      detail: `~${fmtEuro(genossenschaftKosten)}/Monat (Ø Wien) · zzgl. Finanzierungsbeitrag`,
    },
    {
      name: guenstigster
        ? `Freie Miete – günstigster Bezirk (${guenstigster.d.id}.)`
        : "Freie Miete",
      farbe: "#3498db",
      ok: guenstigster ? guenstigster.kosten <= budget : false,
      detail: guenstigster
        ? `~${fmtEuro(guenstigster.kosten)}/Monat · ${passend.length} von ${bezirke.length} Bezirken im Budget`
        : "Keine Marktdaten verfügbar",
    },
  ];

  return (
    <div>
      {/* ── Eingabe ── */}
      <div
        style={{
          background: "var(--bg)",
          borderRadius: 10,
          padding: "14px",
          marginBottom: 16,
          border: "1px solid var(--border-color, #e0e0e0)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="aff-einkommen">
            Netto-Haushaltseinkommen pro Monat
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              id="aff-einkommen"
              type="number"
              min={0}
              max={50000}
              step={50}
              placeholder="z.B. 2800"
              value={einkommen}
              onChange={(e) => setEinkommen(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>€</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            {([14, 12] as const).map((n) => (
              <button
                key={n}
                onClick={() => setGehaelter(n)}
                style={{
                  padding: "6px",
                  borderRadius: 6,
                  border: gehaelter === n ? "2px solid #2e86c1" : "1px solid var(--border-color, #e0e0e0)",
                  background: gehaelter === n ? "#e8f4fd" : "var(--panel-bg, #fff)",
                  color: gehaelter === n ? "#2e86c1" : "inherit",
                  fontWeight: gehaelter === n ? 600 : 400,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {n}× pro Jahr
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="aff-personen">
            Personen im Haushalt
          </label>
          <select
            id="aff-personen"
            value={personen}
            onChange={(e) => setPersonen(Number(e.target.value))}
            style={{ ...fieldStyle, width: "100%", fontSize: "0.85rem", fontWeight: 400 }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Person" : "Personen"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle} htmlFor="aff-flaeche">
            Gewünschte Wohnfläche
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              id="aff-flaeche"
              type="range"
              min={20}
              max={150}
              step={5}
              value={flaeche}
              onChange={(e) => setFlaeche(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: "0.85rem", fontWeight: 500, minWidth: 48, textAlign: "right" }}>
              {flaeche} m²
            </span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Gebäudetyp (optional)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {(
              [
                { key: "egal", label: "Egal", color: "#2e86c1", bg: "#e8f4fd" },
                { key: "altbau", label: "Altbau", color: "#b7950b", bg: "#fef5e7" },
                { key: "neubau", label: "Neubau", color: "#1e8449", bg: "#eafaf1" },
              ] as const
            ).map((o) => (
              <button
                key={o.key}
                onClick={() => setPraeferenz(o.key)}
                style={{
                  padding: "8px",
                  borderRadius: 6,
                  border: praeferenz === o.key ? `2px solid ${o.color}` : "1px solid var(--border-color, #e0e0e0)",
                  background: praeferenz === o.key ? o.bg : "var(--panel-bg, #fff)",
                  color: praeferenz === o.key ? o.color : "inherit",
                  fontWeight: praeferenz === o.key ? 600 : 400,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hatEingabe && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
          Gib dein Netto-Haushaltseinkommen ein – du siehst, welche Bezirke und Wohnformen in dein Budget passen.
        </div>
      )}

      {hatEingabe && (
        <>
          {/* Budget */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              Empfohlenes Mietbudget (30 % vom Netto)
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "#2e86c1" }}>
              {fmtEuro(budget)}
              <span style={{ fontSize: "0.9rem", fontWeight: 400 }}> /Monat</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              entspricht max. {budgetProM2.toFixed(2)} €/m² brutto bei {flaeche} m²
            </div>
          </div>

          {/* Segmente */}
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
              border: "1px solid var(--border-color, #e0e0e0)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              Was ist realistisch?
            </div>
            {segmente.map((s) => {
              const a = ampel(s.ok);
              return (
                <div key={s.name} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: a.bg,
                      color: a.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                    }}
                    aria-label={s.ok ? "passt" : "passt nicht"}
                  >
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: s.farbe }}>{s.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {s.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gemeindewohnung-Check */}
          <div
            style={{
              background: gemeindebauBerechtigt ? "#eafaf1" : "#fdedec",
              border: `1px solid ${gemeindebauBerechtigt ? "#1e8449" : "#c0392b"}22`,
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: gemeindebauBerechtigt ? "#1e8449" : "#c0392b",
                marginBottom: 4,
              }}
            >
              {gemeindebauBerechtigt ? "Anspruch auf Gemeindewohnung" : "Über der Einkommensgrenze"}
            </div>
            <div style={{ fontSize: "0.72rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              Dein Jahresnetto: {fmtEuro(jahresNetto)} · Grenze für {personen}{" "}
              {personen === 1 ? "Person" : "Personen"}: {fmtEuro(grenzeJahr)} ({fmtEuro(grenzeJahr / 14)} × 14).{" "}
              {gemeindebauBerechtigt
                ? `Du liegst ${fmtEuro(grenzeJahr - jahresNetto)} darunter. Zusätzlich gelten u. a. Hauptwohnsitz in Wien seit 2 Jahren und Staatsbürgerschaft/Aufenthaltstitel.`
                : `Du liegst ${fmtEuro(jahresNetto - grenzeJahr)} darüber.`}
            </div>
          </div>

          {/* Bezirke */}
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
              border: "1px solid var(--border-color, #e0e0e0)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              {passend.length > 0
                ? `${passend.length} Bezirke im Budget (${flaeche} m², freie Miete)`
                : `Kein Bezirk im Budget für ${flaeche} m²`}
            </div>

            {passend.length === 0 && guenstigster && (
              <div style={{ fontSize: "0.72rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Der günstigste Bezirk ({guenstigster.d.id}. {guenstigster.d.name}) kostet ~{fmtEuro(guenstigster.kosten)}
                /Monat – {fmtEuro(guenstigster.kosten - budget)} über deinem Budget. Eine kleinere Wohnfläche oder
                Gemeindebau/Genossenschaft können helfen.
              </div>
            )}

            {passend.map((b) => (
              <div
                key={b.d.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-color, #e8e8e8)",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    {b.d.id}. {b.d.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#b7950b" }}>Altbau {b.alt != null ? `${b.alt.toFixed(1)} €` : "k.A."}</span>
                    {" · "}
                    <span style={{ color: "#1e8449" }}>Neubau {b.neu != null ? `${b.neu.toFixed(1)} €` : "k.A."}</span>
                    {" /m²"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{fmtEuro(b.kosten)}</div>
                  <div style={{ fontSize: "0.62rem", color: "#1e8449" }}>
                    {fmtEuro(budget - b.kosten)} übrig
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.55rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 4px" }}>
            Einkommensgrenzen: Wohnberatung Wien 2026. Marktpreise: immopreise.at (Angebotspreise, brutto). Gemeindebau/Genossenschaft: Wien-weite Ø.
            Die 30-%-Regel ist eine Faustformel, keine Finanz- oder Rechtsberatung.
          </div>
        </>
      )}
    </div>
  );
}
