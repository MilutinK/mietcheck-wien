"""
Download all Open Data sources for mietcheck-wien.

Usage:
    python scripts/download_data.py

Sources:
    - Bezirksgrenzen Wien (GeoJSON via WFS)
    - Registerzählung 2023 – Wohnungen & Bevölkerung (CSV)
    - Gebäudeinformation Standorte Wien (CSV via WFS)
    - Wiener Linien Haltestellen (CSV via WFS)
    - Statistisches Jahrbuch Wien 2025 (ZIP mit allen Tabellen)

License: CC BY 4.0 – Datenquelle: Stadt Wien – data.wien.gv.at
"""

import os
import urllib.request
import time
import zipfile

# ── Konfiguration ──────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
SOURCES = [
    {
        "name": "Bezirksgrenzen Wien (GeoJSON)",
        "filename": "bezirksgrenzen.json",
        "url": (
            "https://data.wien.gv.at/daten/geo?service=WFS"
            "&request=GetFeature&version=1.1.0"
            "&typeName=ogdwien:BEZIRKSGRENZEOGD"
            "&srsName=EPSG:4326&outputFormat=json"
        ),
    },
    {
        "name": "Registerzählung 2023 – Wohnungen & Bevölkerung",
        "filename": "registerzaehlung_2023.csv",
        "url": "https://www.wien.gv.at/data/ogd/ma23/vie-405-2023.csv",
    },
    {
        "name": "Gebäudeinformation Standorte Wien",
        "filename": "gebaeudeinformation.csv",
        "url": (
            "https://data.wien.gv.at/daten/geo?service=WFS"
            "&request=GetFeature&version=1.1.0"
            "&typeName=ogdwien:GEBAEUDEINFOOGD"
            "&srsName=EPSG:4326&outputFormat=csv"
        ),
    },
    {
        "name": "Wiener Linien – Haltestellen",
        "filename": "wienerlinien_haltestellen.csv",
        "url": (
            "https://data.wien.gv.at/daten/geo?service=WFS"
            "&request=GetFeature&version=1.1.0"
            "&typeName=ogdwien:HALTESTELLEWLOGD"
            "&srsName=EPSG:4326&outputFormat=csv"
        ),
    },
    {
        "name": "Statistisches Jahrbuch Wien 2025 (ZIP)",
        "filename": "jahrbuch-wien-2025.zip",
        "url": "https://www.wien.gv.at/data/ogd/ma23/jahrbuch-wien-2025.zip",
        "unzip": True,
    },
]


# ── Download-Logik ─────────────────────────────────────────────

def download_file(url: str, filepath: str, name: str) -> bool:
    """Lädt eine Datei herunter und gibt True bei Erfolg zurück."""
    try:
        print(f"  ⬇  Lade: {name}")
        print(f"     URL:  {url[:80]}...")

        req = urllib.request.Request(url, headers={"User-Agent": "mietcheck-wien/1.0"})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read()

        with open(filepath, "wb") as f:
            f.write(data)

        size_kb = len(data) / 1024
        if size_kb > 1024:
            print(f"  ✅ Gespeichert: {filepath} ({size_kb / 1024:.1f} MB)")
        else:
            print(f"  ✅ Gespeichert: {filepath} ({size_kb:.1f} KB)")
        return True

    except Exception as e:
        print(f"  ❌ Fehler bei {name}: {e}")
        return False


def unzip_file(filepath: str, target_dir: str):
    """Entpackt eine ZIP-Datei in einen Unterordner."""
    folder_name = os.path.splitext(os.path.basename(filepath))[0]
    extract_dir = os.path.join(target_dir, folder_name)
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(filepath, "r") as zf:
            zf.extractall(extract_dir)
        file_count = len(zf.namelist())
        print(f"  📦 Entpackt: {file_count} Dateien → {extract_dir}")
    except Exception as e:
        print(f"  ❌ Fehler beim Entpacken: {e}")


def main():
    print("=" * 60)
    print("  mietcheck-wien – Daten-Download")
    print("=" * 60)
    print()

    # data/raw/ Ordner erstellen falls er nicht existiert
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"📁 Zielordner: {os.path.abspath(DATA_DIR)}")
    print()

    success = 0
    failed = 0

    for source in SOURCES:
        filepath = os.path.join(DATA_DIR, source["filename"])

        if os.path.exists(filepath):
            print(f"  ⏭  Übersprungen (existiert bereits): {source['filename']}")
            success += 1
        else:
            if download_file(source["url"], filepath, source["name"]):
                success += 1
                # ZIP entpacken falls gewünscht
                if source.get("unzip"):
                    unzip_file(filepath, DATA_DIR)
            else:
                failed += 1
            # Kurze Pause zwischen Downloads (höflich gegenüber dem Server)
            time.sleep(1)

        print()

    # Zusammenfassung
    print("=" * 60)
    print(f"  Ergebnis: {success} OK, {failed} fehlgeschlagen")
    print("=" * 60)

    if failed > 0:
        print()
        print("⚠️  Einige Downloads sind fehlgeschlagen.")
        print("   Prüfe deine Internetverbindung und versuche es erneut.")
        exit(1)

    print()
    print("🎉 Alle Daten erfolgreich heruntergeladen!")
    print()
    print("Dateien in data/raw/:")
    for f in sorted(os.listdir(DATA_DIR)):
        full = os.path.join(DATA_DIR, f)
        if os.path.isfile(full):
            size = os.path.getsize(full) / 1024
            print(f"  📄 {f} ({size:.1f} KB)")
        elif os.path.isdir(full):
            count = len(os.listdir(full))
            print(f"  📁 {f}/ ({count} Dateien)")
    print()
    print("Nächster Schritt:")
    print("  python scripts/explore_data.py")


if __name__ == "__main__":
    main()