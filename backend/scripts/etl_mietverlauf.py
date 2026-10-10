"""
ETL-Script: Mietpreis-Verlauf pro Bezirk (immopreise.at / derStandard.at) -> mietverlauf.json

Lädt die monatlichen PDFs "Immobilienpreise Wohnungen Miete Wien YYYY-MM.pdf" (Oktober 2013 bis
heute), liest die Tabelle mit pdftotext aus und schreibt je Bezirk eine Zeitreihe des
Durchschnittspreises (Bruttomiete in EUR pro m2, Angebotspreise).

Usage:
    python backend/scripts/etl_mietverlauf.py

Voraussetzung:
    pdftotext (Poppler) im PATH

Input:
    data/raw/mietverlauf/YYYY-MM.pdf  (wird bei Bedarf geladen, vorhandene Dateien bleiben)

Output:
    frontend/public/data/mietverlauf.json

Quelle: immopreise.at / derStandard.at Immobilien (Angebotspreise)
"""

import json
import os
import re
import subprocess
import time
import urllib.request
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "mietverlauf")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "mietverlauf.json")

URL = (
    "https://images.derstandard.at/upload/imagesanzeiger/immopreise/pdf/"
    "{y}/{m:02d}/Immobilienpreise%20Wohnungen%20Miete%20Wien%20{y}-{m:02d}.pdf"
)

ERSTER_MONAT = (2013, 10)  # Das Archiv beginnt im Oktober 2013 (Januar 2014 fehlt)
PAUSE_S = 0.4
BEZIRKE = range(1, 24)
# Plausibilitätsgrenzen für EUR/m2 brutto: alles außerhalb deutet auf einen Lesefehler hin
MIN_PREIS, MAX_PREIS = 5.0, 60.0


def monate():
    heute = date.today()
    y, m = ERSTER_MONAT
    while (y, m) <= (heute.year, heute.month):
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


def lade_pdf(y, m):
    """Gibt den Pfad der PDF zurück oder None, wenn es für den Monat keine gibt (HTTP 404)."""
    pfad = os.path.join(RAW_DIR, f"{y}-{m:02d}.pdf")
    if os.path.exists(pfad) and os.path.getsize(pfad) > 1000:
        return pfad
    url = URL.format(y=y, m=m)
    # curl zuerst: Pythons SSL-Prüfung scheitert auf manchen Windows-Systemen an Zertifikatsketten
    try:
        r = subprocess.run(
            ["curl", "-sS", "-m", "60", "-o", pfad, "-w", "%{http_code}", url],
            capture_output=True, timeout=70,
        )
        code = r.stdout.decode().strip()
    except FileNotFoundError:
        try:
            with urllib.request.urlopen(url, timeout=60) as resp, open(pfad, "wb") as f:
                f.write(resp.read())
            code = "200"
        except urllib.error.HTTPError as e:
            code = str(e.code)
    if code != "200":
        if os.path.exists(pfad):
            os.remove(pfad)
        if code == "404":
            return None
        raise RuntimeError(f"{y}-{m:02d}: HTTP {code}")
    time.sleep(PAUSE_S)
    return pfad


def lese_pdf(pfad):
    """-> ({bezirk: [None, None, None, None, Durchschnitt]}, Objektanzahl oder None); nur der Durchschnitt wird gebraucht"""
    text = subprocess.run(["pdftotext", "-layout", pfad, "-"], capture_output=True, check=True).stdout.decode("latin-1")
    werte = {}
    for zeile in text.splitlines():
        m = re.match(r"\s*(\d+)\.,\s+(.+?)\s{2,}(.*)$", zeile)
        if not m:
            continue
        zahlen = re.findall(r"k\.A\.|\d+(?:,\d+)?", m.group(3))
        # Normal sind es 5 Spalten. Einzelne PDFs lassen eine Zelle leer (z. B. 2014-07, Bezirk 20, ">130 m2"),
        # dann sind es 4 Werte. Der Durchschnitt steht immer in der letzten Spalte und genügt hier.
        if len(zahlen) not in (4, 5):
            continue
        letzter = zahlen[-1]
        werte[int(m.group(1))] = [None] * 4 + [None if letzter == "k.A." else float(letzter.replace(",", "."))]
    objekte = re.search(r"Gesamtanzahl der Objekte:\s*(\d+)", text)
    return werte, int(objekte.group(1)) if objekte else None


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    liste = list(monate())
    verlauf = {b: [] for b in BEZIRKE}
    objekte = []
    monatsliste = []
    fehlend = []
    probleme = []

    for y, m in liste:
        key = f"{y}-{m:02d}"
        pfad = lade_pdf(y, m)
        if pfad is None:
            fehlend.append(key)
            continue
        werte, anzahl = lese_pdf(pfad)
        if set(werte) != set(BEZIRKE):
            probleme.append(f"{key}: {len(werte)} Bezirke gelesen")
            continue
        # Durchschnitt (letzte Spalte) prüfen, bevor er übernommen wird
        schlecht = [b for b, v in werte.items() if v[4] is not None and not (MIN_PREIS <= v[4] <= MAX_PREIS)]
        if schlecht:
            probleme.append(f"{key}: unplausibel in Bezirk {schlecht}")
            continue
        monatsliste.append(key)
        objekte.append(anzahl)
        for b in BEZIRKE:
            verlauf[b].append(werte[b][4])
        print(f"  {key}: ok ({anzahl} Objekte)", flush=True)

    if probleme:
        print("PROBLEME (diese Monate fehlen in der Ausgabe):")
        for p in probleme:
            print("  -", p)

    out = {
        "meta": {
            "quelle": "immopreise.at / derStandard.at Immobilien, Angebotspreise brutto inkl. BK und USt.",
            "einheit": "EUR pro m2",
            "stand": monatsliste[-1] if monatsliste else None,
            "erster_monat": monatsliste[0] if monatsliste else None,
            "monate_gesamt": len(monatsliste),
            "fehlende_monate": fehlend,
            "hinweis": "Angebotspreise, keine Abschlüsse. Die Zahl der berücksichtigten Objekte schwankt stark (siehe objekte, z. B. rund 5.000 pro Monat 2013, rund 29.000 2021, rund 3.600 2025); Basis und Methodik können sich über die Jahre geändert haben. Einzelne Monate haben Ausreißer, daher eignen sich gleitende Mittelwerte besser als Einzelwerte.",
        },
        "monate": monatsliste,
        "objekte": objekte,
        "bezirke": {str(b): verlauf[b] for b in BEZIRKE},
    }
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    kb = os.path.getsize(OUT_FILE) / 1024
    print(f"{len(monatsliste)} Monate ({monatsliste[0]} bis {monatsliste[-1]}), fehlend: {fehlend or 'keine'} -> {kb:.0f} KB")


if __name__ == "__main__":
    main()
