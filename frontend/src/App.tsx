import { useState, useEffect, useRef } from "react";
import ViennaMap from "./components/ViennaMap";
import DistrictPanel from "./components/DistrictPanel";
import FilterBar from "./components/FilterBar";
import CompareView from "./components/CompareView";
import type { District, MetricKey } from "./types/district";
import { loadDistricts } from "./services/api";
import RentCheckView from "./components/RentCheckView";
import RankingView from "./components/RankingView";
import ThemeToggle from "./components/ThemeToggle";
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

  const [copied, setCopied] = useState(false);
  const { preference, resolved, choose } = useTheme();
  // Wird beim ersten Render gelesen, bevor die URL-Synchronisierung sie überschreibt
  const sharedId = useRef(Number(new URLSearchParams(window.location.search).get("bezirk")));

  // Geteilten Bezirk aus ?bezirk=7 öffnen, sobald die Daten geladen sind
  useEffect(() => {
    loadDistricts().then((loaded) => {
      setDistricts(loaded);
      const shared = loaded.find((d) => d.id === sharedId.current);
      if (shared) setSelected(shared);
    });
  }, []);

  // URL mit dem gewählten Bezirk synchron halten
  useEffect(() => {
    if (districts.length === 0) return; // erst nach dem Laden, sonst geht ?bezirk verloren
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("bezirk", String(selected.id));
    else url.searchParams.delete("bezirk");
    window.history.replaceState(null, "", url);
  }, [selected, districts.length]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link kopieren:", window.location.href);
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
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitRanking = () => {
    setShowRanking(false);
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
          />
        </div>
        )}

        <div className="side-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, padding: "8px 8px 0" }}>
              {showCompare ? (
                <button className="btn btn-secondary" onClick={handleExitCompare} style={{ flex: 1, padding: "12px" }}>
                  ✕ Vergleich beenden
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
                </>
              )}
          </div>

          {showRanking ? (
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