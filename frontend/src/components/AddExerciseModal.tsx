import { useState } from "react";
import { ShorthandInput } from "./ShorthandInput.js";
import type { ParsedShorthand } from "../types/index.js";

interface Props {
  onAdd: (name: string, parsed: ParsedShorthand, raw: string) => Promise<void>;
  onClose: () => void;
}

export function AddExerciseModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedShorthand | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  async function handleAdd() {
    if (!name.trim()) {
      setNameError("Exercise name is required");
      return;
    }
    if (!parsed) return;
    setLoading(true);
    try {
      await onAdd(name.trim(), parsed, raw);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      data-testid="add-exercise-modal"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-matrix-bg border border-matrix-green rounded-t-2xl sm:rounded-2xl p-6 shadow-matrix space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-terminal text-matrix-green text-base tracking-widest uppercase">
            ⊕ Add Exercise
          </h2>
          <button
            onClick={onClose}
            className="text-matrix-text-muted hover:text-matrix-green font-terminal text-lg"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="block text-xs font-terminal text-matrix-text-muted mb-1 uppercase tracking-wider">
            Exercise Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(""); }}
            placeholder="e.g. Cable Crossover"
            data-testid="add-exercise-name-input"
            className={`
              w-full bg-matrix-bg border font-terminal text-matrix-green
              px-3 py-3 rounded text-sm tracking-wider
              placeholder-matrix-text-muted
              focus:outline-none focus:ring-1 focus:ring-matrix-green
              min-h-[44px]
              ${nameError ? "border-matrix-red" : "border-matrix-border"}
            `}
          />
          {nameError && (
            <p className="mt-1 text-xs text-matrix-red font-terminal">⚠ {nameError}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-terminal text-matrix-text-muted mb-1 uppercase tracking-wider">
            Sets / Reps / Weight
          </label>
          <ShorthandInput
            value={raw}
            onChange={(r, p) => { setRaw(r); setParsed(p); }}
            onSubmit={() => handleAdd()}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!parsed || !name.trim() || loading}
          data-testid="add-exercise-submit"
          className={`
            w-full py-3 rounded font-terminal text-sm tracking-widest uppercase transition-all
            ${parsed && name.trim() && !loading
              ? "bg-matrix-green text-matrix-bg hover:bg-matrix-green-dim shadow-matrix"
              : "bg-matrix-bg-card text-matrix-text-muted border border-matrix-border cursor-not-allowed"
            }
          `}
        >
          {loading ? "ADDING..." : "ADD TO SESSION"}
        </button>
      </div>
    </div>
  );
}
