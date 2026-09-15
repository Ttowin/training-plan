import { useState } from "react";
import { computeVolume, formatShorthand } from "../../utils/shorthandParser.js";
import { formatNum, type LoggerProps } from "./types.js";

interface AdjustRowProps {
  label: string;
  value: string;
  onStep: (dir: 1 | -1) => void;
  onBigStep?: (dir: 1 | -1) => void;
  bigStepLabel?: string;
  unit?: string;
  disabled?: boolean;
  testid: string;
}

function AdjustRow({ label, value, onStep, onBigStep, bigStepLabel, unit, disabled, testid }: AdjustRowProps) {
  return (
    <div className="flex items-center gap-2" data-testid={testid}>
      <div className="w-14 text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">{label}</div>
      <div className="flex-1 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={disabled}
          aria-label={`decrease ${label}`}
          className="w-14 min-h-[56px] rounded-lg border border-matrix-border text-matrix-green font-terminal text-2xl leading-none hover:border-matrix-green hover:bg-matrix-green-dark/40 active:scale-95 transition-all disabled:opacity-30"
        >
          −
        </button>
        <div className={`flex-1 min-h-[56px] rounded-lg border ${disabled ? "border-matrix-border opacity-40" : "border-matrix-green/50 bg-matrix-bg-card"} flex items-center justify-center`}>
          <span className="font-terminal text-3xl text-matrix-green tabular-nums" data-testid={`${testid}-value`}>{value}</span>
          {unit && <span className="font-terminal text-xs text-matrix-text-muted ml-1 self-end mb-2">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={disabled}
          aria-label={`increase ${label}`}
          className="w-14 min-h-[56px] rounded-lg border border-matrix-border text-matrix-green font-terminal text-2xl leading-none hover:border-matrix-green hover:bg-matrix-green-dark/40 active:scale-95 transition-all disabled:opacity-30"
        >
          +
        </button>
      </div>
      {onBigStep && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onBigStep(1)}
            disabled={disabled}
            className="px-2 py-1 rounded border border-matrix-border text-matrix-text-muted font-terminal text-[10px] hover:border-matrix-green hover:text-matrix-green transition-colors disabled:opacity-30"
          >
            +{bigStepLabel}
          </button>
          <button
            type="button"
            onClick={() => onBigStep(-1)}
            disabled={disabled}
            className="px-2 py-1 rounded border border-matrix-border text-matrix-text-muted font-terminal text-[10px] hover:border-matrix-green hover:text-matrix-green transition-colors disabled:opacity-30"
          >
            −{bigStepLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function StepperLogger({ exercise, lastWeek, onLog }: LoggerProps) {
  const [bw, setBw] = useState<boolean>(lastWeek?.weight == null);
  const [weight, setWeight] = useState<number>(lastWeek?.weight ?? 20);
  const [reps, setReps] = useState<number>(lastWeek?.reps ?? exercise.reps_max ?? 12);
  const [sets, setSets] = useState<number>(lastWeek?.sets ?? exercise.default_sets ?? 3);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const round = (v: number) => Math.round(v * 100) / 100;

  const effWeight = bw ? null : weight;
  const volume = computeVolume(effWeight, reps, sets);

  function repeatLast() {
    if (!lastWeek) return;
    setBw(lastWeek.weight == null);
    setWeight(lastWeek.weight ?? 20);
    setReps(lastWeek.reps);
    setSets(lastWeek.sets);
  }

  function progress() {
    if (!lastWeek) return;
    setBw(false);
    setWeight(round((lastWeek.weight ?? 0) + 2.5));
    setReps(lastWeek.reps);
    setSets(lastWeek.sets);
  }

  function submit() {
    onLog({
      method: "Tap Console",
      summary: formatShorthand(effWeight, reps, sets),
      volume,
    });
  }

  return (
    <div className="space-y-4">
      {lastWeek && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={repeatLast}
            data-testid="stepper-repeat"
            className="flex-1 py-2.5 rounded-lg border border-matrix-cyan/40 text-matrix-cyan font-terminal text-xs uppercase tracking-widest hover:bg-matrix-cyan/10 hover:border-matrix-cyan transition-colors"
          >
            ⟲ Repeat last
          </button>
          <button
            type="button"
            onClick={progress}
            data-testid="stepper-progress"
            className="flex-1 py-2.5 rounded-lg border border-matrix-green/50 text-matrix-green font-terminal text-xs uppercase tracking-widest hover:bg-matrix-green-dark/40 transition-colors"
          >
            ▲ +2.5kg overload
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-14 text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">Weight</div>
          <div className="flex-1 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setWeight((w) => round(clamp(w - 2.5, 0, 999)))}
              disabled={bw}
              aria-label="decrease weight"
              className="w-14 min-h-[56px] rounded-lg border border-matrix-border text-matrix-green font-terminal text-2xl leading-none hover:border-matrix-green hover:bg-matrix-green-dark/40 active:scale-95 transition-all disabled:opacity-30"
            >
              −
            </button>
            <div className={`flex-1 min-h-[56px] rounded-lg border ${bw ? "border-matrix-border opacity-40" : "border-matrix-green/50 bg-matrix-bg-card"} flex items-center justify-center`}>
              <span className="font-terminal text-3xl text-matrix-green tabular-nums" data-testid="stepper-weight-value">
                {bw ? "BW" : formatNum(weight)}
              </span>
              {!bw && <span className="font-terminal text-xs text-matrix-text-muted ml-1 self-end mb-2">kg</span>}
            </div>
            <button
              type="button"
              onClick={() => setWeight((w) => round(clamp(w + 2.5, 0, 999)))}
              disabled={bw}
              aria-label="increase weight"
              className="w-14 min-h-[56px] rounded-lg border border-matrix-border text-matrix-green font-terminal text-2xl leading-none hover:border-matrix-green hover:bg-matrix-green-dark/40 active:scale-95 transition-all disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setBw((v) => !v)}
            data-testid="stepper-bw"
            className={`px-2 min-h-[56px] rounded-lg border font-terminal text-[10px] uppercase tracking-widest transition-colors ${bw ? "border-matrix-cyan text-matrix-cyan bg-matrix-cyan/10" : "border-matrix-border text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green"}`}
          >
            BW
          </button>
        </div>

        <AdjustRow
          label="Reps"
          testid="stepper-reps"
          value={reps.toString()}
          onStep={(d) => setReps((r) => clamp(r + d, 1, 99))}
        />
        <AdjustRow
          label="Sets"
          testid="stepper-sets"
          value={sets.toString()}
          onStep={(d) => setSets((s) => clamp(s + d, 1, 20))}
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="font-terminal text-xs text-matrix-text-muted uppercase tracking-widest">Volume</span>
        <span className="font-terminal text-sm text-matrix-cyan tabular-nums">{volume.toFixed(0)} kg</span>
      </div>

      <button
        type="button"
        onClick={submit}
        data-testid="stepper-log"
        className="w-full py-4 rounded-xl bg-matrix-green text-matrix-bg font-terminal text-sm tracking-[0.15em] uppercase shadow-matrix-sm hover:bg-matrix-green-dim transition-colors"
      >
        ▸ Log set
      </button>
    </div>
  );
}
