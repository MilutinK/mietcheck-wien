import { useState, useEffect } from "react";
import ViennaMap from "./components/ViennaMap";
import DistrictPanel from "./components/DistrictPanel";
import CompareBar from "./components/CompareBar";
import FilterBar from "./components/FilterBar";
import CompareView from "./components/CompareView";
import type { District, MetricKey } from "./types/district";

import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selected, setSelected] = useState<District | null>(null);
  const [compareA, setCompareA] = useState<District | null>(null);
  const [compareB, setCompareB] = useState<District | null>(null);
  const [metric, setMetric] = useState<MetricKey>("einwohner_pro_km2");
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetch("/data/districts.json")
      .then((r) => r.json())
      .then((data) => setDistricts(data.districts));
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
    setSelected(null);
    setCompareA(null);
    setCompareB(null);
  };

  const handleExitCompare = () => {
    setShowCompare(false);
    setCompareA(null);
    setCompareB(null);
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

        <div className="side-panel">
          <CompareBar
            showCompare={showCompare}
            onStartCompare={handleStartCompare}
            onExitCompare={handleExitCompare}
          />

          {showCompare ? (
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