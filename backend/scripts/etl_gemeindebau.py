"""
ETL-Script: Gemeindebau Standorte Wien -> gemeindebau.json

Liest den WFS-Datensatz "Gemeindebau Standorte Wien" (Gebäudeflächen, GeoJSON),
reduziert jede Anlage auf einen Mittelpunkt und schreibt eine kompakte Datei
für die Karte (Punkte) und das Bezirkspanel (Summen pro Bezirk).

Usage:
    python backend/scripts/etl_gemeindebau.py

Input:
    data/raw/gemeindebau.json  (wird bei Bedarf von data.wien.gv.at geladen)

Output:
    frontend/public/data/gemeindebau.json

License: Datenquelle: Stadt Wien - data.wien.gv.at (Lizenz auf der Datensatzseite prüfen)
"""

import json
import os
import urllib.request
from collections import defaultdict
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_FILE = os.path.join(BASE_DIR, "data", "raw", "gemeindebau.json")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "gemeindebau.json")

WFS_URL = (
    "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0"
    "&typeName=ogdwien:GEMBAUTENFLOGD&srsName=EPSG:4326&outputFormat=json"
)

# Reihenfolge der Spalten in "anlagen" (kompakter als Objekte pro Eintrag)
COLUMNS = ["lon", "lat", "wohnungen", "baujahr", "bezirk", "name", "adresse"]


def download():
    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    print(f"Lade {WFS_URL}")
    with urllib.request.urlopen(WFS_URL, timeout=120) as r, open(RAW_FILE, "wb") as f:
        f.write(r.read())


def ring_area_centroid(ring):
    """Fläche (vorzeichenbehaftet) und Schwerpunkt eines Rings (Shoelace-Formel)."""
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    a *= 0.5
    if a == 0:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return 0.0, sum(xs) / len(xs), sum(ys) / len(ys)
    return a, cx / (6 * a), cy / (6 * a)


def centroid(geometry):
    """Flächengewichteter Mittelpunkt über alle äußeren Ringe (Polygon/MultiPolygon)."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    total = sx = sy = 0.0
    for poly in polygons:
        a, cx, cy = ring_area_centroid(poly[0])
        a = abs(a)
        total += a
        sx += cx * a
        sy += cy * a
    if total == 0:
        first = polygons[0][0][0]
        return first[0], first[1]
    return sx / total, sy / total


def clean_year(value):
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None
    return year if 1800 <= year <= date.today().year else None  # "0000" u. ä. = unbekannt


def main():
    if not os.path.exists(RAW_FILE):
        download()

    with open(RAW_FILE, "r", encoding="utf-8") as f:
        features = json.load(f)["features"]

    anlagen = []
    summen = defaultdict(lambda: {"anlagen": 0, "wohnungen": 0})
    ohne_wohnungen = ohne_baujahr = 0

    for feat in features:
        p = feat["properties"]
        bezirk = int(p["BEZIRK"]) if p.get("BEZIRK") else None
        wohnungen = int(p["WOHNUNGSANZAHL"]) if p.get("WOHNUNGSANZAHL") else None
        baujahr = clean_year(p.get("BAUJAHR"))
        lon, lat = centroid(feat["geometry"])

        ohne_wohnungen += wohnungen is None
        ohne_baujahr += baujahr is None

        anlagen.append([
            round(lon, 5),
            round(lat, 5),
            wohnungen,
            baujahr,
            bezirk,
            (p.get("HOFNAME") or "").strip(),
            (p.get("ADRESSE") or "").strip(),
        ])
        if bezirk:
            summen[bezirk]["anlagen"] += 1
            summen[bezirk]["wohnungen"] += wohnungen or 0

    anlagen.sort(key=lambda a: (a[4] or 99, a[5]))

    out = {
        "meta": {
            "quelle": "Stadt Wien - data.wien.gv.at, Gemeindebau Standorte Wien",
            "url": "https://www.data.gv.at/katalog/dataset/stadt-wien_gemeindebaustandortewien",
            "stand": date.today().isoformat(),
            "anlagen": len(anlagen),
            "wohnungen": sum(s["wohnungen"] for s in summen.values()),
            "ohne_wohnungszahl": ohne_wohnungen,
            "ohne_baujahr": ohne_baujahr,
            "spalten": COLUMNS,
        },
        "bezirke": {str(k): summen[k] for k in sorted(summen)},
        "anlagen": anlagen,
    }

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    kb = os.path.getsize(OUT_FILE) / 1024
    print(f"{len(anlagen)} Anlagen, {out['meta']['wohnungen']:,} Wohnungen -> {OUT_FILE} ({kb:.0f} KB)")
    print(f"ohne Wohnungszahl: {ohne_wohnungen}, ohne Baujahr: {ohne_baujahr}")


if __name__ == "__main__":
    main()
