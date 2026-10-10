"""
ETL-Script: Mietpreis-Verlauf pro Bezirk (immopreise.at / derStandard.at) -> mietverlauf.json

Lädt die monatlichen PDFs "Immobilienpreise Wohnungen [Altbau |Neubau ]Miete Wien YYYY-MM.pdf"
(Oktober 2013 bis heute), liest die Tabelle mit pdftotext aus und schreibt je Bezirk eine Zeitreihe
des Durchschnittspreises (Bruttomiete in EUR pro m2, Angebotspreise) für Gesamt, Altbau und Neubau.

Usage:
    python backend/scripts/etl_mietverlauf.py

Voraussetzung:
    pdftotext (Poppler) im PATH

Input:
    data/raw/mietverlauf/YYYY-MM.pdf           (Gesamt)
    data/raw/mietverlauf/altbau/YYYY-MM.pdf
    data/raw/mietverlauf/neubau/YYYY-MM.pdf    (werden bei Bedarf geladen, vorhandene Dateien bleiben)

Output:
    frontend/public/data/mietverlauf.json

Quelle: immopreise.at / derStandard.at Immobilien (Angebotspreise)
"""

import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
from datetime import date

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "mietverlauf")
OUT_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "mietverlauf.json")

URL = (
    "https://images.derstandard.at/upload/imagesanzeiger/immopreise/pdf/"
    "{y}/{m:02d}/Immobilienpreise%20Wohnungen%20{art}Miete%20Wien%20{y}-{m:02d}.pdf"
)

# Schlüssel in der Ausgabe -> (Teil des Dateinamens, Unterordner für die Rohdaten)
ARTEN = {
    "gesamt": ("", ""),
    "altbau": ("Altbau%20", "altbau"),
    "neubau": ("Neubau%20", "neubau"),
}

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


def lade_pdf(art, y, m):
    """Gibt den Pfad der PDF zurück oder None, wenn es für den Monat keine gibt (HTTP 404)."""
    namensteil, unterordner = ARTEN[art]
    ordner = os.path.join(RAW_DIR, unterordner)
    os.makedirs(ordner, exist_ok=True)
    pfad = os.path.join(ordner, f"{y}-{m:02d}.pdf")
    if os.path.exists(pfad) and os.path.getsize(pfad) > 1000:
        return pfad
    url = URL.format(y=y, m=m, art=namensteil)
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
        raise RuntimeError(f"{art} {y}-{m:02d}: HTTP {code}")
    time.sleep(PAUSE_S)
    return pfad


def lese_pdf(pfad):
    """-> ({bezirk: Durchschnitt oder None}, Objektanzahl oder None)"""
    text = subprocess.run(["pdftotext", "-layout", pfad, "-"], capture_output=True, check=True).stdout.decode("latin-1")
    werte = {}
    for zeile in text.splitlines():
        m = re.match(r"\s*(\d+)\.,\s+(.+?)\s{2,}(.*)$", zeile)
        if not m:
            continue
        zahlen = re.findall(r"k\.A\.|\d+(?:,\d+)?", m.group(3))
        # Gesamt hat 5 Spalten, Altbau und Neubau 4 (<80, 81-129, >130, Durchschnitt). Einzelne PDFs lassen eine
        # Zelle leer (z. B. 2014-07, Bezirk 20), dann ist es eine weniger. Der Durchschnitt steht immer in der
        # letzten Spalte und genügt hier.
        if not 3 <= len(zahlen) <= 5:
            continue
        letzter = zahlen[-1]
        werte[int(m.group(1))] = None if letzter == "k.A." else float(letzter.replace(",", "."))
    objekte = re.search(r"Gesamtanzahl der Objekte:\s*(\d+)", text)
    return werte, int(objekte.group(1)) if objekte else None


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    liste = list(monate())
    serien = {art: {b: [] for b in BEZIRKE} for art in ARTEN}
    objekte = {art: [] for art in ARTEN}
    monatsliste = []
    fehlend = []
    probleme = []

    for y, m in liste:
        key = f"{y}-{m:02d}"
        pfad_gesamt = lade_pdf("gesamt", y, m)
        if pfad_gesamt is None:
            fehlend.append(key)  # Monat existiert nicht (Januar 2014): für alle Arten auslassen
            continue

        monat_ok = {}
        for art in ARTEN:
            pfad = pfad_gesamt if art == "gesamt" else lade_pdf(art, y, m)
            if pfad is None:
                monat_ok[art] = None  # für diese Art fehlt der Monat: Lücke (null) statt Absturz
                continue
            werte, anzahl = lese_pdf(pfad)
            if set(werte) != set(BEZIRKE):
                probleme.append(f"{key} {art}: {len(werte)} Bezirke gelesen")
                monat_ok[art] = None
                continue
            schlecht = [b for b, v in werte.items() if v is not None and not (MIN_PREIS <= v <= MAX_PREIS)]
            if schlecht:
                probleme.append(f"{key} {art}: unplausibel in Bezirk {schlecht}")
                monat_ok[art] = None
                continue
            monat_ok[art] = (werte, anzahl)

        if monat_ok["gesamt"] is None:
            continue  # ohne Gesamtwert ist der Monat nicht verwendbar
        monatsliste.append(key)
        for art in ARTEN:
            ergebnis = monat_ok[art]
            objekte[art].append(ergebnis[1] if ergebnis else None)
            for b in BEZIRKE:
                serien[art][b].append(ergebnis[0][b] if ergebnis else None)
        print(f"  {key}: ok", flush=True)

    if probleme:
        print("PROBLEME (diese Werte fehlen in der Ausgabe):")
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
            "hinweis": "Angebotspreise, keine Abschlüsse. Die Zahl der berücksichtigten Objekte schwankt stark (siehe objekte, z. B. rund 5.000 pro Monat 2013, rund 29.000 2021, rund 3.600 2025); Basis und Methodik können sich über die Jahre geändert haben. Einzelne Monate haben Ausreißer, daher eignen sich gleitende Mittelwerte besser als Einzelwerte. null = weniger als 4 Objekte (k.A.), bei Altbau und Neubau in kleinen Bezirken oft.",
        },
        "monate": monatsliste,
        "objekte": objekte["gesamt"],
        "bezirke": {str(b): serien["gesamt"][b] for b in BEZIRKE},
        "altbau": {str(b): serien["altbau"][b] for b in BEZIRKE},
        "neubau": {str(b): serien["neubau"][b] for b in BEZIRKE},
    }
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    kb = os.path.getsize(OUT_FILE) / 1024
    print(f"{len(monatsliste)} Monate ({monatsliste[0]} bis {monatsliste[-1]}), fehlend: {fehlend or 'keine'} -> {kb:.0f} KB")
    for art in ("altbau", "neubau"):
        luecken = sum(1 for b in BEZIRKE for v in serien[art][b] if v is None)
        gesamt = len(BEZIRKE) * len(monatsliste)
        print(f"  {art}: {gesamt - luecken} von {gesamt} Werten vorhanden ({luecken} k.A.)")


if __name__ == "__main__":
    main()
