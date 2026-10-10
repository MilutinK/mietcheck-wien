import type { FaktorId } from "../types/standorte";

export interface FaktorDef {
  id: FaktorId;
  gruppe: string;
  label: string;
  /** Farbe für Punkte, Balken und Punkt-Symbol (hell / dunkel) */
  farbe: { hell: string; dunkel: string };
  /** Was verglichen wird: Anzahl der Orte oder Summe der Gewichte (m², Wohnungen) */
  messwert: "anzahl" | "gewicht";
  /** Prozentrang zeigen? Bei sehr seltenen Orten (Märkte) wäre er irreführend */
  zeigeRang: boolean;
  /** Auf der Karte vorausgewählt */
  standardAufKarte: boolean;
  naechsteLabel: string;
  /** Text für die Zählung im Umkreis */
  beschreibe: (anzahl: number, summe: number) => string;
}

const zahl = (n: number) => n.toLocaleString("de-AT");
const ha = (m2: number) => `${(m2 / 10000).toLocaleString("de-AT", { maximumFractionDigits: 1 })} ha`;

export const FAKTOREN: FaktorDef[] = [
  {
    id: "oeffi",
    gruppe: "Mobilität",
    label: "Öffentlicher Verkehr",
    farbe: { hell: "#2e86c1", dunkel: "#6db3e3" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: true,
    naechsteLabel: "Nächste Haltestelle",
    beschreibe: (n) => (n === 0 ? "keine Haltestelle" : `${zahl(n)} ${n === 1 ? "Haltestelle" : "Haltestellen"}`),
  },
  {
    id: "gruen",
    gruppe: "Grün und Freizeit",
    label: "Parks und Grünflächen",
    farbe: { hell: "#1e8449", dunkel: "#4fc08a" },
    messwert: "gewicht",
    zeigeRang: true,
    standardAufKarte: true,
    naechsteLabel: "Nächster Park",
    beschreibe: (n, summe) => (n === 0 ? "keine Parkanlage" : `${zahl(n)} ${n === 1 ? "Park" : "Parks"} mit ${ha(summe)}`),
  },
  {
    id: "spielplatz",
    gruppe: "Grün und Freizeit",
    label: "Spielplätze",
    farbe: { hell: "#16a085", dunkel: "#48c9b0" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: false,
    naechsteLabel: "Nächster Spielplatz",
    beschreibe: (n) => (n === 0 ? "kein Spielplatz" : `${zahl(n)} ${n === 1 ? "Spielplatz" : "Spielplätze"}`),
  },
  {
    id: "kindergarten",
    gruppe: "Familie und Bildung",
    label: "Kindergärten und Kindergruppen",
    farbe: { hell: "#e67e22", dunkel: "#f0a35e" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: false,
    naechsteLabel: "Nächster Kindergarten",
    beschreibe: (n) => (n === 0 ? "kein Kindergarten" : `${zahl(n)} ${n === 1 ? "Einrichtung" : "Einrichtungen"}`),
  },
  {
    id: "schule",
    gruppe: "Familie und Bildung",
    label: "Schulen",
    farbe: { hell: "#b7950b", dunkel: "#e0b84a" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: false,
    naechsteLabel: "Nächste Schule",
    beschreibe: (n) => (n === 0 ? "keine Schule" : `${zahl(n)} ${n === 1 ? "Schule" : "Schulen"}`),
  },
  {
    id: "hausarzt",
    gruppe: "Gesundheit und Alltag",
    label: "Hausärzte",
    farbe: { hell: "#c2185b", dunkel: "#f06292" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: false,
    naechsteLabel: "Nächste Praxis",
    beschreibe: (n) => (n === 0 ? "keine Praxis" : `${zahl(n)} ${n === 1 ? "Praxis" : "Praxen"} für Allgemeinmedizin`),
  },
  {
    id: "apotheke",
    gruppe: "Gesundheit und Alltag",
    label: "Apotheken",
    farbe: { hell: "#00838f", dunkel: "#4dd0e1" },
    messwert: "anzahl",
    zeigeRang: true,
    standardAufKarte: false,
    naechsteLabel: "Nächste Apotheke",
    beschreibe: (n) => (n === 0 ? "keine Apotheke" : `${zahl(n)} ${n === 1 ? "Apotheke" : "Apotheken"}`),
  },
  {
    id: "markt",
    gruppe: "Gesundheit und Alltag",
    label: "Märkte",
    farbe: { hell: "#8d6e63", dunkel: "#bcaaa4" },
    messwert: "anzahl",
    zeigeRang: false,
    standardAufKarte: false,
    naechsteLabel: "Nächster Markt",
    beschreibe: (n) => (n === 0 ? "kein Markt" : `${zahl(n)} ${n === 1 ? "Markt" : "Märkte"}`),
  },
  {
    id: "gemeindebau",
    gruppe: "Wohnen",
    label: "Gemeindebau",
    farbe: { hell: "#e74c3c", dunkel: "#e74c3c" },
    messwert: "gewicht",
    zeigeRang: true,
    standardAufKarte: true,
    naechsteLabel: "Nächste Anlage",
    beschreibe: (n, summe) =>
      n === 0 ? "keine Anlage" : `${zahl(n)} ${n === 1 ? "Anlage" : "Anlagen"} mit ${zahl(summe)} Wohnungen`,
  },
];

export const FAKTOR_IDS = FAKTOREN.map((f) => f.id);
export const STANDARD_AUF_KARTE: FaktorId[] = FAKTOREN.filter((f) => f.standardAufKarte).map((f) => f.id);