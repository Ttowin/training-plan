import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../utils/api.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import { CycleSelector } from "../components/CycleSelector.js";
import type { TrainingDay } from "../types/index.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCycleSelector, setShowCycleSelector] = useState(false);
  const [overrideDay, setOverrideDay] = useState<TrainingDay | null>(null);

  const { data: currentDay, isLoading: loadingCurrent } = useQuery({
    queryKey: ["currentDay"],
    queryFn: api.getCurrentDay,
  });

  const { data: allDays } = useQuery({
    queryKey: ["trainingDays"],
    queryFn: api.getTrainingDays,
  });

  const startSession = useMutation({
    mutationFn: (dayId: number) =>
      api.createSession(dayId, format(new Date(), "yyyy-MM-dd")),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["currentDay"] });
      navigate(`/session/${session.id}`);
    },
  });

  const displayDay = overrideDay ?? currentDay;

  function handleSelectDay(day: TrainingDay) {
    setOverrideDay(day);
    setShowCycleSelector(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader title="GymMatrix" subtitle="PROGRESSIVE OVERLOAD SYSTEM v1.0" />

      <div className="flex-1 px-4 pt-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Current day badge */}
        {loadingCurrent ? (
          <div className="text-matrix-text-muted font-terminal text-sm animate-pulse">
            LOADING TRAINING PROTOCOL...
          </div>
        ) : displayDay ? (
          <div className="border border-matrix-green rounded-xl p-5 bg-matrix-bg-card shadow-matrix-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest mb-1">
                  TODAY'S PROTOCOL
                </div>
                <h1
                  className="text-matrix-green font-terminal text-lg tracking-wider"
                  data-testid="current-day-name"
                >
                  {displayDay.name}
                </h1>
              </div>
              <button
                onClick={() => setShowCycleSelector((v) => !v)}
                className="text-xs font-terminal text-matrix-text-muted border border-matrix-border rounded px-2 py-1 hover:border-matrix-green hover:text-matrix-green transition-colors"
                data-testid="cycle-selector-toggle"
              >
                CHANGE
              </button>
            </div>

            {/* Muscle targets */}
            <div className="flex flex-wrap gap-2">
              {displayDay.muscle_targets.map((t) => (
                <span
                  key={t.muscle}
                  className="text-xs font-terminal text-matrix-green border border-matrix-green/30 rounded px-2 py-0.5"
                >
                  {t.muscle} ×{t.sets}
                </span>
              ))}
            </div>

            {/* Exercise list preview */}
            <div className="space-y-1 border-t border-matrix-border pt-3">
              {displayDay.exercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-2 text-xs font-terminal text-matrix-text-muted">
                  <span className="text-matrix-green-dim">{String(i + 1).padStart(2, "0")}</span>
                  <span>{ex.name}</span>
                  <span className="ml-auto opacity-60">
                    {ex.default_sets}×{ex.reps_min ?? "?"}-{ex.reps_max ?? "?"}
                  </span>
                </div>
              ))}
            </div>

            {currentDay?.lastSession && (
              <div className="text-xs font-terminal text-matrix-text-muted border-t border-matrix-border pt-2">
                Last session: {currentDay.lastSession.session_date}
              </div>
            )}
          </div>
        ) : null}

        {/* Cycle selector */}
        {showCycleSelector && allDays && (
          <div className="space-y-3">
            <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">
              SELECT TRAINING PROTOCOL
            </div>
            <CycleSelector
              days={allDays}
              selectedId={displayDay?.id ?? 0}
              onSelect={handleSelectDay}
            />
            {overrideDay && (
              <button
                onClick={() => setOverrideDay(null)}
                className="text-xs font-terminal text-matrix-text-muted underline"
              >
                Reset to auto-detected day
              </button>
            )}
          </div>
        )}

        {/* Start training button */}
        {displayDay && (
          <button
            onClick={() => startSession.mutate(displayDay.id)}
            disabled={startSession.isPending}
            data-testid="start-session-button"
            className={`
              w-full py-5 rounded-xl font-terminal text-base tracking-[0.2em] uppercase
              transition-all duration-200
              ${startSession.isPending
                ? "bg-matrix-bg-card border border-matrix-border text-matrix-text-muted"
                : "bg-matrix-green text-matrix-bg hover:bg-matrix-green-dim shadow-matrix active:scale-95"
              }
            `}
          >
            {startSession.isPending ? "INITIALIZING..." : "⊕ START TRAINING"}
          </button>
        )}

        {startSession.isError && (
          <div className="text-xs text-matrix-red font-terminal text-center">
            ⚠ {(startSession.error as Error).message}
          </div>
        )}

        {/* System status */}
        <div className="text-xs font-terminal text-matrix-text-muted space-y-1 border border-matrix-border/30 rounded p-3">
          <div className="flex justify-between">
            <span>STATUS</span><span className="text-matrix-green">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>DATE</span><span>{format(new Date(), "yyyy-MM-dd")}</span>
          </div>
          <div className="flex justify-between">
            <span>CYCLE</span><span>DAY {displayDay?.order_idx ?? "?"} / 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
