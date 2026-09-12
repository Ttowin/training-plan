import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api.js";
import { ExerciseCard } from "../components/ExerciseCard.js";
import { AddExerciseModal } from "../components/AddExerciseModal.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import type { ParsedShorthand, SessionExercise } from "../types/index.js";

export function ActiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
    refetchInterval: 10_000,
  });

  const { data: comparison } = useQuery({
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

  async function handleLogExercise(
    exerciseId: number,
    exerciseName: string,
    _parsed: ParsedShorthand,
    raw: string
  ) {
    await logExercise.mutateAsync({ exerciseId, exerciseName, inputRaw: raw });
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

  // Build a map from exercise_name → last week's entry
  const lastWeekMap = new Map<string, SessionExercise>();
  if (comparison?.exercises) {
    for (const ex of comparison.exercises) {
      lastWeekMap.set(ex.exercise_name, ex);
    }
  }

  // Build a map from exercise_name → this session's logged entry
  const loggedMap = new Map<string, SessionExercise>();
  if (session.exercises) {
    for (const ex of session.exercises) {
      loggedMap.set(ex.exercise_name, ex);
    }
  }

  // Ad-hoc exercises (not in plan)
  const planNames = new Set(session.planExercises.map((e) => e.name));
  const adHocExercises = session.exercises.filter((e) => !planNames.has(e.exercise_name));

  const totalLogged = session.exercises.length;
  const totalPlan = session.planExercises.length;

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader
        title={session.training_day?.name ?? "ACTIVE SESSION"}
        subtitle={`ELAPSED: ${formatElapsed(elapsed)} · ${totalLogged}/${totalPlan} LOGGED`}
      />

      <div className="flex-1 px-4 pt-4 space-y-3 max-w-lg mx-auto w-full">
        {/* Plan exercises */}
        <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest mb-2">
          TRAINING PROTOCOL
        </div>

        {session.planExercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            loggedEntry={loggedMap.get(ex.name)}
            lastWeekEntry={lastWeekMap.get(ex.name) ?? null}
            onLog={handleLogExercise}
            onDelete={(entryId) => deleteExercise.mutate(entryId)}
          />
        ))}

        {/* Ad-hoc exercises */}
        {adHocExercises.length > 0 && (
          <>
            <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest pt-2">
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
                    <div className="text-xs font-terminal text-matrix-text-muted">
                      {ex.input_raw}
                    </div>
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
          className="w-full py-3 border border-dashed border-matrix-border rounded-lg font-terminal text-xs text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green transition-colors uppercase tracking-widest"
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
