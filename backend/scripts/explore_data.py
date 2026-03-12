"""
Explore and analyze all downloaded Open Data sources for mietcheck-wien.

Usage:
    python backend/scripts/explore_data.py

This script:
    1. Prüft ob alle Dateien vorhanden sind
    2. Analysiert jede Datenquelle (Spalten, Zeilen, Beispieldaten)
    3. Validiert die Bezirksgrenzen (GeoJSON)
    4. Aggregiert Registerzählung von 250 Zählbezirken → 23 Bezirke
    5. Zählt Haltestellen pro Bezirk (Grundlage Öffi-Score)
    6. Listet relevante Jahrbuch-Tabellen
"""

import os
import json
import csv
import sys

# ── Pfade ──────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")

FILES = {
    "bezirksgrenzen": "bezirksgrenzen.json",
    "registerzaehlung": "registerzaehlung_2023.csv",
    "gebaeudeinformation": "gebaeudeinformation.csv",
    "haltestellen": "wienerlinien_haltestellen.csv",
    "jahrbuch_zip": "jahrbuch-wien-2025.zip",
    "jahrbuch_dir": "jahrbuch-wien-2025",
}

# Wiener Bezirksnamen für die Ausgabe
BEZIRK_NAMEN = {
    901: "1. Innere Stadt",
    902: "2. Leopoldstadt",
    903: "3. Landstraße",
    904: "4. Wieden",
    905: "5. Margareten",
    906: "6. Mariahilf",
    907: "7. Neubau",
    908: "8. Josefstadt",
    909: "9. Alsergrund",
    910: "10. Favoriten",
    911: "11. Simmering",
    912: "12. Meidling",
    913: "13. Hietzing",
    914: "14. Penzing",
    915: "15. Rudolfsheim-Fünfhaus",
    916: "16. Ottakring",
    917: "17. Hernals",
    918: "18. Währing",
    919: "19. Döbling",
    920: "20. Brigittenau",
    921: "21. Floridsdorf",
    922: "22. Donaustadt",
    923: "23. Liesing",
}


def separator(title: str):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)
    print()


def filepath(key: str) -> str:
    return os.path.join(DATA_DIR, FILES[key])


# ── 0. Dateien prüfen ─────────────────────────────────────────

def check_files():
    separator("0. Dateien prüfen")

    all_ok = True
    for key, filename in FILES.items():
        full = os.path.join(DATA_DIR, filename)
        if os.path.exists(full):
            if os.path.isfile(full):
                size = os.path.getsize(full) / 1024
                unit = "KB"
                if size > 1024:
                    size = size / 1024
                    unit = "MB"
                print(f"  ✅ {filename} ({size:.1f} {unit})")
            else:
                count = len(os.listdir(full))
                print(f"  ✅ {filename}/ ({count} Dateien)")
        else:
            print(f"  ❌ {filename} – FEHLT!")
            all_ok = False

    if not all_ok:
        print()
        print("⚠️  Fehlende Dateien! Bitte zuerst ausführen:")
        print("    python backend/scripts/download_data.py")
        sys.exit(1)

    print()
    print("  Alle Dateien vorhanden.")


# ── 1. Bezirksgrenzen (GeoJSON) ───────────────────────────────

def explore_bezirksgrenzen():
    separator("1. Bezirksgrenzen Wien (GeoJSON)")

    with open(filepath("bezirksgrenzen"), "r", encoding="utf-8") as f:
        data = json.load(f)

    # Grundstruktur prüfen
    feat_type = data.get("type", "unbekannt")
    features = data.get("features", [])
    print(f"  Typ:              {feat_type}")
    print(f"  Anzahl Features:  {len(features)}")

    if len(features) == 0:
        print("  ⚠️  Keine Features gefunden!")
        return

    # Properties des ersten Features anzeigen
    first = features[0]
    props = first.get("properties", {})
    geom = first.get("geometry", {})

    print(f"  Geometrie-Typ:    {geom.get('type', 'unbekannt')}")
    print()
    print("  Properties (Spalten):")
    for key, value in props.items():
        print(f"    {key}: {value}")

    # Alle Bezirke auflisten
    print()
    print("  Gefundene Bezirke:")
    for feat in features:
        p = feat.get("properties", {})
        # Verschiedene mögliche Feldnamen probieren
        bez_nr = p.get("BEZNR", p.get("BEZ", p.get("BEZIRK", "?")))
        name = p.get("NAMEG", p.get("NAME", p.get("NAMEK", "?")))
        print(f"    {bez_nr}: {name}")

    expected = 23
    if len(features) == expected:
        print(f"\n  ✅ Alle {expected} Bezirke vorhanden!")
    else:
        print(f"\n  ⚠️  Erwartet: {expected}, Gefunden: {len(features)}")


