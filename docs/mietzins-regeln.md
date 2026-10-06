# Mietzins-Check: Regeltabelle (Entwurf zur fachlichen Prüfung)

Grundlage für `frontend/src/utils/mietrecht.ts`. Die Regeln sind bewusst vereinfacht und **keine Rechtsberatung**.
Mit **(prüfen)** markierte Punkte sollten vor einer Veröffentlichung fachlich bestätigt werden.

## Entscheidungsreihenfolge

| Schritt | Frage | Antwort | Anwendungsbereich | Mietzinsart |
|--------:|-------|---------|-------------------|-------------|
| 1 | Wem gehört die Wohnung? | Stadt Wien (Gemeindewohnung) | Gemeindewohnung | eigene Mietzinsbildung (nur Info) |
| 1 | | Gemeinnützige Bauvereinigung (Genossenschaft) | WGG | Kostendeckung |
| 2 | Gebäude mit höchstens zwei selbständigen Wohnungen? | ja | Teilanwendung | frei **(prüfen: Teilanwendung oder Vollausnahme?)** |
| 3 | Baubewilligung nach 30.6.1953 oder Dachgeschossausbau/Aufstockung? | ja, mit öffentlicher Förderung | Teilanwendung | nach Förderbedingungen |
| 3 | | ja, ohne Förderung | Teilanwendung | frei („angemessen“) **(prüfen: Stichtag für Dachgeschossausbau)** |
| 3 | | ja, Förderung unbekannt | unklar | offene Frage |
| 4 | Baubewilligung bis 30.6.1953 in Mehrparteienhaus? | ja | Vollanwendung | siehe Schritt 5 |
| 5 | Ausstattungskategorie unbekannt? | ja | Vollanwendung | unklar, offene Frage |
| 5 | Kategorie C oder D **oder** Vertrag vor 1.3.1994? | ja | Vollanwendung | Kategoriemietzins **(prüfen: Kat. C/D auch bei Neuverträgen? Alter Hauptmietzins bei Altverträgen)** |
| 5 | Kategorie A/B, ab 1.3.1994, Nutzfläche über 130 m² | ja | Vollanwendung | angemessener Mietzins **(prüfen)** |
| 5 | Kategorie A/B, ab 1.3.1994, höchstens 130 m² | ja | Vollanwendung | Richtwertmietzins mit Zu- und Abschlägen |

## Rechengrößen (Wien)

| Größe | Wert | Quelle im Code |
|-------|------|----------------|
| Richtwert | 6,74 €/m² (ab April 2026) | `RICHTWERT_WIEN` in `types/district.ts` |
| Kategoriemietzins A | 4,51 €/m² | `KATEGORIEMIETZINS.A` |
| Kategoriemietzins B | 3,38 €/m² | `KATEGORIEMIETZINS.B` |
| Kategoriemietzins C und D brauchbar | 2,25 €/m² | `KATEGORIEMIETZINS.C`, `.D_brauchbar` |
| Kategoriemietzins D unbrauchbar | 1,13 €/m² | `KATEGORIEMIETZINS.D_unbrauchbar` |
| Befristungsabschlag | 25 % **(prüfen: Voraussetzungen)** | `BEFRISTUNGSABSCHLAG` |
| Grenze „große Wohnung“ | 130 m² Nutzfläche **(prüfen)** | `GROSSE_WOHNUNG_M2` |

Die Basiswerte enthalten **keine** Zuschläge (z. B. Lage, Ausstattung) und keine sonstigen Abschläge.
Das Ergebnis zeigt deshalb nur den Ausgangswert, keine verbindliche Obergrenze.

## Bewusst nicht abgebildet

- Höhe von Lagezuschlag und weiteren Zu-/Abschlägen
- Teilförderungen, Mischfälle und Sonderregeln für Altverträge
- Unterscheidung 1945 bis 1953 (derzeit gilt nur der Stichtag 30.6.1953) **(prüfen: nötig?)**
- Betriebskosten und Umsatzsteuer

## Fragen für die fachliche Abstimmung

1. Sind die Stichtage (30.6.1953, 1.3.1994) und die Zuordnung der Ein-/Zweifamilienhäuser richtig?
2. Gilt der Kategoriemietzins bei Kat. C/D auch für Neuverträge?
3. Ab wann und für welche Kategorien gilt die 130-m²-Regel?
4. Wie sollen Lagezuschlag und Befristungsabschlag im Rechner vereinfacht werden?
5. Welche Fälle sollen nur als Hinweis ohne Zahl erscheinen?
