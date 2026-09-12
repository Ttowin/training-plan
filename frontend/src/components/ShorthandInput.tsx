import { useState, type ChangeEvent } from "react";
import { parseShorthand, formatShorthand, computeVolume } from "../utils/shorthandParser.js";
import type { ParsedShorthand } from "../types/index.js";

interface Props {
  value: string;
  onChange: (raw: string, parsed: ParsedShorthand | null) => void;
  onSubmit?: (parsed: ParsedShorthand, raw: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ShorthandInput({ value, onChange, onSubmit, placeholder = "e.g. 15x12x3", disabled }: Props) {
  const [touched, setTouched] = useState(false);

  const { parsed, error } = parseShorthand(value);
  const showError = touched && value.trim().length > 0 && error !== null;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const result = parseShorthand(raw);
    onChange(raw, result.parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && parsed && onSubmit) {
      onSubmit(parsed, value);
    }
  }

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          data-testid="shorthand-input"
          className={`
            w-full bg-matrix-bg border font-terminal text-matrix-green
            px-3 py-3 rounded text-sm tracking-wider
            placeholder-matrix-text-muted
            focus:outline-none focus:ring-1
            min-h-[44px]
            transition-all duration-150
            ${showError
              ? "border-matrix-red focus:ring-matrix-red text-matrix-red"
              : parsed
              ? "border-matrix-green focus:ring-matrix-green shadow-matrix-sm"
              : "border-matrix-border focus:ring-matrix-green"
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        />
        {parsed && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-matrix-green-dim text-xs">
            ✓
          </span>
        )}
      </div>

      {showError && (
        <p className="mt-1 text-xs text-matrix-red font-terminal" data-testid="shorthand-error">
          ⚠ {error}
        </p>
      )}

      {parsed && value.trim() && (
        <div
          className="mt-1 text-xs text-matrix-green-dim font-terminal flex gap-3"
          data-testid="shorthand-preview"
        >
          <span>{formatShorthand(parsed.weight, parsed.reps, parsed.sets)}</span>
          <span className="text-matrix-text-muted">
            vol: {computeVolume(parsed.weight, parsed.reps, parsed.sets).toFixed(1)} kg
          </span>
        </div>
      )}
    </div>
  );
}