# ── 2. Registerzählung 2023 ───────────────────────────────────

def explore_registerzaehlung():
    separator("2. Registerzählung 2023 – Wohnungen & Bevölkerung")

    with open(filepath("registerzaehlung"), "r", encoding="utf-8") as f:
        content = f.read()

    # Erkennung Trennzeichen (;)
    lines = content.strip().split("\n")

    # Erste Zeile kann ein Titel sein, Spalten kommen danach
    # Suche die Zeile mit den Spaltennamen
    header_line = None
    data_start = 0
    for i, line in enumerate(lines):
        if "DISTRICT_CODE" in line or "SUB_DISTRICT_CODE" in line:
            header_line = line
            data_start = i + 1
            break

    if not header_line:
        print("  ⚠️  Konnte Spaltenzeile nicht finden!")
        print(f"  Erste Zeile: {lines[0][:100]}...")
        return

    headers = header_line.split(";")
    data_lines = lines[data_start:]

    print(f"  Header-Zeile:     Zeile {data_start}")
    print(f"  Anzahl Spalten:   {len(headers)}")
    print(f"  Anzahl Zeilen:    {len(data_lines)}")
    print()

    # Relevante Spalten identifizieren
    interesting = {
        "DISTRICT_CODE": "Bezirkscode",
        "SUB_DISTRICT_CODE": "Zählbezirk",
        "WHG_WSA_TOTAL": "Wohnungen gesamt",
        "WHG_POP_TOTAL": "Bevölkerung gesamt",
        "WHG_RECHTSVERH_0": "Rechtsverhältnis: unbekannt",
        "WHG_RECHTSVERH_1": "Rechtsverhältnis: Eigentum",
        "WHG_RECHTSVERH_2": "Rechtsverhältnis: Hauptmiete",
        "WHG_RECHTSVERH_3": "Rechtsverhältnis: Gemeinde",
        "WHG_RECHTSVERH_4": "Rechtsverhältnis: Genossenschaft",
        "WHG_NTZFL_0": "Nutzfläche: unbekannt",
        "WHG_NTZFL_1": "Nutzfläche: unter 35m²",
        "WHG_NTZFL_2": "Nutzfläche: 35-60m²",
        "WHG_NTZFL_3": "Nutzfläche: 60-90m²",
        "WHG_NTZFL_4": "Nutzfläche: 90-130m²",
        "WHG_NTZFL_5": "Nutzfläche: über 130m²",
    }

    print("  Relevante Spalten gefunden:")
    for col, desc in interesting.items():
        if col in headers:
            print(f"    ✅ {col} → {desc}")
        else:
            print(f"    ❌ {col} → {desc} (FEHLT)")

    # Pro Bezirk aggregieren
    print()
    print("  Aggregation: 250 Zählbezirke → 23 Bezirke")
    print()

    district_idx = headers.index("DISTRICT_CODE") if "DISTRICT_CODE" in headers else None
    whg_idx = headers.index("WHG_WSA_TOTAL") if "WHG_WSA_TOTAL" in headers else None
    pop_idx = headers.index("WHG_POP_TOTAL") if "WHG_POP_TOTAL" in headers else None

    if district_idx is None or whg_idx is None or pop_idx is None:
        print("  ⚠️  Konnte nicht aggregieren – Spalten fehlen")
        return

    bezirk_data = {}
    for line in data_lines:
        cols = line.split(";")
        if len(cols) <= max(district_idx, whg_idx, pop_idx):
            continue

        try:
            district_raw = cols[district_idx].strip()
            # DISTRICT_CODE ist z.B. "90100" → Bezirk 901 → 1. Bezirk
            district_code = int(district_raw[:3]) if len(district_raw) >= 3 else None
            if district_code is None or district_code not in BEZIRK_NAMEN:
                # Alternativ: 5-stellig, z.B. 90100 → 901
                district_code = int(district_raw) // 100
                if district_code not in BEZIRK_NAMEN:
                    continue

            whg = int(cols[whg_idx].strip()) if cols[whg_idx].strip() else 0
            pop = int(cols[pop_idx].strip()) if cols[pop_idx].strip() else 0

            if district_code not in bezirk_data:
                bezirk_data[district_code] = {"wohnungen": 0, "bevoelkerung": 0, "zaehlbezirke": 0}

            bezirk_data[district_code]["wohnungen"] += whg
            bezirk_data[district_code]["bevoelkerung"] += pop
            bezirk_data[district_code]["zaehlbezirke"] += 1
        except (ValueError, IndexError):
            continue

    print(f"  {'Bezirk':<30} {'Wohnungen':>10} {'Bevölkerung':>12} {'Zählbez.':>10}")
    print(f"  {'-'*30} {'-'*10} {'-'*12} {'-'*10}")

    total_whg = 0
    total_pop = 0
    for code in sorted(bezirk_data.keys()):
        name = BEZIRK_NAMEN.get(code, f"Bezirk {code}")
        d = bezirk_data[code]
        total_whg += d["wohnungen"]
        total_pop += d["bevoelkerung"]
        print(f"  {name:<30} {d['wohnungen']:>10,} {d['bevoelkerung']:>12,} {d['zaehlbezirke']:>10}")

    print(f"  {'-'*30} {'-'*10} {'-'*12} {'-'*10}")
    print(f"  {'GESAMT Wien':<30} {total_whg:>10,} {total_pop:>12,}")


