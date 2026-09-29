import { useState, useEffect } from "react";
import ViennaMap from "./components/ViennaMap";
import DistrictPanel from "./components/DistrictPanel";
import FilterBar from "./components/FilterBar";
import CompareView from "./components/CompareView";
import type { District, MetricKey } from "./types/district";
import { loadDistricts } from "./services/api";
import RentCheckView from "./components/RentCheckView";
import RankingView from "./components/RankingView";

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

  useEffect(() => {
    loadDistricts().then(setDistricts);
  }, []);

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
            <DistrictPanel district={selected} />
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