import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api.js";
import { SetBySetCard, type SetInput } from "../components/SetBySetCard.js";
import { ExerciseOverviewRow } from "../components/ExerciseOverviewRow.js";
import { AddExerciseModal } from "../components/AddExerciseModal.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import { addReminder, getCustomReminders, getReminders, removeReminder } from "../data/exerciseReminders.js";
import type { Exercise, ParsedShorthand, SessionExercise } from "../types/index.js";

export function ActiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Which plan exercise is open for detailed logging; null = day overview.
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
    refetchInterval: 10_000,
  });

  const { data: comparison, isFetched: comparisonFetched } = useQuery({
    queryKey: ["comparison", sessionId],
    queryFn: () => api.getComparison(sessionId),
    enabled: !!session,
  });

  // Elapsed timer
  useEffect(() => {
    if (!session?.started_at) return;
    const start = new Date(session.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.started_at]);

  const logExercise = useMutation({
    mutationFn: (data: { exerciseId?: number | null; exerciseName: string; inputRaw: string }) =>
      api.logExercise(sessionId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", sessionId] }),
  });

  const deleteExercise = useMutation({
    mutationFn: (exId: number) => api.deleteExercise(sessionId, exId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", sessionId] }),
  });

  // Log a full set-by-set record for a plan exercise: replace any previously
  // logged sets for it, then persist one entry per set (weight × reps).
  const logSets = useMutation({
    mutationFn: async ({ exercise, sets }: { exercise: Exercise; sets: SetInput[] }) => {
      const existing = (session?.exercises ?? []).filter((e) => e.exercise_name === exercise.name);
      for (const e of existing) {
        await api.deleteExercise(sessionId, e.id);
      }
      for (const s of sets) {
        const inputRaw = s.weight === null ? `bwx${s.reps}` : `${s.weight}x${s.reps}`;
        await api.logExercise(sessionId, { exerciseId: exercise.id, exerciseName: exercise.name, inputRaw });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", sessionId] }),
  });

  const completeSession = useMutation({
    mutationFn: () => api.completeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentDay"] });
      navigate("/history");
    },
  });

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  }

  async function handleAddAdHoc(name: string, _parsed: ParsedShorthand, raw: string) {
    await logExercise.mutateAsync({ exerciseId: null, exerciseName: name, inputRaw: raw });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-matrix-bg flex items-center justify-center">
        <div className="text-matrix-green font-terminal animate-pulse">LOADING SESSION...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-matrix-bg flex items-center justify-center">
        <div className="text-matrix-red font-terminal">SESSION NOT FOUND</div>
      </div>
    );
  }

  if (session.completed_at) {
    return (
      <div className="min-h-screen bg-matrix-bg flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-matrix-green font-terminal text-xl tracking-widest">SESSION COMPLETE</div>
        <button onClick={() => navigate("/history")} className="text-matrix-text-muted font-terminal text-sm border border-matrix-border rounded px-4 py-2">
          VIEW HISTORY
        </button>
      </div>
    );
  }

  // Last week's sets per exercise, expanded to one entry per set (a historical
  // entry with sets>1 becomes that many rows), used to prefill the logging card.
  const lastWeekMap = new Map<string, SetInput[]>();
  if (comparison?.exercises) {
    for (const ex of comparison.exercises) {
      const arr = lastWeekMap.get(ex.exercise_name) ?? [];
      const count = ex.sets && ex.sets > 1 ? ex.sets : 1;
      for (let k = 0; k < count; k++) arr.push({ weight: ex.weight_kg, reps: ex.reps ?? 0 });
      lastWeekMap.set(ex.exercise_name, arr);
    }
  }

  // This session's logged sets grouped per exercise (each set is its own entry).
  const loggedMap = new Map<string, SessionExercise[]>();
  if (session.exercises) {
    for (const ex of session.exercises) {
      const arr = loggedMap.get(ex.exercise_name) ?? [];
      arr.push(ex);
      loggedMap.set(ex.exercise_name, arr);
    }
  }

  // Ad-hoc exercises (not in plan)
  const planNames = new Set(session.planExercises.map((e) => e.name));
  const adHocExercises = session.exercises.filter((e) => !planNames.has(e.exercise_name));

  const totalLogged = session.planExercises.filter((e) => (loggedMap.get(e.name)?.length ?? 0) > 0).length;
  const totalPlan = session.planExercises.length;

  const selectedExercise = selectedExerciseId
    ? session.planExercises.find((e) => e.id === selectedExerciseId) ?? null
    : null;

  // ---- Detail view: log the sets for one exercise ----
  if (selectedExercise) {
    return (
      <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
        <TerminalHeader
          title={selectedExercise.name}
          subtitle={`${session.training_day?.name ?? "SESSION"} · ELAPSED ${formatElapsed(elapsed)}`}
        />
        <div className="flex-1 px-4 pt-4 space-y-3 max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={() => setSelectedExerciseId(null)}
            data-testid="overview-back"
            className="flex items-center gap-1 font-terminal text-xs text-matrix-text-muted uppercase tracking-widest hover:text-matrix-green transition-colors"
          >
            ◂ Back to overview
          </button>

          {!comparisonFetched ? (
            <div className="text-xs font-terminal text-matrix-text-muted animate-pulse py-4">LOADING LAST SESSION…</div>
          ) : (
            <SetBySetCard
              key={selectedExercise.id}
              exercise={selectedExercise}
              lastWeekSets={lastWeekMap.get(selectedExercise.name) ?? []}
              loggedSets={loggedMap.get(selectedExercise.name) ?? []}
              reminders={getReminders(selectedExercise.name)}
              customCues={getCustomReminders(selectedExercise.name)}
              onAddCue={(cue) => addReminder(selectedExercise.name, cue)}
              onRemoveCue={(cue) => removeReminder(selectedExercise.name, cue)}
              onLogSets={(sets) => logSets.mutateAsync({ exercise: selectedExercise, sets })}
            />
          )}

          <button
            type="button"
            onClick={() => setSelectedExerciseId(null)}
            className="w-full py-3 rounded-lg border border-matrix-border font-terminal text-xs text-matrix-text-muted uppercase tracking-widest hover:border-matrix-green hover:text-matrix-green transition-colors"
          >
            ◂ Done — back to overview
          </button>
        </div>
      </div>
    );
  }

  // ---- Overview view: scannable list of the whole training day ----
  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader
        title={session.training_day?.name ?? "ACTIVE SESSION"}
        subtitle={`ELAPSED: ${formatElapsed(elapsed)} · ${totalLogged}/${totalPlan} LOGGED`}
      />

      <div className="flex-1 px-4 pt-4 space-y-2 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">TRAINING PROTOCOL</span>
          <span className="text-xs font-terminal text-matrix-green tabular-nums">{totalLogged}/{totalPlan}</span>
        </div>

        {session.planExercises.map((ex) => (
          <ExerciseOverviewRow
            key={ex.id}
            exercise={ex}
            loggedSets={loggedMap.get(ex.name) ?? []}
            lastWeekSets={lastWeekMap.get(ex.name) ?? []}
            cueCount={getReminders(ex.name).length}
            onOpen={() => setSelectedExerciseId(ex.id)}
          />
        ))}

        {/* Ad-hoc exercises */}
        {adHocExercises.length > 0 && (
          <>
            <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest pt-3">
              EXTRA EXERCISES
            </div>
            {adHocExercises.map((ex) => (
              <div
                key={ex.id}
                className="border border-matrix-cyan/30 rounded-lg p-3 bg-matrix-bg-card"
                data-testid={`adhoc-exercise-${ex.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-terminal text-matrix-cyan">{ex.exercise_name}</div>
                    <div className="text-xs font-terminal text-matrix-text-muted">{ex.input_raw}</div>
                  </div>
                  <button
                    onClick={() => deleteExercise.mutate(ex.id)}
                    className="text-xs text-matrix-red font-terminal"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add exercise button */}
        <button
          onClick={() => setShowAddModal(true)}
          data-testid="add-exercise-button"
          className="w-full py-3 mt-2 border border-dashed border-matrix-border rounded-lg font-terminal text-xs text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green transition-colors uppercase tracking-widest"
        >
          ⊕ ADD EXTRA EXERCISE
        </button>

        {/* Complete session */}
        {!showCompleteConfirm ? (
          <button
            onClick={() => setShowCompleteConfirm(true)}
            data-testid="complete-session-button"
            className="w-full py-4 mt-4 rounded-xl font-terminal text-sm tracking-[0.15em] uppercase bg-matrix-bg-card border border-matrix-green/50 text-matrix-green hover:bg-matrix-green-dark transition-all"
          >
            ■ END SESSION
          </button>
        ) : (
          <div className="space-y-2 mt-4">
            <div className="text-xs font-terminal text-matrix-text-muted text-center">
              CONFIRM SESSION COMPLETE?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 py-3 rounded-lg border border-matrix-border font-terminal text-xs text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => completeSession.mutate()}
                disabled={completeSession.isPending}
                data-testid="confirm-complete-button"
                className="flex-1 py-3 rounded-lg bg-matrix-green text-matrix-bg font-terminal text-xs shadow-matrix hover:bg-matrix-green-dim transition-colors"
              >
                {completeSession.isPending ? "SAVING..." : "CONFIRM"}
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddExerciseModal onAdd={handleAddAdHoc} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
