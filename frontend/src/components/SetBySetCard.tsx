import { useRef, useState } from "react";
import { computeVolume } from "../utils/shorthandParser.js";
import type { Exercise, SessionExercise } from "../types/index.js";

export interface SetInput {
  weight: number | null;
  reps: number;
}

interface Props {
  exercise: Exercise;
  /** Last session's sets for this exercise, expanded one entry per set. */
  lastWeekSets: SetInput[];
  /** Sets already logged for this exercise in the current session. */
  loggedSets: SessionExercise[];
  reminders: string[];
  onLogSets: (sets: SetInput[]) => Promise<void>;
  disabled?: boolean;
}

interface Row extends SetInput {
  id: number;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export function SetBySetCard({ exercise, lastWeekSets, loggedSets, reminders, onLogSets, disabled }: Props) {
  const idRef = useRef(0);
  const makeRow = (weight: number | null, reps: number): Row => ({ id: ++idRef.current, weight, reps });

  const [rows, setRows] = useState<Row[]>(() => {
    // Prefill priority: what's already logged this session → last week → sensible defaults.
    if (loggedSets.length > 0) {
      return loggedSets.flatMap((e) => {
        const count = e.sets && e.sets > 1 ? e.sets : 1;
        return Array.from({ length: count }, () => makeRow(e.weight_kg, e.reps ?? exercise.reps_max ?? 10));
      });
    }
    if (lastWeekSets.length > 0) {
      return lastWeekSets.map((s) => makeRow(s.weight, s.reps));
    }
    const n = exercise.default_sets && exercise.default_sets > 0 ? exercise.default_sets : 3;
    return Array.from({ length: n }, () => makeRow(20, exercise.reps_max ?? exercise.reps_min ?? 12));
  });

  const [selectedCues, setSelectedCues] = useState<Set<number>>(new Set());
  const [showCues, setShowCues] = useState<boolean>(reminders.length > 0);
  const [saving, setSaving] = useState(false);

  const round = (v: number) => Math.round(v * 100) / 100;

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addSet() {
    const last = rows[rows.length - 1];
    setRows((rs) => [...rs, makeRow(last?.weight ?? 20, last?.reps ?? exercise.reps_max ?? 12)]);
  }
  function removeSet(id: number) {
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));
  }
  function toggleCue(i: number) {
    setSelectedCues((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleLog() {
    if (rows.length === 0 || saving) return;
    setSaving(true);
    try {
      await onLogSets(rows.map((r) => ({ weight: r.weight, reps: r.reps })));
    } finally {
      setSaving(false);
    }
  }

  const isLogged = loggedSets.length > 0;
  const thisVolume = rows.reduce((acc, r) => acc + (r.weight ?? 0) * r.reps, 0);
  const lastVolume = lastWeekSets.reduce((acc, s) => acc + (s.weight ?? 0) * s.reps, 0);
  const loggedVolume = loggedSets.reduce(
    (acc, e) => acc + computeVolume(e.weight_kg, e.reps ?? 0, e.sets ?? 1),
    0
  );
  const improved = isLogged && lastVolume > 0 && loggedVolume > lastVolume;
  const declined = isLogged && lastVolume > 0 && loggedVolume < lastVolume;

  const repsLabel =
    exercise.reps_min && exercise.reps_max
      ? exercise.reps_min === exercise.reps_max
        ? `${exercise.reps_min}`
        : `${exercise.reps_min}-${exercise.reps_max}`
      : "?";

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isLogged
          ? declined
            ? "border-matrix-red bg-matrix-bg-card"
            : "border-matrix-green bg-matrix-bg-card shadow-matrix-sm"
          : "border-matrix-border bg-matrix-bg-card"
      }`}
      data-testid={`exercise-card-${exercise.id}`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isLogged && <span className="text-matrix-green text-xs font-terminal">■</span>}
            <span className="font-terminal text-sm text-matrix-green truncate" data-testid="exercise-name">
              {exercise.name}
            </span>
          </div>
          <div className="text-xs text-matrix-text-muted font-terminal mt-0.5">
            target {repsLabel} reps{exercise.equipment ? ` · ${exercise.equipment}` : ""}
          </div>
        </div>
        {isLogged && (
          <div className="text-right flex-shrink-0">
            <div
              className={`text-xs font-terminal ${improved ? "text-matrix-green" : declined ? "text-matrix-red" : "text-matrix-cyan"}`}
              data-testid={`logged-summary-${exercise.id}`}
            >
              {improved && "▲ "}
              {declined && "▼ "}
              {loggedSets.length} set{loggedSets.length === 1 ? "" : "s"} logged
            </div>
            <div className="text-matrix-text-muted text-xs font-terminal">vol {loggedVolume.toFixed(0)}</div>
          </div>
        )}
      </div>

      {/* Reminders / form cues */}
      {reminders.length > 0 && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowCues((v) => !v)}
            data-testid={`reminders-toggle-${exercise.id}`}
            className="flex items-center gap-1 text-[10px] font-terminal text-matrix-cyan uppercase tracking-widest"
          >
            <span>{showCues ? "▾" : "▸"}</span> Form cues · 提示 ({reminders.length})
          </button>
          {showCues && (
            <div className="flex flex-wrap gap-2 mt-2" data-testid={`reminders-${exercise.id}`}>
              {reminders.map((cue, i) => {
                const active = selectedCues.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleCue(i)}
                    data-testid={`reminder-cue-${exercise.id}-${i}`}
                    aria-pressed={active}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-terminal transition-all ${
                      active
                        ? "border-matrix-cyan bg-matrix-cyan/15 text-matrix-cyan shadow-matrix-sm"
                        : "border-matrix-border text-matrix-text-muted hover:border-matrix-cyan hover:text-matrix-cyan"
                    }`}
                  >
                    {active ? "◉ " : "○ "}
                    {cue}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Last week reference */}
      <div className="px-4 pb-1">
        {lastWeekSets.length > 0 ? (
          <div className="text-xs font-terminal text-matrix-text-muted border-l border-matrix-border pl-2" data-testid={`last-week-ref-${exercise.id}`}>
            Last: {lastWeekSets.map((s) => `${s.weight == null ? "BW" : formatNum(s.weight)}×${s.reps}`).join(", ")}
            {lastVolume > 0 && ` · vol ${lastVolume.toFixed(0)}`}
          </div>
        ) : (
          <div className="text-xs font-terminal text-matrix-text-muted opacity-50">No previous data — starting fresh</div>
        )}
      </div>

      {/* Set rows */}
      <div className="px-4 pb-4 pt-2 border-t border-matrix-border mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">
          <span className="w-6">Set</span>
          <span className="flex-1 text-center">Weight (kg)</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="w-6" />
        </div>

        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2" data-testid={`set-row-${exercise.id}-${i}`}>
            <span className="w-6 text-center font-terminal text-sm text-matrix-text-muted tabular-nums">{i + 1}</span>

            <div className="flex-1 flex items-center justify-center gap-1">
              <button
                type="button"
                aria-label={`set ${i + 1} decrease weight`}
                disabled={disabled}
                onClick={() => update(r.id, { weight: r.weight == null ? 0 : round(Math.max(0, r.weight - 2.5)) })}
                className="w-10 h-10 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors disabled:opacity-30"
              >
                −
              </button>
              <span className="w-12 text-center font-terminal text-base text-matrix-green tabular-nums" data-testid={`set-row-${exercise.id}-${i}-weight`}>
                {r.weight == null ? "BW" : formatNum(r.weight)}
              </span>
              <button
                type="button"
                aria-label={`set ${i + 1} increase weight`}
                disabled={disabled}
                onClick={() => update(r.id, { weight: round((r.weight ?? 0) + 2.5) })}
                className="w-10 h-10 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center gap-1">
              <button
                type="button"
                aria-label={`set ${i + 1} decrease reps`}
                disabled={disabled}
                onClick={() => update(r.id, { reps: Math.max(1, r.reps - 1) })}
                className="w-10 h-10 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors disabled:opacity-30"
              >
                −
              </button>
              <span className="w-8 text-center font-terminal text-base text-matrix-green tabular-nums" data-testid={`set-row-${exercise.id}-${i}-reps`}>
                {r.reps}
              </span>
              <button
                type="button"
                aria-label={`set ${i + 1} increase reps`}
                disabled={disabled}
                onClick={() => update(r.id, { reps: Math.min(99, r.reps + 1) })}
                className="w-10 h-10 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="button"
              aria-label={`remove set ${i + 1}`}
              onClick={() => removeSet(r.id)}
              disabled={disabled || rows.length <= 1}
              className="w-6 text-matrix-red font-terminal text-sm hover:text-matrix-red disabled:opacity-20"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addSet}
          disabled={disabled}
          data-testid={`add-set-${exercise.id}`}
          className="w-full py-2 rounded-lg border border-dashed border-matrix-border text-matrix-text-muted font-terminal text-xs uppercase tracking-widest hover:border-matrix-green hover:text-matrix-green transition-colors disabled:opacity-30"
        >
          ⊕ Add set
        </button>

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="font-terminal text-xs text-matrix-text-muted uppercase tracking-widest">
            {rows.length} set{rows.length === 1 ? "" : "s"}
          </span>
          <span className="font-terminal text-xs text-matrix-cyan tabular-nums">{thisVolume.toFixed(0)} kg vol</span>
        </div>

        <button
          type="button"
          onClick={handleLog}
          disabled={disabled || saving || rows.length === 0}
          data-testid={`log-sets-${exercise.id}`}
          className="w-full min-h-[48px] py-3 rounded-xl bg-matrix-green text-matrix-bg font-terminal text-sm tracking-[0.15em] uppercase shadow-matrix-sm hover:bg-matrix-green-dim transition-colors disabled:opacity-40"
        >
          {saving ? "SAVING..." : isLogged ? "▸ Update sets" : "▸ Log sets"}
        </button>
      </div>
    </div>
  );
}
