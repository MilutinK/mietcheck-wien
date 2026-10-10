import { Circle, CircleMarker, Pane } from "react-leaflet";
import type { StandortErgebnis } from "../hooks/useStandort";

interface Props {
  ergebnis: StandortErgebnis;
  dark: boolean;
}

/** Zeichnet Radius, gewählten Punkt sowie Haltestellen und Gemeindebauten im Umkreis. */
export default function StandortLayer({ ergebnis, dark }: Props) {
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
      {ergebnis.oeffi.treffer.map((h, i) => (
        <CircleMarker
          key={`h${i}`}
          center={[h.lat, h.lon]}
          radius={4}
          interactive={false}
          pathOptions={{ color: ring, weight: 1, fillColor: dark ? "#6db3e3" : "#2e86c1", fillOpacity: 1 }}
        />
      ))}
      {ergebnis.gemeindebau.treffer.map((a, i) => (
        <CircleMarker
          key={`g${i}`}
          center={[a.lat, a.lon]}
          radius={a.wohnungen ? Math.min(9, 3 + Math.sqrt(a.wohnungen) / 10) : 3}
          interactive={false}
          pathOptions={{ color: ring, weight: 1.5, fillColor: "#e74c3c", fillOpacity: 0.95 }}
        />
      ))}
      <CircleMarker
        center={center}
        radius={8}
        interactive={false}
        pathOptions={{ color: ring, weight: 3, fillColor: dark ? "#ef6a4a" : "#d9482b", fillOpacity: 1 }}
      />
    </Pane>
  );
}