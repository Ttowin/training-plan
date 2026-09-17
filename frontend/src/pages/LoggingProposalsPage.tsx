import { useState } from "react";
import { TerminalHeader } from "../components/TerminalHeader.js";
import { StepperLogger } from "../components/proposals/StepperLogger.js";
import { QuickGridLogger } from "../components/proposals/QuickGridLogger.js";
import { SetBySetLogger } from "../components/proposals/SetBySetLogger.js";
import { SmartKeypadLogger } from "../components/proposals/SmartKeypadLogger.js";
import type { LastEntry, LogResult, ProposalExercise } from "../components/proposals/types.js";

const SAMPLE_EXERCISE: ProposalExercise = {
  name: "Machine Chest Press",
  reps_min: 10,
  reps_max: 12,
  default_sets: 3,
  equipment: "Smith machine or Machine",
};

const SAMPLE_LAST: LastEntry = { weight: 15, reps: 12, sets: 3 };

interface Proposal {
  id: string;
  tag: string;
  title: string;
  pitch: string;
  render: (onLog: (r: LogResult) => void) => React.ReactNode;
}

const PROPOSALS: Proposal[] = [
  {
    id: "steppers",
    tag: "P1",
    title: "Tap Console",
    pitch: "Big +/- targets, no keyboard. One tap to repeat last week or auto-apply +2.5kg progressive overload.",
    render: (onLog) => <StepperLogger exercise={SAMPLE_EXERCISE} lastWeek={SAMPLE_LAST} onLog={onLog} />,
  },
  {
    id: "grid",
    tag: "P2",
    title: "Quick Select",
    pitch: "Preset chips centred on your last weight and target rep range. Common lifts are a single tap each.",
    render: (onLog) => <QuickGridLogger exercise={SAMPLE_EXERCISE} lastWeek={SAMPLE_LAST} onLog={onLog} />,
  },
  {
    id: "setbyset",
    tag: "P3",
    title: "Set-by-Set",
    pitch: "Log each set individually and tick it off as you go. Supports drop sets / different weight per set.",
    render: (onLog) => <SetBySetLogger exercise={SAMPLE_EXERCISE} lastWeek={SAMPLE_LAST} onLog={onLog} />,
  },
  {
    id: "keypad",
    tag: "P4",
    title: "Smart Pad",
    pitch: "Keeps shorthand speed but guides the format with a segmented display and an on-screen numeric keypad.",
    render: (onLog) => <SmartKeypadLogger exercise={SAMPLE_EXERCISE} lastWeek={SAMPLE_LAST} onLog={onLog} />,
  },
];

export function LoggingProposalsPage() {
  const [activeId, setActiveId] = useState<string>(PROPOSALS[0].id);
  const [result, setResult] = useState<LogResult | null>(null);
  const active = PROPOSALS.find((p) => p.id === activeId)!;

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-24">
      <TerminalHeader title="LOG PROTOCOL // REDESIGN" subtitle="INTERACTIVE UX PROPOSALS · TAP TO TRY EACH ONE" />

      <div className="flex-1 px-4 pt-4 space-y-4 max-w-lg mx-auto w-full">
        <div className="rounded-lg border border-matrix-border bg-matrix-bg-card p-3 space-y-1">
          <div className="text-[10px] font-terminal text-matrix-red uppercase tracking-widest">Current method</div>
          <p className="text-xs font-terminal text-matrix-text-muted leading-relaxed">
            Today you must type a cryptic <span className="text-matrix-green">15x12x3</span> string into every exercise —
            hard to learn and fiddly on a sweaty phone mid-set. Below are four friendlier ways to log the same set.
          </p>
        </div>

        <div className="rounded-lg border border-matrix-green/30 bg-matrix-bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-terminal text-sm text-matrix-green">{SAMPLE_EXERCISE.name}</div>
              <div className="text-xs font-terminal text-matrix-text-muted mt-0.5">
                target {SAMPLE_EXERCISE.reps_min}-{SAMPLE_EXERCISE.reps_max} reps · {SAMPLE_EXERCISE.default_sets} sets
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">Last week</div>
              <div className="font-terminal text-sm text-matrix-cyan">
                {SAMPLE_LAST.weight}kg × {SAMPLE_LAST.reps} × {SAMPLE_LAST.sets}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PROPOSALS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              data-testid={`proposal-tab-${p.id}`}
              className={`rounded-lg border px-1 py-2 font-terminal transition-all ${
                p.id === activeId
                  ? "border-matrix-green bg-matrix-green-dark/40 text-matrix-green shadow-matrix-sm"
                  : "border-matrix-border text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green"
              }`}
            >
              <div className="text-[11px] tracking-widest">{p.tag}</div>
              <div className="text-[9px] uppercase tracking-wide truncate">{p.title}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-matrix-border bg-matrix-bg-card p-4 space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-terminal text-matrix-green-dim text-xs">{active.tag} //</span>
              <h2 className="font-terminal text-matrix-green text-base tracking-widest uppercase">{active.title}</h2>
            </div>
            <p className="text-xs font-terminal text-matrix-text-muted mt-1 leading-relaxed">{active.pitch}</p>
          </div>

          <div className="border-t border-matrix-border pt-4">{active.render(setResult)}</div>
        </div>

        <div
          className="rounded-lg border border-matrix-cyan/30 bg-matrix-bg-card p-3 min-h-[64px]"
          data-testid="log-result"
        >
          <div className="text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest mb-1">
            &gt; Log output
          </div>
          {result ? (
            <div className="font-terminal text-sm text-matrix-cyan">
              <span className="text-matrix-green">✓ {result.method}:</span> {result.summary}
              <span className="text-matrix-text-muted"> · vol {result.volume.toFixed(0)} kg</span>
            </div>
          ) : (
            <div className="font-terminal text-xs text-matrix-text-muted opacity-60">
              awaiting input — try logging a set above
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
