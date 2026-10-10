import { useState, useEffect, useRef, useCallback } from "react";
import ViennaMap from "./components/ViennaMap";
import DistrictPanel from "./components/DistrictPanel";
import FilterBar from "./components/FilterBar";
import CompareView from "./components/CompareView";
import type { District, MetricKey } from "./types/district";
import { loadDistricts } from "./services/api";
import RentCheckView from "./components/RentCheckView";
import RankingView from "./components/RankingView";
import ThemeToggle from "./components/ThemeToggle";
import StandortCheckView from "./components/StandortCheckView";
import { useStandort } from "./hooks/useStandort";
import type { LonLat } from "./utils/geo";
import type { Radius } from "./utils/standort";
import { leseStandortParams, schreibeStandortParams } from "./utils/standortUrl";
import { leseMonatParam, schreibeMonatParam } from "./utils/monatUrl";
import { STANDARD_AUF_KARTE } from "./utils/faktoren";
import type { FaktorId } from "./types/standorte";
import { useTheme } from "./hooks/useTheme";

import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selected, setSelected] = useState<District | null>(null);
  const [compareA, setCompareA] = useState<District | null>(null);
  const [compareB, setCompareB] = useState<District | null>(null);
  const [metric, setMetric] = useState<MetricKey>("bruttomiete_m2");
  const [showCompare, setShowCompare] = useState(false);
  const [showRentCheck, setShowRentCheck] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  // Geteilter Standort aus ?standort=lat,lon&r=500&karte=... (wird einmal beim Start gelesen)
  const [geteilt] = useState(() => leseStandortParams(window.location.search));
  const [showStandort, setShowStandort] = useState(geteilt !== null);
  const [standortPunkt, setStandortPunkt] = useState<LonLat | null>(geteilt?.punkt ?? null);
  const [standortRadius, setStandortRadius] = useState<Radius>(geteilt?.radius ?? 500);
  const [standortSichtbar, setStandortSichtbar] = useState<FaktorId[]>(geteilt?.sichtbar ?? STANDARD_AUF_KARTE);
  // Karte auf den geteilten Punkt zoomen, bis der Nutzer selbst etwas wählt
  const [standortZentrieren, setStandortZentrieren] = useState(geteilt !== null);

  // Gewählter Monat der Zeitreise auf der Karte, aus ?monat=2019-05
  const [zeitMonat, setZeitMonat] = useState<string | null>(() => leseMonatParam(window.location.search));

  const [copied, setCopied] = useState(false);
  const { preference, resolved, choose } = useTheme();
  const standort = useStandort(showStandort ? standortPunkt : null, standortRadius);
  // Wird beim ersten Render gelesen, bevor die URL-Synchronisierung sie überschreibt
  const sharedId = useRef(Number(new URLSearchParams(window.location.search).get("bezirk")));

  // Geteilten Bezirk aus ?bezirk=7 öffnen, sobald die Daten geladen sind
  useEffect(() => {
    loadDistricts().then((loaded) => {
      setDistricts(loaded);
      const shared = loaded.find((d) => d.id === sharedId.current);
      if (shared && !geteilt) setSelected(shared);
    });
  }, [geteilt]);

  // Link zum aktuellen Stand: Bezirk oder Standort (nie beides), dazu der Monat der Zeitreise
  const aktuelleUrl = useCallback((): URL => {
    const url = new URL(window.location.href);
    const stand =
      showStandort && standortPunkt
        ? { punkt: standortPunkt, radius: standortRadius, sichtbar: standortSichtbar }
        : null;
    schreibeStandortParams(url.searchParams, stand);
    if (!stand && selected) url.searchParams.set("bezirk", String(selected.id));
    else url.searchParams.delete("bezirk");
    // Die Zeitreise gibt es nur bei den drei Miet-Kennzahlen
    const hatZeitreise = metric === "bruttomiete_m2" || metric === "miete_altbau" || metric === "miete_neubau";
    schreibeMonatParam(url.searchParams, hatZeitreise ? zeitMonat : null);
    return url;
  }, [selected, showStandort, standortPunkt, standortRadius, standortSichtbar, metric, zeitMonat]);

  // Adressleiste nachführen. Verzögert, weil das Abspielen der Zeitreise den Monat mehrmals pro Sekunde
  // ändert und Browser (Safari) die Zahl der replaceState-Aufrufe begrenzen.
  useEffect(() => {
    if (districts.length === 0) return; // erst nach dem Laden, sonst gehen die Parameter verloren
    const t = window.setTimeout(() => window.history.replaceState(null, "", aktuelleUrl()), 300);
    return () => window.clearTimeout(t);
  }, [aktuelleUrl, districts.length]);

  const handleShare = async () => {
    const link = aktuelleUrl().href; // frisch gebaut, nicht aus der (evtl. noch verzögerten) Adressleiste
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link kopieren:", link);
    }
  };

  const handleDistrictClick = (district: District) => {
    if (showCompare) {
      if (!compareA) {
        setCompareA(district);
      } else if (!compareB && district.id !== compareA.id) {
        setCompareB(district);
      } else {
        setCompareA(district);
        setCompareB(null);
      }
    } else {
      setSelected(district.id === selected?.id ? null : district);
    }
  };

  const handleStartCompare = () => {
    setShowCompare(true);
    setShowRentCheck(false);
    setShowRanking(false);
    setShowStandort(false);
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitCompare = () => {
    setShowCompare(false);
    setCompareA(null);
    setCompareB(null);
  };

  const handleStartRentCheck = () => {
    setShowRentCheck(true);
    setShowCompare(false);
    setShowRanking(false);
    setShowStandort(false);
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitRentCheck = () => {
    setShowRentCheck(false);
  };

  const handleStartRanking = () => {
    setShowRanking(true);
    setShowCompare(false);
    setShowRentCheck(false);
    setShowStandort(false);
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitRanking = () => {
    setShowRanking(false);
  };

  const handleStartStandort = () => {
    setShowStandort(true);
    setStandortZentrieren(false);
    setShowCompare(false);
    setShowRentCheck(false);
    setShowRanking(false);
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitStandort = () => {
    setShowStandort(false);
    setStandortPunkt(null);
    setStandortZentrieren(false);
  };

  const handleStandortOpenDistrict = (district: District) => {
    setShowStandort(false);
    setStandortPunkt(null);
    setSelected(district);
  };

  const handleRankingSelect = (district: District) => {
    setShowRanking(false);
    setSelected(district);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>mietcheck wien</h1>
          <span className="header-subtitle">
            Wohnungsvergleich nach Bezirk
          </span>
        </div>
        <div className="header-right">
          <FilterBar metric={metric} onChange={setMetric} />
          <ThemeToggle preference={preference} onChange={choose} />
        </div>
      </header>

      <main className="app-main">
        {showRanking ? (
          <RankingView districts={districts} onSelect={handleRankingSelect} />
        ) : (
        <div className="map-container">
          {showCompare && (
            <div className="compare-hint">
              {!compareA
                ? "Wähle den ersten Bezirk"
                : !compareB
                  ? "Wähle den zweiten Bezirk"
                  : ""}
            </div>
          )}
          <ViennaMap
            districts={districts}
            metric={metric}
            selected={selected}
            compareA={compareA}
            compareB={compareB}
            onDistrictClick={handleDistrictClick}
            dark={resolved === "dark"}
            standortAktiv={showStandort}
            standort={standort}
            standortSichtbar={standortSichtbar}
            standortZentrieren={standortZentrieren}
            zeitMonat={zeitMonat}
            onZeitMonatChange={setZeitMonat}
            onStandortClick={(lat, lon) => {
              setStandortZentrieren(false);
              setStandortPunkt({ lat, lon });
            }}
          />
        </div>
        )}

        <div className="side-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, padding: "8px 8px 0" }}>
              {showCompare ? (
                <button className="btn btn-secondary" onClick={handleExitCompare} style={{ flex: 1, padding: "12px" }}>
                  ✕ Vergleich beenden
                </button>
              ) : showStandort ? (
                <button className="btn btn-secondary" onClick={handleExitStandort} style={{ flex: 1, padding: "12px" }}>
                  ✕ Standort-Check schließen
                </button>
              ) : showRanking ? (
                <button className="btn btn-secondary" onClick={handleExitRanking} style={{ flex: 1, padding: "12px" }}>
                  ✕ Ranking schließen
                </button>
              ) : showRentCheck ? (
                <button className="btn btn-secondary" onClick={handleExitRentCheck} style={{ flex: 1, padding: "12px" }}>
                  ✕ Mietrechner schließen
                </button>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={handleStartCompare} style={{ flex: 1, padding: "12px" }}>
                    Bezirke vergleichen
                  </button>
                  <button className="btn btn-primary" onClick={handleStartRentCheck} style={{ flex: 1, padding: "12px" }}>
                    Mietrechner
                  </button>
                  <button className="btn btn-primary" onClick={handleStartRanking} style={{ flex: 1, padding: "12px" }}>
                    Ranking
                  </button>
                  <button className="btn btn-primary" onClick={handleStartStandort} style={{ flex: 1, padding: "12px" }}>
                    Standort-Check
                  </button>
                </>
              )}
          </div>

          {showStandort ? (
            <StandortCheckView
              districts={districts}
              ergebnis={standort}
              radius={standortRadius}
              onRadiusChange={setStandortRadius}
              onOpenDistrict={handleStandortOpenDistrict}
              onShare={handleShare}
              kopiert={copied}
              sichtbar={standortSichtbar}
              onToggleSichtbar={(id) =>
                setStandortSichtbar((aktuell) => (aktuell.includes(id) ? aktuell.filter((x) => x !== id) : [...aktuell, id]))
              }
            />
          ) : showRanking ? (
            <div className="panel-empty">
              <p>Wähle eine Kennzahl und klicke einen Bezirk für die Details</p>
            </div>
          ) : showRentCheck ? (
            <RentCheckView districts={districts} onExit={handleExitRentCheck} />
          ) : showCompare ? (
            <CompareView districtA={compareA} districtB={compareB} />
          ) : selected ? (
            <>
              <div style={{ padding: "0 8px 8px" }}>
                <button className="btn btn-secondary" onClick={handleShare}>
                  {copied ? "Link kopiert ✓" : "Bezirk teilen"}
                </button>
              </div>
              <DistrictPanel district={selected} />
            </>
          ) : (
            <div className="panel-empty">
              <p>Klicke auf einen Bezirk für Details</p>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <span>
          Datenquelle: Stadt Wien – data.wien.gv.at | CC BY 4.0 |
          Registerzählung 2023
        </span>
      </footer>
    </div>
  );
}

export default App;