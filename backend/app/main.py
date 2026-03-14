"""
mietcheck-wien Backend API

FastAPI REST API für Wiener Bezirksdaten.

Usage:
    uvicorn app.main:app --reload

Endpoints:
    GET  /api/districts         Alle Bezirke
    GET  /api/districts/{id}    Einzelner Bezirk
    GET  /api/compare?a=X&b=Y   Bezirksvergleich
    GET  /api/health            Status & Datenstand
    POST /api/refresh           Daten neu laden (API-Key)
"""

import os
import json
import subprocess
import sys
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware

# ── App Setup ──────────────────────────────────────────────────

app = FastAPI(
    title="mietcheck-wien API",
    description="REST API für Wiener Bezirks- und Mietpreisdaten",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mietcheck-wien.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pfade ──────────────────────────────────────────────────────

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.path.join(BASE_DIR, "..", "data", "processed")
MIETPREISE_DIR = os.path.join(BASE_DIR, "..", "data")
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")

DISTRICTS_FILE = os.path.join(DATA_DIR, "districts.json")
MIETPREISE_FILE = os.path.join(BASE_DIR, "..", "frontend", "public", "data", "mietpreise.json")

# ── API Key für Refresh ────────────────────────────────────────

REFRESH_API_KEY = os.environ.get("REFRESH_API_KEY", "dev-key-change-me")

# ── In-Memory Datenstore ───────────────────────────────────────

store = {
    "districts": [],
    "districts_by_id": {},
    "meta": {},
    "mietpreise_meta": {},
    "loaded_at": None,
}


def load_data():
    """Lädt districts.json und mietpreise.json in den Speicher."""

    # Districts laden
    if not os.path.exists(DISTRICTS_FILE):
        print(f"⚠️  {DISTRICTS_FILE} nicht gefunden!")
        return False

    with open(DISTRICTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    districts = data.get("districts", [])

    # Mietpreise laden und mergen
    if os.path.exists(MIETPREISE_FILE):
        with open(MIETPREISE_FILE, "r", encoding="utf-8") as f:
            miet_data = json.load(f)

        miet_by_id = {m["id"]: m for m in miet_data.get("bezirke", [])}
        store["mietpreise_meta"] = miet_data.get("meta", {})

        for district in districts:
            miet = miet_by_id.get(district["id"])
            if miet:
                district["bruttomiete_m2"] = miet.get("bruttomiete_m2")
                district["miete_veraenderung_prozent"] = miet.get("veraenderung_prozent")
                district["miete_confirmed"] = miet.get("confirmed", False)
    else:
        print(f"⚠️  {MIETPREISE_FILE} nicht gefunden – keine Mietpreise geladen")

    store["districts"] = districts
    store["districts_by_id"] = {d["id"]: d for d in districts}
    store["meta"] = data.get("meta", {})
    store["loaded_at"] = datetime.now().isoformat()

    print(f"✅ {len(districts)} Bezirke geladen ({store['loaded_at']})")
    return True


# ── Startup ────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    load_data()


# ── Endpoints ──────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Status und Datenstand."""
    return {
        "status": "ok",
        "bezirke_geladen": len(store["districts"]),
        "daten_geladen_am": store["loaded_at"],
        "datenquellen": {
            "bezirksdaten": store["meta"],
            "mietpreise": store["mietpreise_meta"],
        },
    }


@app.get("/api/districts")
def get_districts(
    sort_by: str = Query(default=None, description="Sortierfeld, z.B. bruttomiete_m2, bevoelkerung, oeffi_score"),
    sort_order: str = Query(default="asc", description="asc oder desc"),
    min_miete: float = Query(default=None, description="Mindest-Bruttomiete €/m²"),
    max_miete: float = Query(default=None, description="Maximal-Bruttomiete €/m²"),
):
    """Alle Bezirke mit optionaler Sortierung und Filterung."""
    districts = store["districts"]

    if not districts:
        raise HTTPException(status_code=503, detail="Keine Daten geladen")

    # Filtern nach Mietpreis
    if min_miete is not None:
        districts = [d for d in districts if (d.get("bruttomiete_m2") or 0) >= min_miete]
    if max_miete is not None:
        districts = [d for d in districts if (d.get("bruttomiete_m2") or 999) <= max_miete]

    # Sortieren
    if sort_by:
        def sort_key(d):
            if sort_by == "oeffi_score":
                return d.get("oeffi", {}).get("score", 0)
            elif sort_by == "bruttomiete_m2":
                return d.get("bruttomiete_m2") or 0
            else:
                return d.get(sort_by, 0)

        reverse = sort_order.lower() == "desc"
        districts = sorted(districts, key=sort_key, reverse=reverse)

    return {
        "count": len(districts),
        "districts": districts,
        "meta": store["meta"],
    }


@app.get("/api/districts/{district_id}")
def get_district(district_id: int):
    """Einzelner Bezirk nach ID (1-23)."""
    district = store["districts_by_id"].get(district_id)

    if not district:
        raise HTTPException(
            status_code=404,
            detail=f"Bezirk {district_id} nicht gefunden. Gültige IDs: 1-23",
        )

    return district


@app.get("/api/compare")
def compare_districts(
    a: int = Query(..., description="ID des ersten Bezirks (1-23)"),
    b: int = Query(..., description="ID des zweiten Bezirks (1-23)"),
):
    """Vergleich zweier Bezirke."""
    district_a = store["districts_by_id"].get(a)
    district_b = store["districts_by_id"].get(b)

    if not district_a:
        raise HTTPException(status_code=404, detail=f"Bezirk {a} nicht gefunden")
    if not district_b:
        raise HTTPException(status_code=404, detail=f"Bezirk {b} nicht gefunden")

    # Vergleichsmetriken berechnen
    def safe_div(val, total):
        return round((val / total) * 100, 1) if total > 0 else 0

    def calc_extras(d):
        rv = d.get("rechtsverhaeltnis", {})
        rv_total = sum(rv.values())
        bp = d.get("bauperioden", {})
        bp_total = sum(bp.values())

        return {
            "anteil_eigentum_pct": safe_div(rv.get("eigentum", 0), rv_total),
            "anteil_gemeinde_pct": safe_div(rv.get("gemeinde", 0), rv_total),
            "anteil_hauptmiete_pct": safe_div(rv.get("hauptmiete", 0), rv_total),
            "anteil_altbau_pct": safe_div(
                bp.get("vor_1919", 0) + bp.get("von_1919_bis_1944", 0), bp_total
            ),
            "miete_70m2": round((d.get("bruttomiete_m2") or 0) * 70, 2),
        }

    return {
        "district_a": {**district_a, **calc_extras(district_a)},
        "district_b": {**district_b, **calc_extras(district_b)},
    }


@app.post("/api/refresh")
def refresh_data(x_api_key: str = Header(default=None)):
    """
    Daten neu laden: Download + ETL + Reload.
    Geschützt per API-Key im Header.
    """
    if x_api_key != REFRESH_API_KEY:
        raise HTTPException(status_code=403, detail="Ungültiger API-Key")

    results = {"steps": [], "success": False}

    # 1. Download
    try:
        download_script = os.path.join(SCRIPTS_DIR, "download_data.py")
        result = subprocess.run(
            [sys.executable, download_script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        results["steps"].append({
            "name": "download",
            "ok": result.returncode == 0,
            "output": result.stdout[-500:] if result.stdout else "",
            "error": result.stderr[-300:] if result.stderr else "",
        })
    except Exception as e:
        results["steps"].append({"name": "download", "ok": False, "error": str(e)})

    # 2. ETL
    try:
        etl_script = os.path.join(SCRIPTS_DIR, "etl.py")
        result = subprocess.run(
            [sys.executable, etl_script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        results["steps"].append({
            "name": "etl",
            "ok": result.returncode == 0,
            "output": result.stdout[-500:] if result.stdout else "",
            "error": result.stderr[-300:] if result.stderr else "",
        })
    except Exception as e:
        results["steps"].append({"name": "etl", "ok": False, "error": str(e)})

    # 3. Reload in Memory
    try:
        ok = load_data()
        results["steps"].append({"name": "reload", "ok": ok})
    except Exception as e:
        results["steps"].append({"name": "reload", "ok": False, "error": str(e)})

    results["success"] = all(s["ok"] for s in results["steps"])
    results["loaded_at"] = store["loaded_at"]
    results["bezirke_count"] = len(store["districts"])

    status_code = 200 if results["success"] else 500
    if not results["success"]:
        raise HTTPException(status_code=status_code, detail=results)

    return results
