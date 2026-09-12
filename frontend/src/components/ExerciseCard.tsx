import { useState } from "react";
import { ShorthandInput } from "./ShorthandInput.js";
import { computeVolume, formatShorthand } from "../utils/shorthandParser.js";
import type { Exercise, SessionExercise, ParsedShorthand } from "../types/index.js";

interface Props {
  exercise: Exercise;
  loggedEntry?: SessionExercise;
  lastWeekEntry?: SessionExercise | null;
  onLog: (exerciseId: number, exerciseName: string, parsed: ParsedShorthand, raw: string) => Promise<void>;
  onDelete?: (entryId: number) => void;
  disabled?: boolean;
}

export function ExerciseCard({ exercise, loggedEntry, lastWeekEntry, onLog, onDelete, disabled }: Props) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedShorthand | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lastWeekVolume = lastWeekEntry
    ? computeVolume(lastWeekEntry.weight_kg, lastWeekEntry.reps ?? 0, lastWeekEntry.sets ?? 0)
    : null;

  const thisWeekVolume = loggedEntry
    ? computeVolume(loggedEntry.weight_kg, loggedEntry.reps ?? 0, loggedEntry.sets ?? 0)
    : null;

  const improved =
    thisWeekVolume !== null && lastWeekVolume !== null && thisWeekVolume > lastWeekVolume;
  const declined =
    thisWeekVolume !== null && lastWeekVolume !== null && thisWeekVolume < lastWeekVolume;

  async function handleLog() {
    if (!parsed) return;
    setLoading(true);
    try {
      await onLog(exercise.id, exercise.name, parsed, raw);
      setRaw("");
      setParsed(null);
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  }

  const repsLabel =
    exercise.reps_min && exercise.reps_max
      ? exercise.reps_min === exercise.reps_max
        ? `${exercise.reps_min}`
        : `${exercise.reps_min}-${exercise.reps_max}`
      : "?";

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all duration-200
        ${loggedEntry
          ? improved
            ? "border-matrix-green bg-matrix-bg-card shadow-matrix-sm"
            : declined
            ? "border-matrix-red bg-matrix-bg-card"
            : "border-matrix-green bg-matrix-bg-card shadow-matrix-sm"
          : "border-matrix-border bg-matrix-bg-card"
        }
      `}
      data-testid={`exercise-card-${exercise.id}`}
    >
      {/* Header */}
      <button
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {loggedEntry && (
              <span className="text-matrix-green text-xs font-terminal">■</span>
            )}
            <span
              className="font-terminal text-sm text-matrix-green truncate"
              data-testid="exercise-name"
            >
              {exercise.name}
            </span>
          </div>
          <div className="text-xs text-matrix-text-muted font-terminal mt-0.5">
            {exercise.default_sets} sets × {repsLabel} reps
            {exercise.equipment && ` · ${exercise.equipment}`}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {loggedEntry ? (
            <div className="text-xs font-terminal">
              <div className={`${improved ? "text-matrix-green" : declined ? "text-matrix-red" : "text-matrix-cyan"}`}>
                {improved && "▲ "}
                {declined && "▼ "}
                {loggedEntry.input_raw ?? formatShorthand(loggedEntry.weight_kg, loggedEntry.reps ?? 0, loggedEntry.sets ?? 0)}
              </div>
              {thisWeekVolume !== null && (
                <div className="text-matrix-text-muted">
                  vol {thisWeekVolume.toFixed(0)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-matrix-text-muted font-terminal">
              {expanded ? "▲" : "▼"}
            </span>
          )}
        </div>
      </button>

      {/* Last week reference */}
      <div className="px-4 pb-1">
        {lastWeekEntry ? (
          <div
            className="text-xs font-terminal text-matrix-text-muted border-l border-matrix-border pl-2"
            data-testid="last-week-ref"
          >
            Last: {lastWeekEntry.input_raw ?? formatShorthand(lastWeekEntry.weight_kg, lastWeekEntry.reps ?? 0, lastWeekEntry.sets ?? 0)}
            {lastWeekVolume !== null && ` · vol ${lastWeekVolume.toFixed(0)}`}
          </div>
        ) : (
          <div
            className="text-xs font-terminal text-matrix-text-muted opacity-50"
            data-testid="no-previous-data"
          >
            No previous data
          </div>
        )}
      </div>

      {/* Input section */}
      {(expanded || (!loggedEntry)) && (
        <div className="px-4 pb-4 pt-2 border-t border-matrix-border mt-2 space-y-3">
          <ShorthandInput
            value={raw}
            onChange={(r, p) => { setRaw(r); setParsed(p); }}
            onSubmit={() => handleLog()}
            disabled={disabled || loading}
          />
          <button
            onClick={handleLog}
            disabled={!parsed || loading || disabled}
            className={`
              w-full py-2.5 rounded font-terminal text-sm tracking-widest uppercase
              transition-all duration-150
              ${parsed && !loading
                ? "bg-matrix-green text-matrix-bg hover:bg-matrix-green-dim shadow-matrix-sm"
                : "bg-matrix-bg-card text-matrix-text-muted border border-matrix-border cursor-not-allowed"
              }
            `}
          >
            {loading ? "LOGGING..." : "LOG EXERCISE"}
          </button>

          {loggedEntry && onDelete && (
            <button
              onClick={() => onDelete(loggedEntry.id)}
              className="w-full py-1.5 text-xs font-terminal text-matrix-red border border-matrix-red/30 rounded hover:border-matrix-red transition-colors"
            >
              REMOVE ENTRY
            </button>
          )}
        </div>
      )}
    </div>
  );
}
