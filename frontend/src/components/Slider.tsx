import type { CSSProperties } from "react";

interface Props {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  id?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
}

/** Schieberegler im Look der App; die Füllung links vom Griff folgt dem Wert (siehe .slider in App.css). */
export default function Slider({ min, max, step = 1, value, onChange, id, ariaLabelledBy, ariaLabel }: Props) {
  const anteil = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  return (
    <input
      type="range"
      className="slider"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--p": anteil } as CSSProperties}
    />
  );
}