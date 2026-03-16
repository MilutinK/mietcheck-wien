"""
mietcheck-wien – Projekt-Setup

Führt alle Schritte aus um das Projekt startklar zu machen:
1. Daten von data.wien.gv.at herunterladen
2. ETL Pipeline: Rohdaten → districts.json
3. Dateien ins Frontend kopieren

Usage:
    python setup.py

Danach nur noch:
    cd frontend && npm install && npm run dev
"""

import os
import sys
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "backend", "scripts")
PROCESSED_DIR = os.path.join(ROOT_DIR, "data", "processed")
RAW_DIR = os.path.join(ROOT_DIR, "data", "raw")
FRONTEND_DATA_DIR = os.path.join(ROOT_DIR, "frontend", "public", "data")


def run_script(name, path):
    """Führt ein Python-Script aus und zeigt den Output."""
    print(f"\n{'='*60}")
    print(f"  Schritt: {name}")
    print(f"{'='*60}\n")

    result = subprocess.run(
        [sys.executable, path],
        cwd=ROOT_DIR,
    )

    if result.returncode != 0:
        print(f"\n❌ Fehler bei: {name}")
        print("   Bitte prüfe die Ausgabe oben.")
        sys.exit(1)


def copy_to_frontend():
    """Kopiert aufbereitete Daten ins Frontend."""
    print(f"\n{'='*60}")
    print(f"  Schritt: Daten ins Frontend kopieren")
    print(f"{'='*60}\n")

    os.makedirs(FRONTEND_DATA_DIR, exist_ok=True)

    files_to_copy = [
        (os.path.join(PROCESSED_DIR, "districts.json"), "districts.json"),
        (os.path.join(RAW_DIR, "bezirksgrenzen.json"), "bezirksgrenzen.json"),
    ]

    for src, filename in files_to_copy:
        dst = os.path.join(FRONTEND_DATA_DIR, filename)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  ✅ {filename} → frontend/public/data/")
        else:
            print(f"  ⚠️  {src} nicht gefunden – übersprungen")

    # Mietpreise bleiben wo sie sind (manuell gepflegt)
    mietpreise = os.path.join(FRONTEND_DATA_DIR, "mietpreise.json")
    if os.path.exists(mietpreise):
        print(f"  ✅ mietpreise.json bereits vorhanden")
    else:
        print(f"  ⚠️  mietpreise.json fehlt – Mietpreise werden nicht angezeigt")


def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║          mietcheck-wien – Projekt-Setup                 ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # 1. Daten herunterladen
    run_script(
        "Daten herunterladen (data.wien.gv.at)",
        os.path.join(SCRIPTS_DIR, "download_data.py"),
    )

    # 2. ETL Pipeline
    run_script(
        "ETL Pipeline (Rohdaten → districts.json)",
        os.path.join(SCRIPTS_DIR, "etl.py"),
    )

    # 3. Ins Frontend kopieren
    copy_to_frontend()

    # Zusammenfassung
    print(f"\n{'='*60}")
    print(f"  ✅ Setup abgeschlossen!")
    print(f"{'='*60}")
    print()
    print("  Nächste Schritte:")
    print()
    print("    cd frontend")
    print("    npm install        # (nur beim ersten Mal)")
    print("    npm run dev        # → http://localhost:5173")
    print()
    print("  Optional – Backend starten:")
    print()
    print("    cd backend")
    print("    pip install -r requirements.txt")
    print("    uvicorn app.main:app --reload")
    print()


if __name__ == "__main__":
    main()
