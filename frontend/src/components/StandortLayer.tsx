import { Circle, CircleMarker, Pane } from "react-leaflet";
import type { StandortErgebnis } from "../hooks/useStandort";
import { FAKTOREN } from "../utils/faktoren";
import type { FaktorId } from "../types/standorte";

interface Props {
  ergebnis: StandortErgebnis;
  /** Faktoren, deren Orte auf der Karte gezeigt werden */
  sichtbar: FaktorId[];
  dark: boolean;
}

/** Zeichnet Radius, gewählten Punkt und die Orte der ausgewählten Faktoren im Umkreis. */
export default function StandortLayer({ ergebnis, sichtbar, dark }: Props) {
  const ink = dark ? "#ece9e2" : "#16181d";
  const ring = dark ? "#1a1d22" : "#f3eee4";
  const center: [number, number] = [ergebnis.punkt.lat, ergebnis.punkt.lon];

  return (
    <Pane name="standort" style={{ zIndex: 470 }}>
      <Circle
        center={center}
        radius={ergebnis.radiusM}
        interactive={false}
        pathOptions={{ color: ink, weight: 2, dashArray: "6 6", fillColor: ink, fillOpacity: 0.07 }}
      />
      {FAKTOREN.filter((f) => sichtbar.includes(f.id)).flatMap((def) => {
        const faktor = ergebnis.faktoren.find((f) => f.id === def.id);
        if (!faktor) return [];
        const farbe = dark ? def.farbe.dunkel : def.farbe.hell;
        return faktor.treffer.map((p, i) => (
          <CircleMarker
            key={`${def.id}-${i}`}
            center={[p.lat, p.lon]}
            radius={def.id === "gemeindebau" && p.gewicht ? Math.min(9, 3 + Math.sqrt(p.gewicht) / 10) : 4}
            interactive={false}
            pathOptions={{ color: ring, weight: 1.2, fillColor: farbe, fillOpacity: 0.95 }}
          />
        ));
      })}
      <CircleMarker
        center={center}
        radius={8}
        interactive={false}
        pathOptions={{ color: ring, weight: 3, fillColor: dark ? "#ef6a4a" : "#d9482b", fillOpacity: 1 }}
      />
    </Pane>
  );
}