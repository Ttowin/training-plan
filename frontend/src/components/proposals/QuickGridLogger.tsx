import { useMemo, useState } from "react";
import { computeVolume, formatShorthand } from "../../utils/shorthandParser.js";
import { formatNum, type LoggerProps } from "./types.js";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testid?: string;
}

function Chip({ active, onClick, children, testid }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`min-h-[44px] min-w-[52px] px-3 rounded-lg border font-terminal text-sm tabular-nums transition-all active:scale-95 ${
        active
          ? "border-matrix-green bg-matrix-green text-matrix-bg shadow-matrix-sm"
          : "border-matrix-border text-matrix-green hover:border-matrix-green hover:bg-matrix-green-dark/30"
      }`}
    >
      {children}
    </button>
  );
}

export function QuickGridLogger({ exercise, lastWeek, onLog }: LoggerProps) {
  const baseWeight = lastWeek?.weight ?? 20;
  const weightOptions = useMemo(() => {
    const opts = [-5, -2.5, 0, 2.5, 5]
      .map((d) => Math.round((baseWeight + d) * 100) / 100)
      .filter((w) => w > 0);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }, [baseWeight]);

  const repMid = exercise.reps_max ?? lastWeek?.reps ?? 12;
  const repOptions = Array.from(new Set([8, 10, 12, 15, repMid].filter((r) => r > 0))).sort((a, b) => a - b);
  const setOptions = [1, 2, 3, 4, 5];

  const [bw, setBw] = useState<boolean>(lastWeek?.weight == null);
  const [weight, setWeight] = useState<number>(lastWeek?.weight ?? baseWeight);
  const [reps, setReps] = useState<number>(lastWeek?.reps ?? repMid);
  const [sets, setSets] = useState<number>(lastWeek?.sets ?? exercise.default_sets ?? 3);

  const effWeight = bw ? null : weight;
  const volume = computeVolume(effWeight, reps, sets);
  const round = (v: number) => Math.round(v * 100) / 100;

  function submit() {
    onLog({
      method: "Quick Select",
      summary: formatShorthand(effWeight, reps, sets),
      volume,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">Weight (kg)</span>
          <button
            type="button"
            onClick={() => setBw((v) => !v)}
            data-testid="grid-bw"
            className={`px-2 py-1 rounded border font-terminal text-[10px] uppercase tracking-widest transition-colors ${
              bw ? "border-matrix-cyan text-matrix-cyan bg-matrix-cyan/10" : "border-matrix-border text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green"
            }`}
          >
            Bodyweight
          </button>
        </div>
        <div className={`flex flex-wrap gap-2 ${bw ? "opacity-30 pointer-events-none" : ""}`}>
          {weightOptions.map((w) => (
            <Chip key={w} active={!bw && weight === w} onClick={() => setWeight(w)} testid={`grid-weight-${w}`}>
              {formatNum(w)}
            </Chip>
          ))}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeight((w) => round(Math.max(0, w - 2.5)))}
              className="min-h-[44px] w-11 rounded-lg border border-matrix-border text-matrix-green font-terminal text-xl hover:border-matrix-green transition-colors"
              aria-label="decrease weight"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setWeight((w) => round(w + 2.5))}
              className="min-h-[44px] w-11 rounded-lg border border-matrix-border text-matrix-green font-terminal text-xl hover:border-matrix-green transition-colors"
              aria-label="increase weight"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div>
        <span className="block mb-2 text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">
          Reps {exercise.reps_min && exercise.reps_max ? `· target ${exercise.reps_min}-${exercise.reps_max}` : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          {repOptions.map((r) => (
            <Chip key={r} active={reps === r} onClick={() => setReps(r)} testid={`grid-reps-${r}`}>
              {r}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <span className="block mb-2 text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">Sets</span>
        <div className="flex flex-wrap gap-2">
          {setOptions.map((s) => (
            <Chip key={s} active={sets === s} onClick={() => setSets(s)} testid={`grid-sets-${s}`}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-matrix-border bg-matrix-bg-card px-3 py-2 flex items-center justify-between">
        <span className="font-terminal text-sm text-matrix-green">{formatShorthand(effWeight, reps, sets)}</span>
        <span className="font-terminal text-xs text-matrix-cyan tabular-nums">vol {volume.toFixed(0)}</span>
      </div>

      <button
        type="button"
        onClick={submit}
        data-testid="grid-log"
        className="w-full py-4 rounded-xl bg-matrix-green text-matrix-bg font-terminal text-sm tracking-[0.15em] uppercase shadow-matrix-sm hover:bg-matrix-green-dim transition-colors"
      >
        ▸ Log set
      </button>
    </div>
  );
}
