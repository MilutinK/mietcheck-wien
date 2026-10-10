"""
ETL-Script: Standorte der Stadt Wien -> standorte.json

Liest mehrere WFS-Datensätze von data.wien.gv.at (Punkte), reduziert sie auf
Position, Name, Zusatzinfo und ein Gewicht und schreibt eine kompakte Datei für
den Standort-Check (Parks, Spielplätze, Schulen, Kindergärten, Hausärzte,
Apotheken, Märkte).

Usage:
    python backend/scripts/etl_standorte.py

Input:
    data/raw/<name>.json  (wird bei Bedarf von data.wien.gv.at geladen)

Output:
    frontend/public/data/standorte.json

License: Datenquelle: Stadt Wien - data.wien.gv.at (Lizenz je Datensatz prüfen, meist CC BY 4.0)
"""

import json
import os
import re
import urllib.request
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "standorte.json")

WFS = (
    "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0"
    "&srsName=EPSG:4326&outputFormat=json&typeName=ogdwien:"
)

# Rohdatei -> WFS-Typ
QUELLEN = {
    "parkanlagen": "PARKINFOOGD",
    "spielplaetze": "SPIELPLATZPUNKTOGD",
    "schulen": "SCHULEOGD",
    "kindergaerten": "KINDERGARTENOGD",
    "maerkte": "MAERKTEOGD",
    "aerzte": "ARZTOGD",
    "apotheken": "APOTHEKEOGD",
}

HAUSARZT_FAECHER = {"Allgemeinmedizin", "Allgemein- und Familienmedizin"}


def lade(name):
    pfad = os.path.join(RAW_DIR, name + ".json")
    if not os.path.exists(pfad):
        os.makedirs(RAW_DIR, exist_ok=True)
        print(f"Lade {name} ...")
        with urllib.request.urlopen(WFS + QUELLEN[name], timeout=120) as r, open(pfad, "wb") as f:
            f.write(r.read())
    with open(pfad, "r", encoding="utf-8") as f:
        return json.load(f)["features"]


def text(wert):
    """Bereinigter Text: HTML-Umbrüche und Mehrfach-Leerzeichen entfernen."""
    s = re.sub(r"<br\s*/?>", " ", str(wert or ""))
    return re.sub(r"\s+", " ", s).strip()


def m2(wert):
    """'2.463 m²' -> 2463 (Quadratmeter), unlesbar -> 0."""
    s = text(wert).replace("m²", "").replace(".", "").replace(",", ".").strip()
    try:
        return round(float(s))
    except ValueError:
        return 0


def punkt(feat):
    lon, lat = feat["geometry"]["coordinates"][:2]
    return round(lon, 5), round(lat, 5)


def eintrag(feat, name, detail="", gewicht=1):
    lon, lat = punkt(feat)
    return [lon, lat, text(name), text(detail), gewicht]


def main():
    faktoren = {
        "gruen": [],
        "spielplatz": [],
        "schule": [],
        "kindergarten": [],
        "hausarzt": [],
        "apotheke": [],
        "markt": [],
    }

    for f in lade("parkanlagen"):
        p = f["properties"]
        flaeche = m2(p.get("FLAECHE"))
        # Gewicht = Fläche in m² (große Parks zählen mehr als Grünstreifen)
        faktoren["gruen"].append(eintrag(f, p.get("ANL_NAME"), f"{flaeche:,} m²".replace(",", "."), flaeche))

    for f in lade("spielplaetze"):
        p = f["properties"]
        faktoren["spielplatz"].append(eintrag(f, p.get("ANL_NAME"), p.get("TYP_DETAIL")))

    for f in lade("schulen"):
        p = f["properties"]
        faktoren["schule"].append(eintrag(f, p.get("NAME"), p.get("ART_TXT")))

    for f in lade("kindergaerten"):
        p = f["properties"]
        faktoren["kindergarten"].append(eintrag(f, p.get("BEZEICHNUNG"), p.get("ADRESSE")))

    for f in lade("aerzte"):
        p = f["properties"]
        if p.get("FACH") in HAUSARZT_FAECHER:
            # Keine Namen von Einzelpersonen übernehmen: nur Fachrichtung und Lage
            faktoren["hausarzt"].append(eintrag(f, p.get("FACH")))

    for f in lade("apotheken"):
        p = f["properties"]
        faktoren["apotheke"].append(eintrag(f, p.get("BEZEICHNUNG"), p.get("ADRESSE")))

    for f in lade("maerkte"):
        p = f["properties"]
        faktoren["markt"].append(eintrag(f, p.get("NAME"), p.get("MARKTKATEGORIE")))

    out = {
        "meta": {
            "quelle": "Stadt Wien - data.wien.gv.at, Standorte (Parks, Spielplätze, Schulen, Kindergärten, Ärzte, Apotheken, Märkte)",
            "stand": date.today().isoformat(),
            "spalten": ["lon", "lat", "name", "detail", "gewicht"],
            "anzahl": {k: len(v) for k, v in faktoren.items()},
        },
        "faktoren": faktoren,
    }

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{OUT_FILE} ({os.path.getsize(OUT_FILE) / 1024:.0f} KB)")
    for k, v in out["meta"]["anzahl"].items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
