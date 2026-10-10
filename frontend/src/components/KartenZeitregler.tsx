import { useEffect, useState } from "react";
import { monatsname } from "../utils/verlauf";
import Slider from "./Slider";

interface Props {
    monate: string[];
    erster: number;
    letzter: number;
    /** null = Zeitreise aus (aktuelle Daten) */
    index: number | null;
    /** Name der gefärbten Kennzahl, z. B. "Miete Altbau €/m²" */
    label: string;
    onChange: (index: number | null) => void;
}

const SCHRITT_MS = 140;

/** Regler für die Kartenfärbung nach Monat (Zeitreise): Abspielen, Monat wählen, zurück zu "heute". */
export default function KartenZeitregler({ monate, erster, letzter, index, label, onChange }: Props) {
    const [spielt, setSpielt] = useState(false);

    // Läuft nur, solange noch Monate übrig sind: am Ende hält das Abspielen von selbst an
    const laeuft = spielt && index !== null && index < letzter;

    // Abspielen: ein Monat pro Schritt
    useEffect(() => {
        if (!laeuft || index === null) return;
        const t = window.setTimeout(() => onChange(index + 1), SCHRITT_MS);
        return () => window.clearTimeout(t);
    }, [laeuft, index, onChange]);

    if (index === null) {
        return (
            <button className="map-zeit-start" onClick={() => onChange(letzter)} aria-label="Zeitreise starten: Karte nach Monat einfärben">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7 3.8V7l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Zeitreise
            </button>
        );
    }

    const play = () => {
        if (laeuft) {
            setSpielt(false);
            return;
        }
        if (index >= letzter) onChange(erster); // am Ende: von vorn beginnen
        setSpielt(true);
    };

    return (
        <div className="map-zeit" role="group" aria-label="Zeitreise: Mietpreise nach Monat">
            <div className="map-zeit-kopf">
                <strong>{monatsname(monate[index])}</strong>
                <span className="map-zeit-hinweis">{label}, 12-Monats-Median, feste Skala</span>
                <button
                    className="map-zeit-zu"
                    onClick={() => {
                        setSpielt(false);
                        onChange(null);
                    }}
                    aria-label="Zeitreise beenden, aktuelle Daten zeigen"
                >
                    Heute
                </button>
            </div>
            <div className="map-zeit-regler">
                <button className="map-zeit-play" onClick={play} aria-label={laeuft ? "Pause" : "Abspielen"}>
                    {laeuft ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                            <rect x="3" y="2" width="3" height="10" rx="1" fill="currentColor" />
                            <rect x="8" y="2" width="3" height="10" rx="1" fill="currentColor" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                            <path d="M4 2.2v9.6L12 7z" fill="currentColor" />
                        </svg>
                    )}
                </button>
                <Slider
                    min={erster}
                    max={letzter}
                    step={1}
                    value={index}
                    onChange={(v) => {
                        setSpielt(false);
                        onChange(v);
                    }}
                    ariaLabel="Monat wählen"
                />
            </div>
            <div className="map-zeit-achse" aria-hidden="true">
                <span>{monate[erster].slice(0, 4)}</span>
                <span>{monate[letzter].slice(0, 4)}</span>
            </div>
        </div>
    );
}
