const MONAT = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Liest ?monat=2019-05 (Zeitreise auf der Karte); null bei fehlendem oder ungültigem Wert. */
export function leseMonatParam(search: string): string | null {
  const roh = new URLSearchParams(search).get("monat");
  return roh !== null && MONAT.test(roh) ? roh : null;
}

/** Schreibt den Monat in die Parameter bzw. entfernt ihn bei null. */
export function schreibeMonatParam(params: URLSearchParams, monat: string | null): void {
  if (monat !== null && MONAT.test(monat)) params.set("monat", monat);
  else params.delete("monat");
}
