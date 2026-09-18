import { useState } from "react";
import type { Exercise } from "../types/index.js";
import type { ExerciseMethod, WeightMode } from "../utils/parseSeedMethods.js";
import { getWeightLabel } from "../utils/parseSeedMethods.js";

interface Props {
  exercise: Exercise;
  method?: ExerciseMethod | null;
  onSave: (input: { label: string; weightMode: WeightMode; notes?: string; setAsDefault?: boolean }) => void;
  onDelete?: () => void;
  onHide?: () => void;
  onClose: () => void;
}

const WEIGHT_MODES: { value: WeightMode; label: string }[] = [
  { value: "stack", label: "Stack weight (machine / cable)" },
  { value: "per_dumbbell", label: "Per dumbbell" },
  { value: "total", label: "Total weight" },
  { value: "bodyweight", label: "Bodyweight only" },
];

export function MethodEditorSheet({ exercise, method, onSave, onDelete, onHide, onClose }: Props) {
  const isEdit = !!method;
  const [label, setLabel] = useState(method?.label ?? "");
  const [weightMode, setWeightMode] = useState<WeightMode>(method?.weightMode ?? "stack");
  const [notes, setNotes] = useState(method?.notes ?? "");
  const [setAsDefault, setSetAsDefault] = useState(method?.isDefault ?? false);
  const [error, setError] = useState("");

  function handleSave() {
    if (!label.trim()) {
      setError("Method label is required");
      return;
    }
    onSave({
      label: label.trim(),
      weightMode,
      notes: notes.trim() || undefined,
      setAsDefault,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" data-testid="method-editor-sheet">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-matrix-bg border border-matrix-cyan rounded-t-2xl sm:rounded-2xl p-6 shadow-matrix space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-terminal text-matrix-cyan text-base tracking-widest uppercase">
            {isEdit ? "Edit Method" : "New Method"}
          </h2>
          <button onClick={onClose} className="text-matrix-text-muted hover:text-matrix-cyan font-terminal text-lg">
            ✕
          </button>
        </div>

        <div className="text-xs font-terminal text-matrix-text-muted">{exercise.name}</div>

        <div>
          <label className="block text-xs font-terminal text-matrix-text-muted mb-1 uppercase tracking-wider">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError("");
            }}
            placeholder="e.g. Cable crossover"
            data-testid="method-label-input"
            className={`w-full bg-matrix-bg border font-terminal text-matrix-cyan px-3 py-3 rounded text-sm tracking-wider placeholder-matrix-text-muted focus:outline-none focus:ring-1 focus:ring-matrix-cyan min-h-[44px] ${
              error ? "border-matrix-red" : "border-matrix-border"
            }`}
          />
          {error && <p className="mt-1 text-xs text-matrix-red font-terminal">⚠ {error}</p>}
        </div>

        <div>
          <div className="text-xs font-terminal text-matrix-text-muted mb-2 uppercase tracking-wider">
            How do you enter weight?
          </div>
          <div className="space-y-2">
            {WEIGHT_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  weightMode === mode.value
                    ? "border-matrix-cyan bg-matrix-cyan/10 text-matrix-cyan"
                    : "border-matrix-border text-matrix-text-muted hover:border-matrix-cyan/50"
                }`}
              >
                <input
                  type="radio"
                  name="weightMode"
                  value={mode.value}
                  checked={weightMode === mode.value}
                  onChange={() => setWeightMode(mode.value)}
                  data-testid={`method-weight-mode-${mode.value}`}
                  className="accent-matrix-cyan"
                />
                <span className="text-xs font-terminal">{mode.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-[11px] font-terminal text-matrix-text-muted">
            Column label: {getWeightLabel(weightMode)}
          </div>
        </div>

        <div>
          <label className="block text-xs font-terminal text-matrix-text-muted mb-1 uppercase tracking-wider">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Use rope attachment"
            data-testid="method-notes-input"
            className="w-full bg-matrix-bg border border-matrix-border font-terminal text-matrix-cyan px-3 py-3 rounded text-sm tracking-wider placeholder-matrix-text-muted focus:outline-none focus:ring-1 focus:ring-matrix-cyan min-h-[44px]"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-terminal text-matrix-text-muted">
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            data-testid="method-default-checkbox"
            className="accent-matrix-green"
          />
          Set as default method for this exercise
        </label>

        <button
          type="button"
          onClick={handleSave}
          data-testid="method-save-button"
          className="w-full py-3 rounded font-terminal text-sm tracking-widest uppercase bg-matrix-cyan text-matrix-bg hover:bg-matrix-cyan/90 shadow-matrix"
        >
          {isEdit ? "Save changes" : "Save method"}
        </button>

        {isEdit && method?.isSeeded && onHide && (
          <button
            type="button"
            onClick={() => {
              onHide();
              onClose();
            }}
            data-testid="method-hide-button"
            className="w-full py-2 rounded border border-matrix-border font-terminal text-xs text-matrix-text-muted uppercase tracking-widest hover:border-matrix-red hover:text-matrix-red"
          >
            Hide plan default
          </button>
        )}

        {isEdit && !method?.isSeeded && onDelete && (
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            data-testid="method-delete-button"
            className="w-full py-2 rounded border border-matrix-red/40 font-terminal text-xs text-matrix-red uppercase tracking-widest hover:bg-matrix-red/10"
          >
            Delete method
          </button>
        )}
      </div>
    </div>
  );
}