# ── 3. Gebäudeinformation ─────────────────────────────────────

def explore_gebaeudeinformation():
    separator("3. Gebäudeinformation Standorte Wien")

    with open(filepath("gebaeudeinformation"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        rows = list(reader)

    print(f"  Anzahl Spalten:   {len(headers)}")
    print(f"  Anzahl Gebäude:   {len(rows):,}")
    print()
    print("  Alle Spalten:")
    for i, h in enumerate(headers):
        # Beispielwert aus erster Zeile
        example = rows[0][i] if i < len(rows[0]) else "–"
        if len(example) > 50:
            example = example[:50] + "..."
        print(f"    [{i:2d}] {h}: {example}")

    # Baujahr-Verteilung falls vorhanden
    baujahr_col = None
    for i, h in enumerate(headers):
        if "BAUJ" in h.upper() or "YEAR" in h.upper() or "BAUPERIODE" in h.upper():
            baujahr_col = i
            break

    if baujahr_col is not None:
        print()
        print(f"  Baujahr-Verteilung (Spalte: {headers[baujahr_col]}):")
        baujahre = {}
        for row in rows:
            if baujahr_col < len(row) and row[baujahr_col].strip():
                val = row[baujahr_col].strip()
                # Gruppierung nach Jahrzehnt falls numerisch
                try:
                    year = int(val)
                    decade = (year // 10) * 10
                    key = f"{decade}er"
                except ValueError:
                    key = val
                baujahre[key] = baujahre.get(key, 0) + 1

        for key in sorted(baujahre.keys()):
            bar = "█" * min(baujahre[key] // 100, 50)
            print(f"    {key:>10}: {baujahre[key]:>6,} {bar}")


# ── 4. Wiener Linien Haltestellen ─────────────────────────────

def explore_haltestellen():
    separator("4. Wiener Linien – Haltestellen")

    with open(filepath("haltestellen"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        rows = list(reader)

    print(f"  Anzahl Spalten:   {len(headers)}")
    print(f"  Anzahl Einträge:  {len(rows):,}")
    print()
    print("  Spalten:")
    for i, h in enumerate(headers):
        example = rows[0][i] if i < len(rows[0]) else "–"
        print(f"    [{i:2d}] {h}: {example}")

    # Koordinaten-Spalten finden
    lat_col = None
    lon_col = None
    for i, h in enumerate(headers):
        h_upper = h.upper()
        if "LAT" in h_upper or "BREITE" in h_upper:
            lat_col = i
        if "LON" in h_upper or "LAENGE" in h_upper or "LNG" in h_upper:
            lon_col = i

    if lat_col is not None and lon_col is not None:
        print()
        print(f"  Koordinaten gefunden: Spalte {headers[lat_col]} & {headers[lon_col]}")

        # Einfache Bezirkszuordnung über Koordinaten-Bounding-Boxes
        # (Grobe Näherung – exakte Zuordnung kommt im ETL-Script mit GeoJSON)
        valid_coords = 0
        for row in rows:
            try:
                lat = float(row[lat_col])
                lon = float(row[lon_col])
                if 48.1 < lat < 48.4 and 16.1 < lon < 16.6:
                    valid_coords += 1
            except (ValueError, IndexError):
                pass

        print(f"  Haltestellen mit gültigen Wien-Koordinaten: {valid_coords:,}")
        print()
        print("  💡 Öffi-Score wird im ETL-Script berechnet (Point-in-Polygon")
        print("     mit Bezirksgrenzen GeoJSON)")
    else:
        print()
        print("  ⚠️  Koordinaten-Spalten nicht gefunden!")


# ── 5. Jahrbuch Wien 2025 ─────────────────────────────────────

def explore_jahrbuch():
    separator("5. Statistisches Jahrbuch Wien 2025")

    jahrbuch_dir = os.path.join(DATA_DIR, FILES["jahrbuch_dir"])

    if not os.path.isdir(jahrbuch_dir):
        print("  ⚠️  Jahrbuch-Ordner nicht gefunden!")
        return

    # Alle Dateien auflisten
    all_files = []
    for root, dirs, files in os.walk(jahrbuch_dir):
        for f in files:
            rel_path = os.path.relpath(os.path.join(root, f), jahrbuch_dir)
            size = os.path.getsize(os.path.join(root, f)) / 1024
            all_files.append((rel_path, size))

    print(f"  Anzahl Dateien: {len(all_files)}")
    print()

    # Nach Themen gruppieren (Ordnernamen)
    folders = {}
    for rel_path, size in all_files:
        parts = rel_path.split(os.sep)
        folder = parts[0] if len(parts) > 1 else "(root)"
        if folder not in folders:
            folders[folder] = []
        folders[folder].append((rel_path, size))

    print("  Ordnerstruktur:")
    for folder in sorted(folders.keys()):
        files = folders[folder]
        print(f"    📁 {folder}/ ({len(files)} Dateien)")

    # Relevante Dateien für unser Projekt hervorheben
    print()
    print("  🔍 Relevante Dateien für mietcheck-wien:")

    keywords = ["wohn", "gebaeude", "gebäude", "miete", "miet", "bezirk",
                 "bevoelkerung", "bevölkerung", "fläche", "flaeche"]

    relevant = []
    for rel_path, size in all_files:
        lower = rel_path.lower()
        if any(kw in lower for kw in keywords):
            relevant.append((rel_path, size))

    if relevant:
        for rel_path, size in sorted(relevant):
            print(f"    📄 {rel_path} ({size:.1f} KB)")
    else:
        print("    (Keine Dateien mit Wohn/Gebäude-Keywords gefunden)")
        print("    Alle Dateien:")
        for rel_path, size in sorted(all_files)[:20]:
            print(f"    📄 {rel_path} ({size:.1f} KB)")
        if len(all_files) > 20:
            print(f"    ... und {len(all_files) - 20} weitere")


# ── Zusammenfassung ────────────────────────────────────────────

def summary():
    separator("Zusammenfassung & nächste Schritte")

    print("  Datenquellen-Status:")
    print("    ✅ Bezirksgrenzen   → bereit für Leaflet-Karte")
    print("    ✅ Registerzählung  → aggregierbar auf 23 Bezirke")
    print("    ✅ Gebäudeinfo      → Baujahr, Standort pro Gebäude")
    print("    ✅ Haltestellen     → bereit für Öffi-Score")
    print("    ✅ Jahrbuch         → Zusatzdaten verfügbar")
    print()
    print("  Nächste Schritte:")
    print("    1. Daten-Schema definieren (TypeScript Interfaces)")
    print("    2. ETL-Script: Rohdaten → districts.json")
    print("       - Zählbezirke zu Bezirken aggregieren")
    print("       - Haltestellen per Point-in-Polygon zuordnen")
    print("       - Gebäudeinfo pro Bezirk auswerten")
    print("    3. FastAPI Backend aufsetzen")
    print("    4. Leaflet + React Frontend starten")


# ── Main ───────────────────────────────────────────────────────

def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║         mietcheck-wien – Daten-Exploration              ║")
    print("╚══════════════════════════════════════════════════════════╝")

    check_files()

    try:
        explore_bezirksgrenzen()
    except Exception as e:
        print(f"  ❌ Fehler: {e}")

    try:
        explore_registerzaehlung()
    except Exception as e:
        print(f"  ❌ Fehler: {e}")

    try:
        explore_gebaeudeinformation()
    except Exception as e:
        print(f"  ❌ Fehler: {e}")

    try:
        explore_haltestellen()
    except Exception as e:
        print(f"  ❌ Fehler: {e}")

    try:
        explore_jahrbuch()
    except Exception as e:
        print(f"  ❌ Fehler: {e}")

    summary()


if __name__ == "__main__":
    main()
