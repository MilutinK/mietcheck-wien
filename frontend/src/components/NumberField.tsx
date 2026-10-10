interface Props {
  /** "" = leeres Feld */
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  /** Einheit im Feld, z. B. "m²" oder "€/Monat" */
  unit?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** "klein" = schmales Feld neben einem Regler, "normal" = Feld über die ganze Breite */
  size?: "klein" | "normal";
}

/** Zahlenfeld im Look der App: Rahmen um Eingabe und Einheit, Fokus hebt den ganzen Rahmen hervor. */
export default function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  placeholder,
  id,
  ariaLabel,
  ariaLabelledBy,
  size = "normal",
}: Props) {
  return (
    <div className={`zahlfeld zahlfeld--${size}`}>
      <input
        type="number"
        inputMode="decimal"
        id={id}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      {unit && (
        <span className="zahlfeld-einheit" aria-hidden="true">
          {unit}
        </span>
      )}
    </div>
  );
}