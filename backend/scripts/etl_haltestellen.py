"""
ETL-Script: Wiener Linien Haltestellen -> haltestellen.json

Liest die bereits heruntergeladene CSV (siehe download_data.py), reduziert sie auf
Position und Name und schreibt eine kompakte Datei für den Standort-Check.

Usage:
    python backend/scripts/etl_haltestellen.py

Input:
    data/raw/wienerlinien_haltestellen.csv

Output:
    frontend/public/data/haltestellen.json

License: CC BY 4.0 - Datenquelle: Stadt Wien - data.wien.gv.at
"""

import csv
import json
import os
import re
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_FILE = os.path.join(BASE_DIR, "data", "raw", "wienerlinien_haltestellen.csv")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "haltestellen.json")

POINT = re.compile(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)")


def main():
    haltestellen = []
    with open(RAW_FILE, "r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            m = POINT.search(row.get("SHAPE", ""))
            name = (row.get("BEZEICHNUNG") or "").strip()
            if not m or not name:
                continue
            haltestellen.append([round(float(m.group(1)), 5), round(float(m.group(2)), 5), name])

    out = {
        "meta": {
            "quelle": "Stadt Wien - data.wien.gv.at, Wiener Linien Haltestellen",
            "stand": date.today().isoformat(),
            "anzahl": len(haltestellen),
            "spalten": ["lon", "lat", "name"],
        },
        "haltestellen": haltestellen,
    }

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{len(haltestellen)} Haltestellen -> {OUT_FILE} ({os.path.getsize(OUT_FILE) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()