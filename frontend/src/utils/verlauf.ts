export type Reihe = (number | null)[];

/** Median einer Zahlenliste; null bei leerer Liste. */
export function median(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const s = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(s.length / 2);
  return s.length % 2 ? s[mitte] : (s[mitte - 1] + s[mitte]) / 2;
}

/**
 * Gleitender Median über die letzten `fenster` Monate (mit dem aktuellen Monat). Der Median ist
 * robuster als der Mittelwert, weil einzelne Monate in den Quelldaten Ausreißer haben.
 * Erst ab `mindestens` vorhandenen Werten im Fenster wird ein Wert ausgegeben, davor null.
 */
export function gleitenderMedian(reihe: Reihe, fenster = 12, mindestens = fenster): Reihe {
  return reihe.map((_, i) => {
    if (i + 1 < fenster) return null;
    const teil = reihe.slice(i + 1 - fenster, i + 1).filter((v): v is number => v !== null);
    return teil.length >= mindestens ? median(teil) : null;
  });
}

/** Wien-Wert je Monat: Median der Bezirkswerte (ungewichtet, es gibt keine Gewichte in den Quelldaten). */
export function wienMedian(bezirke: Reihe[]): Reihe {
  const laenge = bezirke[0]?.length ?? 0;
  return Array.from({ length: laenge }, (_, i) =>
    median(bezirke.map((r) => r[i]).filter((v): v is number => v !== null))
  );
}

/** Prozentuale Veränderung zwischen zwei Werten; null, wenn einer fehlt oder der Start 0 ist. */
export function veraenderungProzent(von: number | null | undefined, bis: number | null | undefined): number | null {
  if (von == null || bis == null || von === 0) return null;
  return ((bis - von) / von) * 100;
}

/** Erster und letzter Index mit Wert; null, wenn die Reihe leer ist. */
export function ersterUndLetzterWert(reihe: Reihe, ab = 0): [number, number] | null {
  let erster = -1;
  let letzter = -1;
  for (let i = ab; i < reihe.length; i++) {
    if (reihe[i] !== null) {
      if (erster < 0) erster = i;
      letzter = i;
    }
  }
  return erster < 0 ? null : [erster, letzter];
}

/** "2024-03" -> "März 2024" */
export function monatsname(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  const namen = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${namen[m - 1]} ${jahr}`;
}
