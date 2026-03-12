"""
ETL-Script: Rohdaten → districts.json

Dieses Script liest alle heruntergeladenen Datenquellen ein,
aggregiert sie pro Bezirk und gibt eine strukturierte JSON-Datei aus.

Usage:
    python backend/scripts/etl.py

Output:
    data/processed/districts.json

License: CC BY 4.0 – Datenquelle: Stadt Wien – data.wien.gv.at
"""

import os
import json
import csv
import sys

# ── Pfade ──────────────────────────────────────────────────────

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
OUT_DIR = os.path.join(BASE_DIR, "data", "processed")

# ── Bezirks-Stammdaten ─────────────────────────────────────────

BEZIRKE = {
    901: {"id": 1,  "name": "Innere Stadt",          "flaeche_km2": 3.01},
    902: {"id": 2,  "name": "Leopoldstadt",           "flaeche_km2": 19.27},
    903: {"id": 3,  "name": "Landstraße",             "flaeche_km2": 7.42},
    904: {"id": 4,  "name": "Wieden",                 "flaeche_km2": 1.78},
    905: {"id": 5,  "name": "Margareten",             "flaeche_km2": 2.03},
    906: {"id": 6,  "name": "Mariahilf",              "flaeche_km2": 1.48},
    907: {"id": 7,  "name": "Neubau",                 "flaeche_km2": 1.61},
    908: {"id": 8,  "name": "Josefstadt",             "flaeche_km2": 1.09},
    909: {"id": 9,  "name": "Alsergrund",             "flaeche_km2": 2.96},
    910: {"id": 10, "name": "Favoriten",              "flaeche_km2": 31.82},
    911: {"id": 11, "name": "Simmering",              "flaeche_km2": 23.25},
    912: {"id": 12, "name": "Meidling",               "flaeche_km2": 8.21},
    913: {"id": 13, "name": "Hietzing",               "flaeche_km2": 37.70},
    914: {"id": 14, "name": "Penzing",                "flaeche_km2": 33.76},
    915: {"id": 15, "name": "Rudolfsheim-Fünfhaus",   "flaeche_km2": 3.92},
    916: {"id": 16, "name": "Ottakring",              "flaeche_km2": 8.67},
    917: {"id": 17, "name": "Hernals",                "flaeche_km2": 11.35},
    918: {"id": 18, "name": "Währing",                "flaeche_km2": 6.28},
    919: {"id": 19, "name": "Döbling",                "flaeche_km2": 24.94},
    920: {"id": 20, "name": "Brigittenau",            "flaeche_km2": 5.67},
    921: {"id": 21, "name": "Floridsdorf",            "flaeche_km2": 44.46},
    922: {"id": 22, "name": "Donaustadt",             "flaeche_km2": 102.34},
    923: {"id": 23, "name": "Liesing",                "flaeche_km2": 32.06},
}


# ── Hilfsfunktionen ───────────────────────────────────────────

def raw_path(filename: str) -> str:
    return os.path.join(RAW_DIR, filename)


def point_in_polygon(lat: float, lon: float, polygon_coords: list) -> bool:
    """
    Ray-Casting Algorithmus: Prüft ob ein Punkt in einem Polygon liegt.
    polygon_coords ist eine Liste von [lon, lat] Paaren.
    """
    n = len(polygon_coords)
    inside = False
    x, y = lon, lat

    j = n - 1
    for i in range(n):
        xi, yi = polygon_coords[i]
        xj, yj = polygon_coords[j]

        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside


def find_bezirk_for_point(lat: float, lon: float, bezirk_polygons: dict) -> int | None:
    """Findet den Bezirk für einen Punkt via Point-in-Polygon."""
    for bez_nr, polygons in bezirk_polygons.items():
        for polygon in polygons:
            if point_in_polygon(lat, lon, polygon):
                return bez_nr
    return None


# ── 1. Bezirksgrenzen laden ────────────────────────────────────

