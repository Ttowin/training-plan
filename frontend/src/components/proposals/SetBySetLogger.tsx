import { useRef, useState } from "react";
import { formatNum, type LoggerProps } from "./types.js";

interface SetRow {
  id: number;
  weight: number | null;
  reps: number;
  done: boolean;
}

export function SetBySetLogger({ exercise, lastWeek, onLog }: LoggerProps) {
  const startWeight = lastWeek?.weight ?? 20;
  const startReps = lastWeek?.reps ?? exercise.reps_max ?? 12;
  const startCount = lastWeek?.sets ?? exercise.default_sets ?? 3;

  // Stable, monotonically increasing id counter (survives re-renders) so every
  // added set gets a unique id — otherwise repeated "Add set" clicks collide.
  const idRef = useRef(0);
  const makeRow = (weight: number | null, reps: number): SetRow => ({ id: ++idRef.current, weight, reps, done: false });

  const [rows, setRows] = useState<SetRow[]>(() =>
    Array.from({ length: startCount }, () => makeRow(lastWeek?.weight ?? startWeight, startReps))
  );

  const round = (v: number) => Math.round(v * 100) / 100;

  function update(id: number, patch: Partial<SetRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addSet() {
    const last = rows[rows.length - 1];
    setRows((rs) => [...rs, makeRow(last?.weight ?? startWeight, last?.reps ?? startReps)]);
  }
  function removeSet(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const doneRows = rows.filter((r) => r.done);
  const volume = doneRows.reduce((acc, r) => acc + (r.weight ?? 0) * r.reps, 0);

  function submit() {
    const logged = doneRows.length > 0 ? doneRows : rows;
    const vol = logged.reduce((acc, r) => acc + (r.weight ?? 0) * r.reps, 0);
    const detail = logged
      .map((r) => `${r.weight == null ? "BW" : formatNum(r.weight)}×${r.reps}`)
      .join(", ");
    onLog({
      method: "Set-by-Set",
      summary: `${logged.length} sets · ${detail}`,
      volume: vol,
      detail,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">
        <span className="w-8">Set</span>
        <span className="flex-1 text-center">Weight (kg)</span>
        <span className="flex-1 text-center">Reps</span>
        <span className="w-10 text-center">Done</span>
        <span className="w-6" />
      </div>

      {rows.map((r, i) => (
        <div
          key={r.id}
          data-testid={`set-row-${i}`}
          className={`flex items-center gap-2 rounded-lg border px-2 py-2 transition-colors ${
            r.done ? "border-matrix-green bg-matrix-green-dark/30" : "border-matrix-border bg-matrix-bg-card"
          }`}
        >
          <span className="w-8 text-center font-terminal text-sm text-matrix-text-muted tabular-nums">{i + 1}</span>

          <div className="flex-1 flex items-center justify-center gap-1">
            <button
              type="button"
              aria-label={`set ${i + 1} decrease weight`}
              onClick={() => update(r.id, { weight: r.weight == null ? 0 : round(Math.max(0, r.weight - 2.5)) })}
              className="w-9 h-9 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors"
            >
              −
            </button>
            <span className="w-12 text-center font-terminal text-base text-matrix-green tabular-nums" data-testid={`set-row-${i}-weight`}>
              {r.weight == null ? "BW" : formatNum(r.weight)}
            </span>
            <button
              type="button"
              aria-label={`set ${i + 1} increase weight`}
              onClick={() => update(r.id, { weight: round((r.weight ?? 0) + 2.5) })}
              className="w-9 h-9 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors"
            >
              +
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center gap-1">
            <button
              type="button"
              aria-label={`set ${i + 1} decrease reps`}
              onClick={() => update(r.id, { reps: Math.max(1, r.reps - 1) })}
              className="w-9 h-9 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-terminal text-base text-matrix-green tabular-nums" data-testid={`set-row-${i}-reps`}>
              {r.reps}
            </span>
            <button
              type="button"
              aria-label={`set ${i + 1} increase reps`}
              onClick={() => update(r.id, { reps: Math.min(99, r.reps + 1) })}
              className="w-9 h-9 rounded border border-matrix-border text-matrix-green font-terminal text-lg hover:border-matrix-green transition-colors"
            >
              +
            </button>
          </div>

          <button
            type="button"
            aria-label={`toggle set ${i + 1} done`}
            data-testid={`set-row-${i}-done`}
            onClick={() => update(r.id, { done: !r.done })}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center font-terminal text-lg transition-all ${
              r.done ? "border-matrix-green bg-matrix-green text-matrix-bg" : "border-matrix-border text-matrix-text-muted hover:border-matrix-green"
            }`}
          >
            {r.done ? "✓" : ""}
          </button>

          <button
            type="button"
            aria-label={`remove set ${i + 1}`}
            onClick={() => removeSet(r.id)}
            disabled={rows.length <= 1}
            className="w-6 text-matrix-red font-terminal text-sm hover:text-matrix-red disabled:opacity-20"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSet}
        data-testid="setbyset-add"
        className="w-full py-2.5 rounded-lg border border-dashed border-matrix-border text-matrix-text-muted font-terminal text-xs uppercase tracking-widest hover:border-matrix-green hover:text-matrix-green transition-colors"
      >
        ⊕ Add set
      </button>

      <div className="flex items-center justify-between px-1">
        <span className="font-terminal text-xs text-matrix-text-muted uppercase tracking-widest">
          {doneRows.length}/{rows.length} sets done
        </span>
        <span className="font-terminal text-sm text-matrix-cyan tabular-nums">{volume.toFixed(0)} kg vol</span>
      </div>

      <button
        type="button"
        onClick={submit}
        data-testid="setbyset-log"
        className="w-full py-4 rounded-xl bg-matrix-green text-matrix-bg font-terminal text-sm tracking-[0.15em] uppercase shadow-matrix-sm hover:bg-matrix-green-dim transition-colors"
      >
        ▸ Log {doneRows.length > 0 ? `${doneRows.length} completed sets` : "all sets"}
      </button>
    </div>
  );
}
