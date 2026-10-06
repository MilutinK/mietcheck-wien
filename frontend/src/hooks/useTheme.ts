import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "mietcheck-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLORS = { light: "#f3eee4", dark: "#121418" };

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage kann blockiert sein (privates Fenster, gesperrte Cookies)
  }
  return "system";
}

function subscribeSystemDark(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const systemIsDark = () => window.matchMedia(DARK_QUERY).matches;

/**
 * Hell/Dunkel-Umschaltung: "system" folgt dem Betriebssystem, die Wahl wird
 * gemerkt und als data-theme am <html> gesetzt (siehe Variablen in App.css).
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const systemDark = useSyncExternalStore(subscribeSystemDark, systemIsDark, () => false);

  const resolved: "light" | "dark" = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", preference);

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
  }, [preference, resolved]);

  const choose = useCallback((next: ThemePreference) => {
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Wahl gilt dann nur für diese Sitzung
    }
  }, []);

  return { preference, resolved, choose };
}
