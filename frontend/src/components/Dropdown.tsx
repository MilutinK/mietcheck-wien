import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

export interface DropdownOption<V extends string | number> {
  value: V;
  label: string;
  /** Optionen mit gleicher Gruppe werden unter einer Überschrift zusammengefasst */
  group?: string;
}

interface Props<V extends string | number> {
  options: DropdownOption<V>[];
  /** null = nichts gewählt, dann erscheint der Platzhalter */
  value: V | null;
  onChange: (value: V) => void;
  placeholder?: string;
  /** IDs der Elemente, die diese Auswahl beschriften (z. B. ein <label>) */
  ariaLabelledBy?: string;
  ariaLabel?: string;
  /** "pill" = runder Button (Kopfzeile), "feld" = Formularfeld über die volle Breite */
  variant?: "pill" | "feld";
  /** Eigene Klassen für den Button, ersetzt das Standard-Aussehen (z. B. Chips im Ranking) */
  triggerClassName?: string;
}

interface PopupPosition {
  style: CSSProperties;
}

const ABSTAND = 6;
const RAND = 12;

/**
 * Eigene Auswahlliste statt <select>: Die Optionsliste eines nativen Selects lässt sich nicht
 * gestalten und ist im Dunkelmodus unlesbar. Folgt dem ARIA-Muster "Combobox mit Listbox":
 * Der Fokus bleibt am Button, aria-activedescendant zeigt auf den aktiven Eintrag.
 * Die Liste wird mit position: fixed an den Button gehängt, damit sie weder von scrollenden
 * Bereichen abgeschnitten wird noch hinter der Karte verschwindet.
 */
export default function Dropdown<V extends string | number>({
  options,
  value,
  onChange,
  placeholder = "Auswählen",
  ariaLabelledBy,
  ariaLabel,
  variant = "pill",
  triggerClassName,
}: Props<V>) {
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const wurzel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLUListElement>(null);
  const id = useId();
  const listeId = `${id}-liste`;
  const wertId = `${id}-wert`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  const gewaehlt = options.find((o) => o.value === value) ?? null;

  // Gruppen in Reihenfolge des ersten Auftretens; Optionen ohne Gruppe bilden eine namenlose Gruppe
  const gruppen: { name: string | null; eintraege: { option: DropdownOption<V>; index: number }[] }[] = [];
  options.forEach((option, index) => {
    const name = option.group ?? null;
    let g = gruppen.find((x) => x.name === name);
    if (!g) {
      g = { name, eintraege: [] };
      gruppen.push(g);
    }
    g.eintraege.push({ option, index });
  });

  const berechnePosition = useCallback((): PopupPosition => {
    const r = trigger.current!.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const schmal = vw < 768;

    // Breite: Formularfeld wie der Button; Pill mindestens 260 px, mobil über die ganze Breite
    let breite = variant === "feld" ? r.width : Math.max(r.width, 260);
    let links = variant === "feld" ? r.left : r.right - breite;
    if (schmal && variant === "pill") {
      breite = vw - 2 * RAND;
      links = RAND;
    }
    breite = Math.min(breite, vw - 2 * RAND);
    links = Math.max(RAND, Math.min(links, vw - breite - RAND));

    // Nach oben aufklappen, wenn unten weniger Platz ist als oben
    const platzUnten = vh - r.bottom - ABSTAND - RAND;
    const platzOben = r.top - ABSTAND - RAND;
    const unten = platzUnten >= 220 || platzUnten >= platzOben;
    const maxHoehe = Math.max(160, Math.min(460, unten ? platzUnten : platzOben));

    return {
      style: {
        left: links,
        width: breite,
        maxHeight: maxHoehe,
        ...(unten ? { top: r.bottom + ABSTAND } : { bottom: vh - r.top + ABSTAND }),
      },
    };
  }, [variant]);

  // Schließen bei Klick außerhalb; bei Scrollen oder Größenänderung die Liste neu am Button ausrichten
  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => {
      if (wurzel.current && !wurzel.current.contains(e.target as Node)) setOffen(false);
    };
    const neuAusrichten = (e: Event) => {
      if (popup.current && e.target instanceof Node && popup.current.contains(e.target)) return;
      setPosition(berechnePosition());
    };
    document.addEventListener("mousedown", klick);
    window.addEventListener("resize", neuAusrichten);
    window.addEventListener("scroll", neuAusrichten, true);
    return () => {
      document.removeEventListener("mousedown", klick);
      window.removeEventListener("resize", neuAusrichten);
      window.removeEventListener("scroll", neuAusrichten, true);
    };
  }, [offen, berechnePosition]);

  // Aktiven Eintrag im Sichtbereich halten
  useEffect(() => {
    if (offen) document.getElementById(`${id}-opt-${aktiv}`)?.scrollIntoView({ block: "nearest" });
  }, [offen, aktiv, id]);
  const oeffnen = () => {
    setAktiv(Math.max(0, options.findIndex((o) => o.value === value)));
    setPosition(berechnePosition());
    setOffen(true);
  };

  const waehlen = (i: number) => {
    onChange(options[i].value);
    setOffen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!offen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        oeffnen();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setAktiv((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setAktiv((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setAktiv(0);
        break;
      case "End":
        e.preventDefault();
        setAktiv(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        waehlen(aktiv);
        break;
      case "Escape":
        e.preventDefault();
        setOffen(false);
        break;
      case "Tab":
        setOffen(false);
        break;
    }
  };

  return (
    <div className={`dropdown dropdown--${variant}`} ref={wurzel}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className={triggerClassName ?? "dropdown-trigger"}
        aria-haspopup="listbox"
        aria-expanded={offen}
        aria-controls={listeId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${wertId}` : undefined}
        aria-activedescendant={offen ? optionId(aktiv) : undefined}
        onClick={() => (offen ? setOffen(false) : oeffnen())}
        onKeyDown={onKey}
      >
        <span id={wertId} className="dropdown-wert">
          {gewaehlt ? gewaehlt.label : placeholder}
        </span>
        <svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 5.5 7 9.5 11 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {offen && position && (
        <ul className="dropdown-popup" role="listbox" id={listeId} ref={popup} style={position.style} aria-label={ariaLabel}>
          {gruppen.map((g, gi) => (
            <li key={g.name ?? `g${gi}`} role="presentation">
              {g.name && (
                <div className="dropdown-gruppe" id={`${id}-g-${gi}`} role="presentation">
                  {g.name}
                </div>
              )}
              <ul role="group" aria-labelledby={g.name ? `${id}-g-${gi}` : undefined} className="dropdown-gruppe-liste">
                {g.eintraege.map(({ option, index }) => {
                  const istGewaehlt = option.value === value;
                  return (
                    <li
                      key={String(option.value)}
                      id={optionId(index)}
                      role="option"
                      aria-selected={istGewaehlt}
                      className={`dropdown-option${index === aktiv ? " is-aktiv" : ""}${istGewaehlt ? " is-gewaehlt" : ""}`}
                      onMouseEnter={() => setAktiv(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => waehlen(index)}
                    >
                      <span>{option.label}</span>
                      {istGewaehlt && (
                        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                          <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
