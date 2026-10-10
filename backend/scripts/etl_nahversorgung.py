"""
Supermärkte und Lebensmittelgeschäfte in Wien aus OpenStreetMap (Overpass API).

Die Abfrage für ganz Wien läuft auf den öffentlichen Overpass-Servern in ein Timeout.
Deshalb wird das Stadtgebiet in Kacheln zerlegt, jede Kachel einzeln abgefragt und das
Ergebnis zusammengeführt. Die Rohdaten landen in data/raw/osm_nahversorgung.json
(bei vorhandener Datei wird nichts neu geladen).

Usage:
    python backend/scripts/etl_nahversorgung.py          # lädt bei Bedarf und zeigt eine Zusammenfassung

Wird auch von etl_standorte.py genutzt.

License: Daten (c) OpenStreetMap contributors, ODbL - https://www.openstreetmap.org/copyright
"""

import json
import os
import subprocess
import time
import urllib.parse
import urllib.request

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_FILE = os.path.join(BASE_DIR, "data", "raw", "osm_nahversorgung.json")
KACHEL_DIR = os.path.join(BASE_DIR, "data", "raw", "osm_kacheln")  # Zwischenstand: Neustart setzt dort fort

ENDPUNKTE = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
USER_AGENT = "mietcheck-wien/1.0 (https://github.com/MilutinK/mietcheck-wien)"

# Wien mit etwas Rand: (Süd, West, Nord, Ost)
BBOX = (48.10, 16.17, 48.33, 16.58)
KACHELN_LAT = 8
KACHELN_LON = 10
SHOPS = "supermarket|convenience|greengrocer"
PAUSE_S = 2


def kacheln():
    sued, west, nord, ost = BBOX
    dlat = (nord - sued) / KACHELN_LAT
    dlon = (ost - west) / KACHELN_LON
    for i in range(KACHELN_LAT):
        for j in range(KACHELN_LON):
            yield (
                round(sued + i * dlat, 5),
                round(west + j * dlon, 5),
                round(sued + (i + 1) * dlat, 5),
                round(west + (j + 1) * dlon, 5),
            )


def abfrage(kachel):
    s, w, n, o = kachel
    box = f"({s},{w},{n},{o})"
    return (
        f'[out:json][timeout:30];(node["shop"~"^({SHOPS})$"]{box};'
        f'way["shop"~"^({SHOPS})$"]{box};);out center tags;'
    )


def anfrage_curl(endpunkt, abfrage_text):
    """Per curl: Pythons SSL-Prüfung scheitert unter Windows an der Zertifikatskette von overpass-api.de,
    curl kommt damit zurecht. Die Zertifikatsprüfung bleibt dabei eingeschaltet."""
    ergebnis = subprocess.run(
        ["curl", "-sS", "--fail", "-m", "45", "-A", USER_AGENT, "--data-urlencode", f"data={abfrage_text}", endpunkt],
        capture_output=True,
        timeout=60,
    )
    if ergebnis.returncode != 0:
        raise RuntimeError(ergebnis.stderr.decode("utf-8", "replace").strip() or f"curl-Fehler {ergebnis.returncode}")
    return json.loads(ergebnis.stdout)["elements"]


def anfrage_urllib(endpunkt, abfrage_text):
    daten = urllib.parse.urlencode({"data": abfrage_text}).encode()
    req = urllib.request.Request(endpunkt, data=daten, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)["elements"]


def frage(kachel, versuche=6):
    text = abfrage(kachel)
    letzter_fehler = None
    for versuch in range(versuche):
        endpunkt = ENDPUNKTE[versuch % len(ENDPUNKTE)]
        try:
            try:
                return anfrage_curl(endpunkt, text)
            except FileNotFoundError:  # kein curl installiert
                return anfrage_urllib(endpunkt, text)
        except Exception as e:  # Netzwerk, Timeout, HTTP-Fehler: nächster Versuch
            letzter_fehler = e
            time.sleep(5 * (versuch + 1))  # Overpass ist zeitweise überlastet: länger warten
    raise RuntimeError(f"Kachel {kachel} fehlgeschlagen: {letzter_fehler}")


def lade_rohdaten():
    if os.path.exists(RAW_FILE):
        try:
            with open(RAW_FILE, "r", encoding="utf-8") as f:
                return json.load(f)["elements"]
        except (ValueError, KeyError):
            print("Gespeicherte Rohdaten unbrauchbar, lade neu")

    alle = {}
    teile = list(kacheln())
    os.makedirs(KACHEL_DIR, exist_ok=True)
    pfad = lambda nr: os.path.join(KACHEL_DIR, f"{nr:03d}.json")

    # Mehrere Durchgänge: Kacheln, die der (zeitweise überlastete) Server nicht liefert, kommen später noch einmal dran
    offen = [nr for nr in range(1, len(teile) + 1) if not os.path.exists(pfad(nr))]
    for durchgang in range(1, 6):
        if not offen:
            break
        if durchgang > 1:
            print(f"Durchgang {durchgang}: {len(offen)} Kacheln offen, warte 30 s", flush=True)
            time.sleep(30)
        noch_offen = []
        for nr in offen:
            try:
                elemente = frage(teile[nr - 1], versuche=3)
            except RuntimeError as e:
                print(f"  Kachel {nr}/{len(teile)}: {str(e)[-60:]}", flush=True)
                noch_offen.append(nr)
                continue
            with open(pfad(nr), "w", encoding="utf-8") as f:
                json.dump(elemente, f, ensure_ascii=False)
            print(f"  Kachel {nr}/{len(teile)}: {len(elemente)} Treffer", flush=True)
            time.sleep(PAUSE_S)
        offen = noch_offen
    if offen:
        raise RuntimeError(f"{len(offen)} Kacheln nicht ladbar: {offen}. Skript später erneut starten, bereits geladene Kacheln bleiben erhalten.")

    for nr in range(1, len(teile) + 1):
        with open(pfad(nr), "r", encoding="utf-8") as f:
            for e in json.load(f):
                alle[(e["type"], e["id"])] = e  # Elemente an Kachelrändern nur einmal

    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump({"quelle": "OpenStreetMap via Overpass API", "elements": list(alle.values())}, f, ensure_ascii=False)
    return list(alle.values())


def lade_nahversorgung():
    """Liste von Dicts: lon, lat, name, shop (Nodes direkt, Ways über ihren Mittelpunkt)."""
    punkte = []
    gesehen = set()
    for e in lade_rohdaten():
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lon = e.get("lon") or (e.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        tags = e.get("tags", {})
        name = (tags.get("name") or tags.get("brand") or "").strip()
        # Doppelte Einträge (Gebäude plus Punkt im Gebäude) mit gleichem Namen auf ca. 10 m zusammenfassen
        schluessel = (name.lower(), round(lat, 4), round(lon, 4))
        if schluessel in gesehen:
            continue
        gesehen.add(schluessel)
        punkte.append({"lon": round(lon, 5), "lat": round(lat, 5), "name": name, "shop": tags.get("shop", "")})
    return punkte


if __name__ == "__main__":
    daten = lade_nahversorgung()
    arten = {}
    for p in daten:
        arten[p["shop"]] = arten.get(p["shop"], 0) + 1
    print(f"{len(daten)} Geschäfte: {arten}")
    print(f"ohne Namen: {sum(1 for p in daten if not p['name'])}")