def load_bezirksgrenzen() -> dict:
    """Lädt Bezirksgrenzen und gibt ein Dict {bezirk_nr: [polygon_coords]} zurück."""
    print("  📍 Lade Bezirksgrenzen...")

    with open(raw_path("bezirksgrenzen.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    bezirk_polygons = {}

    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})

        # Bezirksnummer finden
        bez_nr = props.get("BEZNR", props.get("BEZ"))
        if bez_nr is None:
            continue
        bez_nr = int(bez_nr)

        # District-Code erstellen (z.B. 1 → 901)
        district_code = 900 + bez_nr

        # Polygon-Koordinaten extrahieren
        geom_type = geom.get("type", "")
        coords = geom.get("coordinates", [])

        polygons = []
        if geom_type == "Polygon":
            # coords = [[[lon, lat], ...]]
            polygons.append(coords[0])
        elif geom_type == "MultiPolygon":
            # coords = [[[[lon, lat], ...]], ...]
            for poly in coords:
                polygons.append(poly[0])

        bezirk_polygons[district_code] = polygons

    print(f"     {len(bezirk_polygons)} Bezirke geladen")
    return bezirk_polygons


# ── 2. Registerzählung aggregieren ─────────────────────────────

def load_registerzaehlung() -> dict:
    """
    Aggregiert Registerzählung von 250 Zählbezirken auf 23 Bezirke.
    Gibt Dict {district_code: {...}} zurück.
    """
    print("  📊 Lade Registerzählung 2023...")

    with open(raw_path("registerzaehlung_2023.csv"), "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.strip().split("\n")

    # Header-Zeile finden
    header_line = None
    data_start = 0
    for i, line in enumerate(lines):
        if "DISTRICT_CODE" in line:
            header_line = line
            data_start = i + 1
            break

    if not header_line:
        print("  ❌ Header nicht gefunden!")
        return {}

    headers = header_line.split(";")

    def col_idx(name):
        try:
            return headers.index(name)
        except ValueError:
            return None

    # Spalten-Indizes
    idx = {
        "district": col_idx("DISTRICT_CODE"),
        "whg_total": col_idx("WHG_WSA_TOTAL"),
        "pop_total": col_idx("WHG_POP_TOTAL"),
        # Rechtsverhältnis
        "rv_eigentum": col_idx("WHG_RECHTSVERH_1"),
        "rv_hauptmiete": col_idx("WHG_RECHTSVERH_2"),
        "rv_gemeinde": col_idx("WHG_RECHTSVERH_3"),
        "rv_genossen": col_idx("WHG_RECHTSVERH_4"),
        "rv_sonstige": col_idx("WHG_RECHTSVERH_0"),
        # Nutzfläche
        "nf_unter35": col_idx("WHG_NTZFL_1"),
        "nf_35_60": col_idx("WHG_NTZFL_2"),
        "nf_60_90": col_idx("WHG_NTZFL_3"),
        "nf_90_130": col_idx("WHG_NTZFL_4"),
        "nf_ueber130": col_idx("WHG_NTZFL_5"),
    }

    # Bauperioden-Spalten suchen (OBJ_BAUP_0 bis OBJ_BAUP_10)
    baup_indices = []
    for i in range(15):
        ci = col_idx(f"OBJ_BAUP_{i}")
        if ci is not None:
            baup_indices.append(ci)

    bezirke = {}

    for line in lines[data_start:]:
        cols = line.split(";")
        if len(cols) < 10:
            continue

        try:
            district_raw = cols[idx["district"]].strip()
            district_code = int(district_raw[:3]) if len(district_raw) >= 3 else int(district_raw) // 100

            if district_code not in BEZIRKE:
                continue

            if district_code not in bezirke:
                bezirke[district_code] = {
                    "wohnungen": 0, "bevoelkerung": 0,
                    "rv_eigentum": 0, "rv_hauptmiete": 0,
                    "rv_gemeinde": 0, "rv_genossen": 0, "rv_sonstige": 0,
                    "nf_unter35": 0, "nf_35_60": 0, "nf_60_90": 0,
                    "nf_90_130": 0, "nf_ueber130": 0,
                    "baup_values": [0] * len(baup_indices),
                }

            def safe_int(i):
                if i is None or i >= len(cols):
                    return 0
                val = cols[i].strip()
                return int(val) if val else 0

            b = bezirke[district_code]
            b["wohnungen"] += safe_int(idx["whg_total"])
            b["bevoelkerung"] += safe_int(idx["pop_total"])
            b["rv_eigentum"] += safe_int(idx["rv_eigentum"])
            b["rv_hauptmiete"] += safe_int(idx["rv_hauptmiete"])
            b["rv_gemeinde"] += safe_int(idx["rv_gemeinde"])
            b["rv_genossen"] += safe_int(idx["rv_genossen"])
            b["rv_sonstige"] += safe_int(idx["rv_sonstige"])
            b["nf_unter35"] += safe_int(idx["nf_unter35"])
            b["nf_35_60"] += safe_int(idx["nf_35_60"])
            b["nf_60_90"] += safe_int(idx["nf_60_90"])
            b["nf_90_130"] += safe_int(idx["nf_90_130"])
            b["nf_ueber130"] += safe_int(idx["nf_ueber130"])

            for j, ci in enumerate(baup_indices):
                b["baup_values"][j] += safe_int(ci)

        except (ValueError, IndexError):
            continue

    print(f"     {len(bezirke)} Bezirke aggregiert")
    return bezirke


# ── 3. Gebäudeinformation zählen ───────────────────────────────

def count_gebaeude_per_bezirk(bezirk_polygons: dict) -> dict:
    """
    Zählt Gebäude pro Bezirk via Point-in-Polygon.
    Gibt Dict {district_code: count} zurück.
    """
    print("  🏠 Zähle Gebäude pro Bezirk...")
    print("     (Das kann 1-2 Minuten dauern...)")

    counts = {code: 0 for code in BEZIRKE}

    with open(raw_path("gebaeudeinformation.csv"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)

    # Koordinaten-Spalten finden
    lat_col = None
    lon_col = None
    for i, h in enumerate(headers):
        h_upper = h.upper().strip()
        if h_upper in ("LAT", "LATITUDE", "WGS84_LAT", "Y"):
            lat_col = i
        if h_upper in ("LON", "LONGITUDE", "LNG", "WGS84_LON", "X"):
            lon_col = i

    # Manchmal heißen die Spalten bei WFS-Output anders
    if lat_col is None or lon_col is None:
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if "lat" in h_lower or "breite" in h_lower:
                lat_col = lat_col or i
            if "lon" in h_lower or "lng" in h_lower or "laenge" in h_lower:
                lon_col = lon_col or i

    if lat_col is None or lon_col is None:
        print(f"     ⚠️  Koordinaten-Spalten nicht gefunden!")
        print(f"     Spalten: {headers}")
        print("     → Überspringe Gebäude-Zählung, verwende Fallback")
        return counts

    # Alle Gebäude durchgehen
    total = 0
    assigned = 0

    with open(raw_path("gebaeudeinformation.csv"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # Header überspringen

        for row in reader:
            total += 1
            try:
                lat = float(row[lat_col])
                lon = float(row[lon_col])

                if not (48.1 < lat < 48.4 and 16.1 < lon < 16.6):
                    continue

                bez = find_bezirk_for_point(lat, lon, bezirk_polygons)
                if bez and bez in counts:
                    counts[bez] += 1
                    assigned += 1
            except (ValueError, IndexError):
                continue

            if total % 5000 == 0:
                print(f"     ... {total:,} Gebäude verarbeitet, {assigned:,} zugeordnet")

    print(f"     {total:,} Gebäude gesamt, {assigned:,} zugeordnet")
    return counts


# ── 4. Haltestellen → Öffi-Score ──────────────────────────────

def calculate_oeffi_score(bezirk_polygons: dict) -> dict:
    """
    Zählt Haltestellen pro Bezirk und berechnet einen Öffi-Score.
    Gibt Dict {district_code: {anzahl, pro_km2, score}} zurück.
    """
    print("  🚇 Berechne Öffi-Score...")

    halt_per_bezirk = {code: 0 for code in BEZIRKE}

    with open(raw_path("wienerlinien_haltestellen.csv"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)

    # Koordinaten-Spalten finden
    lat_col = None
    lon_col = None
    for i, h in enumerate(headers):
        h_upper = h.upper().strip()
        if "LAT" in h_upper:
            lat_col = i
        if "LON" in h_upper or "LNG" in h_upper:
            lon_col = i

    if lat_col is None or lon_col is None:
        print(f"     ⚠️  Koordinaten-Spalten nicht gefunden: {headers}")
        return {}

    total = 0
    assigned = 0

    with open(raw_path("wienerlinien_haltestellen.csv"), "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)

        for row in reader:
            total += 1
            try:
                lat = float(row[lat_col])
                lon = float(row[lon_col])

                if not (48.1 < lat < 48.4 and 16.1 < lon < 16.6):
                    continue

                bez = find_bezirk_for_point(lat, lon, bezirk_polygons)
                if bez and bez in halt_per_bezirk:
                    halt_per_bezirk[bez] += 1
                    assigned += 1
            except (ValueError, IndexError):
                continue

    print(f"     {total:,} Haltestellen, {assigned:,} zugeordnet")

    # Dichte und Score berechnen
    oeffi_data = {}
    max_dichte = 0

    for code in BEZIRKE:
        anzahl = halt_per_bezirk[code]
        flaeche = BEZIRKE[code]["flaeche_km2"]
        dichte = anzahl / flaeche if flaeche > 0 else 0
        max_dichte = max(max_dichte, dichte)
        oeffi_data[code] = {"anzahl": anzahl, "pro_km2": round(dichte, 2)}

    # Score normalisieren auf 1-10
    for code in oeffi_data:
        if max_dichte > 0:
            raw_score = oeffi_data[code]["pro_km2"] / max_dichte * 10
            oeffi_data[code]["score"] = round(max(1, min(10, raw_score)), 1)
        else:
            oeffi_data[code]["score"] = 1

    return oeffi_data


# ── 5. Alles zusammenbauen ─────────────────────────────────────

def build_districts_json(reg_data: dict, gebaeude_counts: dict,
                          oeffi_data: dict) -> list:
    """Baut die finale District-Liste."""
    print("  🔧 Baue districts.json...")

    districts = []

    for code in sorted(BEZIRKE.keys()):
        bez = BEZIRKE[code]
        reg = reg_data.get(code, {})
        oeffi = oeffi_data.get(code, {"anzahl": 0, "pro_km2": 0, "score": 1})
        geb_count = gebaeude_counts.get(code, 0)

        bevoelkerung = reg.get("bevoelkerung", 0)
        flaeche = bez["flaeche_km2"]

        # Bauperioden zuordnen
        # Die Reihenfolge der OBJ_BAUP Spalten in der Registerzählung 2023:
        # 0=unbekannt, 1=vor 1919, 2=1919-1944, 3=1945-1960,
        # 4=1961-1970, 5=1971-1980, 6=1981-1990, 7=1991-2000,
        # 8=2001-2010, 9=2011-2020, 10=nach 2021
        baup = reg.get("baup_values", [0] * 11)

        # Gruppierung für übersichtliche Darstellung
        def safe_baup(i):
            return baup[i] if i < len(baup) else 0

        district = {
            "id": bez["id"],
            "name": bez["name"],
            "name_full": f"{bez['id']}. {bez['name']}",
            "wohnungen_gesamt": reg.get("wohnungen", 0),
            "bevoelkerung": bevoelkerung,
            "flaeche_km2": flaeche,
            "einwohner_pro_km2": round(bevoelkerung / flaeche) if flaeche > 0 else 0,
            "rechtsverhaeltnis": {
                "eigentum": reg.get("rv_eigentum", 0),
                "hauptmiete": reg.get("rv_hauptmiete", 0),
                "gemeinde": reg.get("rv_gemeinde", 0),
                "genossenschaft": reg.get("rv_genossen", 0),
                "sonstige": reg.get("rv_sonstige", 0),
            },
            "nutzflaechen": {
                "unter_35m2": reg.get("nf_unter35", 0),
                "von_35_bis_60m2": reg.get("nf_35_60", 0),
                "von_60_bis_90m2": reg.get("nf_60_90", 0),
                "von_90_bis_130m2": reg.get("nf_90_130", 0),
                "ueber_130m2": reg.get("nf_ueber130", 0),
            },
            "bauperioden": {
                "vor_1919": safe_baup(1),
                "von_1919_bis_1944": safe_baup(2),
                "von_1945_bis_1960": safe_baup(3),
                "von_1961_bis_1980": safe_baup(4) + safe_baup(5),
                "von_1981_bis_2000": safe_baup(6) + safe_baup(7),
                "nach_2001": safe_baup(8) + safe_baup(9) + safe_baup(10),
            },
            "oeffi": {
                "haltestellen_anzahl": oeffi["anzahl"],
                "haltestellen_pro_km2": oeffi["pro_km2"],
                "score": oeffi["score"],
            },
            "gebaeude_anzahl": geb_count,
        }

        districts.append(district)

    return districts


# ── Main ───────────────────────────────────────────────────────

def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║            mietcheck-wien – ETL Pipeline                ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    # 1. Bezirksgrenzen laden (für Point-in-Polygon)
    bezirk_polygons = load_bezirksgrenzen()

    # 2. Registerzählung aggregieren
    reg_data = load_registerzaehlung()

    # 3. Gebäude pro Bezirk zählen
    gebaeude_counts = count_gebaeude_per_bezirk(bezirk_polygons)

    # 4. Öffi-Score berechnen
    oeffi_data = calculate_oeffi_score(bezirk_polygons)

    # 5. Alles zusammenbauen
    districts = build_districts_json(reg_data, gebaeude_counts, oeffi_data)

    # 6. Ausgabe
    os.makedirs(OUT_DIR, exist_ok=True)
    output_path = os.path.join(OUT_DIR, "districts.json")

    output = {
        "districts": districts,
        "meta": {
            "source": "Datenquelle: Stadt Wien – data.wien.gv.at",
            "stand": "Registerzählung 2023, Gebäudeinformation 2025",
            "lizenz": "CC BY 4.0",
            "generiert_mit": "mietcheck-wien ETL Pipeline",
        },
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print()
    print(f"  💾 Gespeichert: {output_path}")
    print(f"     {len(districts)} Bezirke")

    # Kurze Zusammenfassung
    print()
    print("  📊 Zusammenfassung:")
    print(f"  {'Bezirk':<28} {'Whg':>7} {'Bev':>8} {'Öffi':>5} {'Geb':>6}")
    print(f"  {'-'*28} {'-'*7} {'-'*8} {'-'*5} {'-'*6}")

    for d in districts:
        print(
            f"  {d['name_full']:<28} "
            f"{d['wohnungen_gesamt']:>7,} "
            f"{d['bevoelkerung']:>8,} "
            f"{d['oeffi']['score']:>5.1f} "
            f"{d['gebaeude_anzahl']:>6,}"
        )

    total_whg = sum(d["wohnungen_gesamt"] for d in districts)
    total_pop = sum(d["bevoelkerung"] for d in districts)
    total_geb = sum(d["gebaeude_anzahl"] for d in districts)
    print(f"  {'-'*28} {'-'*7} {'-'*8} {'-'*5} {'-'*6}")
    print(f"  {'GESAMT Wien':<28} {total_whg:>7,} {total_pop:>8,} {'':>5} {total_geb:>6,}")

    print()
    print("  ✅ ETL Pipeline abgeschlossen!")
    print()
    print("  Nächste Schritte:")
    print("    1. FastAPI Backend: data/processed/districts.json einlesen")
    print("    2. React Frontend: Bezirkskarte + Vergleichsansicht")


if __name__ == "__main__":
    main()
