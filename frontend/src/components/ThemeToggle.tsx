import type { ThemePreference } from "../hooks/useTheme";

interface Props {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "Auto" },
  { key: "light", label: "Hell" },
  { key: "dark", label: "Dunkel" },
];

export default function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div className="theme-toggle" role="group" aria-label="Farbschema">
      {OPTIONS.map((o) => (
        <button key={o.key} aria-pressed={preference === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
