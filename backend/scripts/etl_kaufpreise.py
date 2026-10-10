"""
ETL-Script: Kaufpreise pro Bezirk (immopreise.at / derStandard.at) -> kaufpreise.json

Lädt das Preisspiegel-PDF "Immobilienpreise Wohnungen Kauf Wien YYYY-MM.pdf" eines Monats und liest
die Tabelle mit pdftotext aus: Angebotspreise in EUR pro m2 je Bezirk, nach Größenklasse und
als Durchschnitt.

Usage:
    python backend/scripts/etl_kaufpreise.py [YYYY-MM]

    Ohne Angabe wird der letzte abgeschlossene Monat genommen. Die Mietpreise der App
    (mietpreise.json) sollten vom selben Monat sein, damit der Vergleich Miete/Kauf stimmt.

Voraussetzung:
    pdftotext (Poppler) im PATH

Input:
    data/raw/kauf/YYYY-MM.pdf  (wird bei Bedarf geladen)

Output:
    frontend/public/data/kaufpreise.json

Quelle: immopreise.at / derStandard.at Immobilien (Angebotspreise)
"""

import json
import os
import re
import subprocess
import sys
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "kauf")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "kaufpreise.json")

URL = (
    "https://images.derstandard.at/upload/imagesanzeiger/immopreise/pdf/"
    "{y}/{m:02d}/Immobilienpreise%20Wohnungen%20Kauf%20Wien%20{y}-{m:02d}.pdf"
)
BEZIRKE = range(1, 24)
# Plausibilitätsgrenzen für EUR/m2: alles außerhalb deutet auf einen Lesefehler hin
MIN_PREIS, MAX_PREIS = 1500, 40000
SPALTEN = ["unter_50m2", "von_51_bis_80m2", "von_81_bis_129m2", "ueber_130m2", "durchschnitt"]


def letzter_abgeschlossener_monat():
    heute = date.today()
    return (heute.year, heute.month - 1) if heute.month > 1 else (heute.year - 1, 12)


def lade_pdf(y, m):
    os.makedirs(RAW_DIR, exist_ok=True)
    pfad = os.path.join(RAW_DIR, f"{y}-{m:02d}.pdf")
    if os.path.exists(pfad) and os.path.getsize(pfad) > 1000:
        return pfad
    r = subprocess.run(
        ["curl", "-sS", "-m", "60", "-o", pfad, "-w", "%{http_code}", URL.format(y=y, m=m)],
        capture_output=True, timeout=70,
    )
    code = r.stdout.decode().strip()
    if code != "200":
        if os.path.exists(pfad):
            os.remove(pfad)
        raise RuntimeError(f"{y}-{m:02d}: HTTP {code}")
    return pfad


def lese_pdf(pfad):
    text = subprocess.run(["pdftotext", "-layout", pfad, "-"], capture_output=True, check=True).stdout.decode("latin-1")
    werte = {}
    for zeile in text.splitlines():
        m = re.match(r"\s*(\d+)\.,\s+(.+?)\s{2,}(.*)$", zeile)
        if not m:
            continue
        zahlen = re.findall(r"k\.A\.|\d+", m.group(3))
        if len(zahlen) != 5:
            raise RuntimeError(f"Zeile mit {len(zahlen)} statt 5 Werten: {zeile.strip()}")
        werte[int(m.group(1))] = dict(zip(SPALTEN, [None if z == "k.A." else int(z) for z in zahlen]))
    objekte = re.search(r"Gesamtanzahl der Objekte:\s*(\d+)", text)
    return werte, int(objekte.group(1)) if objekte else None


def main():
    if len(sys.argv) > 1:
        y, m = (int(x) for x in sys.argv[1].split("-"))
    else:
        y, m = letzter_abgeschlossener_monat()

    werte, objekte = lese_pdf(lade_pdf(y, m))
    if set(werte) != set(BEZIRKE):
        raise RuntimeError(f"{len(werte)} statt 23 Bezirke gelesen")
    for b, v in werte.items():
        d = v["durchschnitt"]
        if d is None or not (MIN_PREIS <= d <= MAX_PREIS):
            raise RuntimeError(f"Bezirk {b}: unplausibler Durchschnitt {d}")

    out = {
        "meta": {
            "quelle": "immopreise.at / derStandard.at Immobilien, Angebotspreise brutto",
            "einheit": "EUR pro m2",
            "stand": f"{y}-{m:02d}",
            "objekte": objekte,
            "hinweis": "Angebotspreise, keine Abschlüsse. null = weniger als 4 Objekte (k.A.).",
        },
        "bezirke": {str(b): werte[b] for b in BEZIRKE},
    }
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    ds = [werte[b]["durchschnitt"] for b in BEZIRKE]
    print(f"Stand {y}-{m:02d}, {objekte} Objekte -> {os.path.getsize(OUT_FILE)} Bytes; Durchschnitt {min(ds)} bis {max(ds)} EUR/m2")


if __name__ == "__main__":
    main()
