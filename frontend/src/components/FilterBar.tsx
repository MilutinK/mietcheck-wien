import type { MetricKey } from "../types/district";
import { METRIC_LABELS } from "../types/district";
import Dropdown, { type DropdownOption } from "./Dropdown";

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

// Reihenfolge = Reihenfolge der Gruppen, damit Tastatur und Anzeige übereinstimmen
const OPTIONEN: DropdownOption<MetricKey>[] = GRUPPEN.flatMap((g) =>
    g.keys.map((key) => ({ value: key, label: METRIC_LABELS[key], group: g.name }))
);

/** Auswahl der Kennzahl für die Kartenfärbung (gruppierte Liste). */
export default function FilterBar({ metric, onChange }: Props) {
    return (
        <div className="filter-bar">
            <span className="filter-label" id="filter-label">
                Karte einfärben nach:
            </span>
            <Dropdown options={OPTIONEN} value={metric} onChange={onChange} ariaLabelledBy="filter-label" />
        </div>
    );
}