import { useRef, useState } from "react";
import { MethodSelector } from "./MethodSelector.js";
import { computeVolume } from "../utils/shorthandParser.js";
import type { Exercise, SessionExercise } from "../types/index.js";
import {
  type ExerciseMethod,
  defaultWeightForMode,
  getWeightHelperText,
  getWeightLabel,
} from "../utils/parseSeedMethods.js";

export interface SetInput {
  weight: number | null;
  reps: number;
}

interface Props {
  exercise: Exercise;
  methods: ExerciseMethod[];
  selectedMethod: ExerciseMethod | null;
  onMethodSelect: (methodId: string) => void;
  onAddMethod: () => void;
  onEditMethod: (method: ExerciseMethod) => void;
  /** Last session's sets for this exercise, expanded one entry per set. */
  lastWeekSets: SetInput[];
  /** Sets already logged for this exercise in the current session. */
  loggedSets: SessionExercise[];
  reminders: string[];
  /** Subset of `reminders` that are user-added and therefore removable. */
  customCues?: string[];
  onAddCue?: (cue: string) => void;
  onRemoveCue?: (cue: string) => void;
  onLogSets: (sets: SetInput[]) => Promise<void>;
  disabled?: boolean;
}

interface Row extends SetInput {
  id: number;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export function SetBySetCard({
  exercise,
  methods,
  selectedMethod,
  onMethodSelect,
  onAddMethod,
  onEditMethod,
  lastWeekSets,
  loggedSets,
  reminders,
  customCues,
  onAddCue,
  onRemoveCue,
  onLogSets,
  disabled,
}: Props) {
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
    const fallbackWeight = defaultWeightForMode(selectedMethod?.weightMode ?? "stack");
    return Array.from({ length: n }, () => makeRow(fallbackWeight, exercise.reps_max ?? exercise.reps_min ?? 12));
  });

  const [cues, setCues] = useState<string[]>(reminders);
  const [customSet, setCustomSet] = useState<Set<string>>(new Set(customCues ?? []));
  const [selectedCues, setSelectedCues] = useState<Set<string>>(new Set());
  const [newCue, setNewCue] = useState("");
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
  function toggleCue(cue: string) {
    setSelectedCues((prev) => {
      const next = new Set(prev);
      next.has(cue) ? next.delete(cue) : next.add(cue);
      return next;
    });
  }
  function addCue() {
    const trimmed = newCue.trim();
    setNewCue("");
    if (!trimmed || cues.includes(trimmed)) return;
    setCues((c) => [...c, trimmed]);
    setCustomSet((s) => new Set(s).add(trimmed));
    setShowCues(true);
    onAddCue?.(trimmed);
  }
  function removeCue(cue: string) {
    setCues((c) => c.filter((x) => x !== cue));
    setCustomSet((s) => {
      const next = new Set(s);
      next.delete(cue);
      return next;
    });
    setSelectedCues((s) => {
      const next = new Set(s);
      next.delete(cue);
      return next;
    });
    onRemoveCue?.(cue);
  }

  async function handleLog() {
    if (rows.length === 0 || saving || (methods.length > 0 && !selectedMethod)) return;
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

  const weightMode = selectedMethod?.weightMode ?? "stack";
  const weightLabel = getWeightLabel(weightMode);
  const weightHelper = getWeightHelperText(weightMode);
  const isBodyweight = weightMode === "bodyweight";
  const canLog = rows.length > 0 && (methods.length === 0 || !!selectedMethod);

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
            target {repsLabel} reps
            {selectedMethod ? ` · ${selectedMethod.label}` : exercise.equipment ? ` · ${exercise.equipment}` : ""}
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

      <div className="px-4 pb-3">
        <MethodSelector
          methods={methods}
          selectedId={selectedMethod?.id ?? null}
          onSelect={onMethodSelect}
          onAdd={onAddMethod}
          onEdit={onEditMethod}
          disabled={disabled}
        />
        {selectedMethod?.notes && (
          <div className="mt-2 text-[11px] font-terminal text-matrix-cyan/80">{selectedMethod.notes}</div>
        )}
      </div>

      {/* Reminders / form cues */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => setShowCues((v) => !v)}
          data-testid={`reminders-toggle-${exercise.id}`}
          className="flex items-center gap-1 text-[10px] font-terminal text-matrix-cyan uppercase tracking-widest"
        >
          <span>{showCues ? "▾" : "▸"}</span> Form cues · 提示 ({cues.length})
        </button>
        {showCues && (
          <div className="mt-2 space-y-2" data-testid={`reminders-${exercise.id}`}>
            {cues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cues.map((cue, i) => {
                  const active = selectedCues.has(cue);
                  const custom = customSet.has(cue);
                  return (
                    <span
                      key={cue}
                      className={`inline-flex items-center rounded-lg border text-xs font-terminal transition-all ${
                        active
                          ? "border-matrix-cyan bg-matrix-cyan/15 text-matrix-cyan shadow-matrix-sm"
                          : "border-matrix-border text-matrix-text-muted"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCue(cue)}
                        data-testid={`reminder-cue-${exercise.id}-${i}`}
                        aria-pressed={active}
                        className="pl-2.5 pr-2 py-1.5 hover:text-matrix-cyan"
                      >
                        {active ? "◉ " : "○ "}
                        {cue}
                      </button>
                      {custom && (
                        <button
                          type="button"
                          onClick={() => removeCue(cue)}
                          aria-label={`remove cue ${cue}`}
                          data-testid={`remove-cue-${exercise.id}-${i}`}
                          className="pr-2 pl-1 text-matrix-red hover:text-matrix-red"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCue}
                onChange={(e) => setNewCue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCue();
                  }
                }}
                placeholder="Add a form cue…"
                data-testid={`add-cue-input-${exercise.id}`}
                disabled={disabled}
                className="flex-1 min-h-[40px] bg-matrix-bg border border-matrix-border rounded px-2.5 py-2 font-terminal text-xs text-matrix-cyan placeholder-matrix-text-muted focus:outline-none focus:ring-1 focus:ring-matrix-cyan"
              />
              <button
                type="button"
                onClick={addCue}
                disabled={disabled || newCue.trim().length === 0}
                data-testid={`add-cue-submit-${exercise.id}`}
                className="min-h-[40px] px-3 rounded border border-matrix-cyan/50 text-matrix-cyan font-terminal text-xs uppercase tracking-widest hover:bg-matrix-cyan/10 transition-colors disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last week reference */}
      <div className="px-4 pb-1">
        {lastWeekSets.length > 0 ? (
          <div className="text-xs font-terminal text-matrix-text-muted border-l border-matrix-border pl-2" data-testid={`last-week-ref-${exercise.id}`}>
            Last{selectedMethod ? ` (${selectedMethod.label})` : ""}:{" "}
            {lastWeekSets.map((s) => `${s.weight == null ? "BW" : formatNum(s.weight)}×${s.reps}`).join(", ")}
            {lastVolume > 0 && ` · vol ${lastVolume.toFixed(0)}`}
          </div>
        ) : (
          <div className="text-xs font-terminal text-matrix-text-muted opacity-50">
            {selectedMethod
              ? `No previous data for ${selectedMethod.label} — starting fresh`
              : "No previous data — starting fresh"}
          </div>
        )}
      </div>

      {/* Set rows */}
      <div className="px-4 pb-4 pt-2 border-t border-matrix-border mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">
          <span className="w-6">Set</span>
          <span className="flex-1 text-center">{isBodyweight ? "Mode" : weightLabel}</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="w-6" />
        </div>
        {weightHelper && (
          <div className="text-[10px] font-terminal text-matrix-text-muted">{weightHelper}</div>
        )}

        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2" data-testid={`set-row-${exercise.id}-${i}`}>
            <span className="w-6 text-center font-terminal text-sm text-matrix-text-muted tabular-nums">{i + 1}</span>

            <div className={`flex-1 flex items-center justify-center gap-1 ${isBodyweight ? "opacity-80" : ""}`}>
              {isBodyweight ? (
                <span className="w-12 text-center font-terminal text-base text-matrix-green tabular-nums" data-testid={`set-row-${exercise.id}-${i}-weight`}>
                  BW
                </span>
              ) : (
                <>
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
                </>
              )}
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
          disabled={disabled || saving || !canLog}
          data-testid={`log-sets-${exercise.id}`}
          className="w-full min-h-[48px] py-3 rounded-xl bg-matrix-green text-matrix-bg font-terminal text-sm tracking-[0.15em] uppercase shadow-matrix-sm hover:bg-matrix-green-dim transition-colors disabled:opacity-40"
        >
          {saving ? "SAVING..." : isLogged ? "▸ Update sets" : "▸ Log sets"}
        </button>
      </div>
    </div>
  );
}
