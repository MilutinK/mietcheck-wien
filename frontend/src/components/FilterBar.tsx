import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { MetricKey } from "../types/district";
import { METRIC_LABELS } from "../types/district";

interface Props {
    metric: MetricKey;
    onChange: (metric: MetricKey) => void;
}

const GRUPPEN: { name: string; keys: MetricKey[] }[] = [
    { name: "Mietpreise", keys: ["bruttomiete_m2", "miete_altbau", "miete_neubau"] },
    { name: "Wohnformen", keys: ["anteil_gemeindebau", "anteil_genossenschaft", "anteil_miete_frei", "anteil_miete"] },
    { name: "Bevölkerung und Gebäude", keys: ["einwohner_pro_km2", "wohnungen_gesamt", "gebaeude_anzahl", "anteil_altbau"] },
    { name: "Verkehr", keys: ["oeffi_score"] },
];

const ALLE: MetricKey[] = GRUPPEN.flatMap((g) => g.keys);

/**
 * Auswahl der Kennzahl für die Kartenfärbung. Eigene Liste statt <select>, weil sich die
 * Optionsliste eines nativen Selects nicht gestalten lässt (im Dunkelmodus unlesbar).
 * Folgt dem ARIA-Muster "Combobox mit Listbox": Fokus bleibt am Button, aria-activedescendant
 * zeigt auf den aktiven Eintrag.
 */
export default function FilterBar({ metric, onChange }: Props) {
    const [offen, setOffen] = useState(false);
    const [aktiv, setAktiv] = useState(0);
    const wurzel = useRef<HTMLDivElement>(null);
    const id = useId();
    const labelId = `${id}-label`;
    const listeId = `${id}-liste`;
    const optionId = (key: MetricKey) => `${id}-opt-${key}`;

    // Klick außerhalb schließt die Liste
    useEffect(() => {
        if (!offen) return;
        const schliessen = (e: MouseEvent) => {
            if (wurzel.current && !wurzel.current.contains(e.target as Node)) setOffen(false);
        };
        document.addEventListener("mousedown", schliessen);
        return () => document.removeEventListener("mousedown", schliessen);
    }, [offen]);

    // Aktiven Eintrag im Sichtbereich halten
    useEffect(() => {
        if (!offen) return;
        document.getElementById(`${id}-opt-${ALLE[aktiv]}`)?.scrollIntoView({ block: "nearest" });
    }, [offen, aktiv, id]);

    const oeffnen = () => {
        setAktiv(Math.max(0, ALLE.indexOf(metric)));
        setOffen(true);
    };

    const waehlen = (key: MetricKey) => {
        onChange(key);
        setOffen(false);
    };

    const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (!offen) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                e.preventDefault();
                oeffnen();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setAktiv((a) => Math.min(ALLE.length - 1, a + 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setAktiv((a) => Math.max(0, a - 1));
                break;
            case "Home":
                e.preventDefault();
                setAktiv(0);
                break;
            case "End":
                e.preventDefault();
                setAktiv(ALLE.length - 1);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                waehlen(ALLE[aktiv]);
                break;
            case "Escape":
                e.preventDefault();
                setOffen(false);
                break;
            case "Tab":
                setOffen(false);
                break;
        }
    };

    return (
        <div className="filter-bar" ref={wurzel}>
            <span className="filter-label" id={labelId}>
                Karte einfärben nach:
            </span>
            <div className="metric-select">
                <button
                    type="button"
                    role="combobox"
                    className="metric-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={offen}
                    aria-controls={listeId}
                    aria-labelledby={`${labelId} ${id}-wert`}
                    aria-activedescendant={offen ? optionId(ALLE[aktiv]) : undefined}
                    onClick={() => (offen ? setOffen(false) : oeffnen())}
                    onKeyDown={onKey}
                >
                    <span id={`${id}-wert`} className="metric-wert">
                        {METRIC_LABELS[metric]}
                    </span>
                    <svg className="metric-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M3 5.5 7 9.5 11 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {offen && (
                    <ul className="metric-popup" role="listbox" id={listeId} aria-labelledby={labelId}>
                        {GRUPPEN.map((g) => (
                            <li key={g.name} role="presentation">
                                <div className="metric-gruppe" id={`${id}-g-${g.name}`} role="presentation">
                                    {g.name}
                                </div>
                                <ul role="group" aria-labelledby={`${id}-g-${g.name}`} className="metric-gruppe-liste">
                                    {g.keys.map((key) => {
                                        const gewaehlt = key === metric;
                                        const istAktiv = ALLE[aktiv] === key;
                                        return (
                                            <li
                                                key={key}
                                                id={optionId(key)}
                                                role="option"
                                                aria-selected={gewaehlt}
                                                className={`metric-option${istAktiv ? " is-aktiv" : ""}${gewaehlt ? " is-gewaehlt" : ""}`}
                                                onMouseEnter={() => setAktiv(ALLE.indexOf(key))}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => waehlen(key)}
                                            >
                                                <span>{METRIC_LABELS[key]}</span>
                                                {gewaehlt && (
                                                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                                                        <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
