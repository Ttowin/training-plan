import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api.js";
import { SetBySetCard, type SetInput } from "../components/SetBySetCard.js";
import { ExerciseOverviewRow } from "../components/ExerciseOverviewRow.js";
import { MethodEditorSheet } from "../components/MethodEditorSheet.js";
import { AddExerciseModal } from "../components/AddExerciseModal.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import { addReminder, getCustomReminders, getReminders, removeReminder } from "../data/exerciseReminders.js";
import {
  addCustomMethod,
  deleteCustomMethod,
  getDefaultMethodId,
  getMethodById,
  getMethods,
  hideSeededMethod,
  setDefaultMethod,
  setLastUsedMethod,
  updateMethod,
} from "../data/exerciseMethods.js";
import { logKey, type ExerciseMethod, type WeightMode } from "../utils/parseSeedMethods.js";
import type { Exercise, ParsedShorthand, SessionExercise } from "../types/index.js";

export function ActiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [methodSelections, setMethodSelections] = useState<Record<number, string>>({});
  const [methodsVersion, setMethodsVersion] = useState(0);
  const [methodEditor, setMethodEditor] = useState<{ exercise: Exercise; method?: ExerciseMethod | null } | null>(null);
  const [pendingMethodSwitch, setPendingMethodSwitch] = useState<{ exerciseId: number; methodId: string } | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
    refetchInterval: (query) => (query.state.data?.completed_at ? false : 10_000),
  });

  const isCompleted = !!session?.completed_at;

  const { data: comparison, isFetched: comparisonFetched } = useQuery({
    queryKey: ["comparison", sessionId],
    queryFn: () => api.getComparison(sessionId),
    enabled: !!session,
  });

  function invalidateSessionData() {
    qc.invalidateQueries({ queryKey: ["session", sessionId] });
    qc.invalidateQueries({ queryKey: ["sessions"] });
    qc.invalidateQueries({ queryKey: ["currentDay"] });
    qc.invalidateQueries({ queryKey: ["weeklyVolume"] });
  }

  useEffect(() => {
    if (!session?.started_at || session.completed_at) return;
    const start = new Date(session.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [session?.started_at, session?.completed_at]);

  const logExercise = useMutation({
    mutationFn: (data: {
      exerciseId?: number | null;
      exerciseName: string;
      inputRaw: string;
      methodId?: string | null;
      methodLabel?: string | null;
    }) => api.logExercise(sessionId, data),
    onSuccess: invalidateSessionData,
  });

  const deleteExercise = useMutation({
    mutationFn: (exId: number) => api.deleteExercise(sessionId, exId),
    onSuccess: invalidateSessionData,
  });

  const logSets = useMutation({
    mutationFn: async ({
      exercise,
      method,
      sets,
    }: {
      exercise: Exercise;
      method: ExerciseMethod | null;
      sets: SetInput[];
    }) => {
      const existing = (session?.exercises ?? []).filter(
        (e) =>
          e.exercise_name === exercise.name &&
          (e.method_id ?? "") === (method?.id ?? "")
      );
      for (const e of existing) {
        await api.deleteExercise(sessionId, e.id);
      }
      for (const s of sets) {
        const inputRaw = s.weight === null ? `bwx${s.reps}` : `${s.weight}x${s.reps}`;
        await api.logExercise(sessionId, {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          inputRaw,
          methodId: method?.id ?? null,
          methodLabel: method?.label ?? null,
        });
      }
      if (method) setLastUsedMethod(exercise.id, method.id);
    },
    onSuccess: invalidateSessionData,
  });

  const completeSession = useMutation({
    mutationFn: () => api.completeSession(sessionId),
    onSuccess: () => {
      invalidateSessionData();
      navigate("/history");
    },
  });

  const deleteSession = useMutation({
    mutationFn: () => api.deleteSession(sessionId),
    onSuccess: () => {
      invalidateSessionData();
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

  function formatCompletedRange(startedAt: string, completedAt: string) {
    const start = new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const end = new Date(completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${start} → ${end}`;
  }

  async function handleAddAdHoc(name: string, _parsed: ParsedShorthand, raw: string) {
    await logExercise.mutateAsync({ exerciseId: null, exerciseName: name, inputRaw: raw });
  }

  useEffect(() => {
    if (!session) return;
    setMethodSelections((prev) => {
      const next = { ...prev };
      for (const ex of session.planExercises) {
        if (next[ex.id]) continue;
        const loggedForExercise = session.exercises.filter((e) => e.exercise_id === ex.id);
        const methodFromLog = loggedForExercise.find((e) => e.method_id)?.method_id;
        const defaultId = methodFromLog ?? getDefaultMethodId(ex);
        if (defaultId) next[ex.id] = defaultId;
      }
      return next;
    });
  }, [session?.id, session?.planExercises, session?.exercises, methodsVersion]);

  const refreshMethods = useCallback(() => setMethodsVersion((v) => v + 1), []);

  function getExerciseMethods(exercise: Exercise) {
    void methodsVersion;
    return getMethods(exercise);
  }

  function getSelectedMethod(exercise: Exercise): ExerciseMethod | null {
    const methods = getExerciseMethods(exercise);
    const selectedId = methodSelections[exercise.id] ?? getDefaultMethodId(exercise);
    return methods.find((m) => m.id === selectedId) ?? methods[0] ?? null;
  }

  function getLoggedSets(exercise: Exercise, method: ExerciseMethod | null): SessionExercise[] {
    return (session?.exercises ?? []).filter(
      (e) => e.exercise_name === exercise.name && (e.method_id ?? "") === (method?.id ?? "")
    );
  }

  function requestMethodSwitch(exercise: Exercise, methodId: string) {
    const currentId = methodSelections[exercise.id];
    if (currentId === methodId) return;

    const currentLogged = getLoggedSets(exercise, getMethodById(exercise, currentId ?? "") ?? getSelectedMethod(exercise));
    if (currentLogged.length > 0) {
      setPendingMethodSwitch({ exerciseId: exercise.id, methodId });
      return;
    }

    setMethodSelections((prev) => ({ ...prev, [exercise.id]: methodId }));
    setLastUsedMethod(exercise.id, methodId);
  }

  async function confirmMethodSwitch() {
    if (!pendingMethodSwitch || !session) return;
    const exercise = session.planExercises.find((e) => e.id === pendingMethodSwitch.exerciseId);
    if (!exercise) return;

    const currentMethod = getSelectedMethod(exercise);
    const existing = getLoggedSets(exercise, currentMethod);
    for (const entry of existing) {
      await api.deleteExercise(sessionId, entry.id);
    }
    invalidateSessionData();
    setMethodSelections((prev) => ({ ...prev, [exercise.id]: pendingMethodSwitch.methodId }));
    setLastUsedMethod(exercise.id, pendingMethodSwitch.methodId);
    setPendingMethodSwitch(null);
  }

  function handleSaveMethod(
    exercise: Exercise,
    editingMethod: ExerciseMethod | null | undefined,
    input: { label: string; weightMode: WeightMode; notes?: string; setAsDefault?: boolean }
  ) {
    let saved: ExerciseMethod | null = null;
    if (editingMethod) {
      saved = updateMethod(exercise, editingMethod.id, input);
    } else {
      saved = addCustomMethod(exercise.id, input);
    }
    refreshMethods();
    if (saved) {
      setMethodSelections((prev) => ({ ...prev, [exercise.id]: saved!.id }));
      if (input.setAsDefault) setDefaultMethod(exercise.id, saved.id);
      setLastUsedMethod(exercise.id, saved.id);
    }
  }

  const lastWeekMap = useMemo(() => {
    const map = new Map<string, SetInput[]>();
    if (!comparison?.exercises) return map;
    for (const ex of comparison.exercises) {
      const key = logKey(ex.exercise_name, ex.method_id);
      const arr = map.get(key) ?? [];
      const count = ex.sets && ex.sets > 1 ? ex.sets : 1;
      for (let k = 0; k < count; k++) arr.push({ weight: ex.weight_kg, reps: ex.reps ?? 0 });
      map.set(key, arr);
    }
    return map;
  }, [comparison?.exercises]);

  const loggedMap = useMemo(() => {
    const map = new Map<string, SessionExercise[]>();
    if (!session?.exercises) return map;
    for (const ex of session.exercises) {
      const key = logKey(ex.exercise_name, ex.method_id);
      const arr = map.get(key) ?? [];
      arr.push(ex);
      map.set(key, arr);
    }
    return map;
  }, [session?.exercises]);

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

  const planNames = new Set(session.planExercises.map((e) => e.name));
  const adHocExercises = session.exercises.filter((e) => !planNames.has(e.exercise_name));

  const totalLogged = session.planExercises.filter((e) => {
    const method = getSelectedMethod(e);
    return (loggedMap.get(logKey(e.name, method?.id ?? null))?.length ?? 0) > 0;
  }).length;
  const totalPlan = session.planExercises.length;

  const selectedExercise = selectedExerciseId
    ? session.planExercises.find((e) => e.id === selectedExerciseId) ?? null
    : null;

  const overviewSubtitle = isCompleted
    ? `COMPLETED · ${session.session_date} · ${formatCompletedRange(session.started_at, session.completed_at!)}`
    : `ELAPSED: ${formatElapsed(elapsed)} · ${totalLogged}/${totalPlan} LOGGED`;

  const detailSubtitle = isCompleted
    ? `${session.training_day?.name ?? "SESSION"} · ${session.session_date}`
    : `${session.training_day?.name ?? "SESSION"} · ELAPSED ${formatElapsed(elapsed)}`;

  const deleteSessionButton = (
    <>
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          data-testid="delete-session-button"
          className="w-full py-3 mt-2 rounded-lg font-terminal text-xs tracking-widest uppercase border border-matrix-red/40 text-matrix-red hover:bg-matrix-red/10 transition-colors"
        >
          ✕ {isCompleted ? "DELETE SESSION" : "DISCARD SESSION"}
        </button>
      ) : (
        <div className="space-y-2 mt-2">
          <div className="text-xs font-terminal text-matrix-text-muted text-center">
            {isCompleted ? "DELETE THIS SESSION FROM HISTORY?" : "DISCARD IN-PROGRESS SESSION?"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 rounded-lg border border-matrix-border font-terminal text-xs text-matrix-text-muted"
            >
              CANCEL
            </button>
            <button
              onClick={() => deleteSession.mutate()}
              disabled={deleteSession.isPending}
              data-testid="confirm-delete-session-button"
              className="flex-1 py-3 rounded-lg bg-matrix-red/20 border border-matrix-red font-terminal text-xs text-matrix-red"
            >
              {deleteSession.isPending ? "DELETING..." : "DELETE"}
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (selectedExercise) {
    const methods = getExerciseMethods(selectedExercise);
    const selectedMethod = getSelectedMethod(selectedExercise);
    const methodKey = logKey(selectedExercise.name, selectedMethod?.id ?? null);

    return (
      <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
        <TerminalHeader title={selectedExercise.name} subtitle={detailSubtitle} />
        <div className="flex-1 px-4 pt-4 space-y-3 max-w-lg mx-auto w-full">
          {isCompleted && (
            <div
              className="text-xs font-terminal text-matrix-yellow border border-matrix-yellow/30 rounded px-3 py-2 text-center"
              data-testid="editing-past-session-banner"
            >
              EDITING PAST SESSION — changes update your history
            </div>
          )}

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
              key={`${selectedExercise.id}-${selectedMethod?.id ?? "none"}`}
              exercise={selectedExercise}
              methods={methods}
              selectedMethod={selectedMethod}
              onMethodSelect={(methodId) => requestMethodSwitch(selectedExercise, methodId)}
              onAddMethod={() => setMethodEditor({ exercise: selectedExercise, method: null })}
              onEditMethod={(method) => setMethodEditor({ exercise: selectedExercise, method })}
              lastWeekSets={lastWeekMap.get(methodKey) ?? []}
              loggedSets={loggedMap.get(methodKey) ?? []}
              reminders={getReminders(selectedExercise.name)}
              customCues={getCustomReminders(selectedExercise.name)}
              onAddCue={(cue) => addReminder(selectedExercise.name, cue)}
              onRemoveCue={(cue) => removeReminder(selectedExercise.name, cue)}
              onLogSets={(sets) =>
                logSets.mutateAsync({ exercise: selectedExercise, method: selectedMethod, sets })
              }
            />
          )}

          {pendingMethodSwitch?.exerciseId === selectedExercise.id && (
            <div className="rounded-lg border border-matrix-yellow/40 bg-matrix-bg-card p-3 space-y-2" data-testid="method-switch-confirm">
              <div className="text-xs font-terminal text-matrix-yellow text-center">
                Switch method? Logged sets for the current method will be cleared.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingMethodSwitch(null)}
                  className="flex-1 py-2 rounded border border-matrix-border font-terminal text-xs text-matrix-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmMethodSwitch()}
                  data-testid="confirm-method-switch"
                  className="flex-1 py-2 rounded bg-matrix-yellow/20 border border-matrix-yellow font-terminal text-xs text-matrix-yellow"
                >
                  Switch
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedExerciseId(null)}
            className="w-full py-3 rounded-lg border border-matrix-border font-terminal text-xs text-matrix-text-muted uppercase tracking-widest hover:border-matrix-green hover:text-matrix-green transition-colors"
          >
            ◂ Done — back to overview
          </button>
        </div>

        {methodEditor?.exercise.id === selectedExercise.id && (
          <MethodEditorSheet
            exercise={methodEditor.exercise}
            method={methodEditor.method}
            onSave={(input) => handleSaveMethod(methodEditor.exercise, methodEditor.method, input)}
            onDelete={
              methodEditor.method && !methodEditor.method.isSeeded
                ? () => {
                    deleteCustomMethod(selectedExercise.id, methodEditor.method!.id);
                    refreshMethods();
                  }
                : undefined
            }
            onHide={
              methodEditor.method?.isSeeded
                ? () => {
                    hideSeededMethod(selectedExercise.id, methodEditor.method!.id);
                    refreshMethods();
                  }
                : undefined
            }
            onClose={() => setMethodEditor(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader
        title={session.training_day?.name ?? (isCompleted ? "PAST SESSION" : "ACTIVE SESSION")}
        subtitle={overviewSubtitle}
      />

      <div className="flex-1 px-4 pt-4 space-y-2 max-w-lg mx-auto w-full">
        {isCompleted && (
          <div
            className="text-xs font-terminal text-matrix-yellow border border-matrix-yellow/30 rounded px-3 py-2 text-center mb-2"
            data-testid="editing-past-session-banner"
          >
            EDITING PAST SESSION — tap an exercise to update logged sets
          </div>
        )}

        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">
            {isCompleted ? "LOGGED DATA" : "TRAINING PROTOCOL"}
          </span>
          <span className="text-xs font-terminal text-matrix-green tabular-nums">{totalLogged}/{totalPlan}</span>
        </div>

        {session.planExercises.map((ex) => {
          const methods = getExerciseMethods(ex);
          const selectedMethod = getSelectedMethod(ex);
          const methodKey = logKey(ex.name, selectedMethod?.id ?? null);
          return (
            <ExerciseOverviewRow
              key={ex.id}
              exercise={ex}
              methods={methods}
              selectedMethod={selectedMethod}
              onMethodSelect={(methodId) => requestMethodSwitch(ex, methodId)}
              onAddMethod={() => setMethodEditor({ exercise: ex, method: null })}
              loggedSets={loggedMap.get(methodKey) ?? []}
              lastWeekSets={lastWeekMap.get(methodKey) ?? []}
              cueCount={getReminders(ex.name).length}
              onOpen={() => setSelectedExerciseId(ex.id)}
            />
          );
        })}

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

        {!isCompleted && (
          <button
            onClick={() => setShowAddModal(true)}
            data-testid="add-exercise-button"
            className="w-full py-3 mt-2 border border-dashed border-matrix-border rounded-lg font-terminal text-xs text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green transition-colors uppercase tracking-widest"
          >
            ⊕ ADD EXTRA EXERCISE
          </button>
        )}

        {!isCompleted && (
          !showCompleteConfirm ? (
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
          )
        )}

        {deleteSessionButton}
      </div>

      {showAddModal && (
        <AddExerciseModal onAdd={handleAddAdHoc} onClose={() => setShowAddModal(false)} />
      )}

      {methodEditor && !selectedExercise && (
        <MethodEditorSheet
          exercise={methodEditor.exercise}
          method={methodEditor.method}
          onSave={(input) => handleSaveMethod(methodEditor.exercise, methodEditor.method, input)}
          onDelete={
            methodEditor.method && !methodEditor.method.isSeeded
              ? () => {
                  deleteCustomMethod(methodEditor.exercise.id, methodEditor.method!.id);
                  refreshMethods();
                }
              : undefined
          }
          onHide={
            methodEditor.method?.isSeeded
              ? () => {
                  hideSeededMethod(methodEditor.exercise.id, methodEditor.method!.id);
                  refreshMethods();
                }
              : undefined
          }
          onClose={() => setMethodEditor(null)}
        />
      )}

      {pendingMethodSwitch && !selectedExercise && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPendingMethodSwitch(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-xl border border-matrix-yellow/40 bg-matrix-bg p-4 space-y-3" data-testid="method-switch-confirm">
            <div className="text-xs font-terminal text-matrix-yellow text-center">
              Switch method? Logged sets for the current method will be cleared.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingMethodSwitch(null)}
                className="flex-1 py-2 rounded border border-matrix-border font-terminal text-xs text-matrix-text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmMethodSwitch()}
                data-testid="confirm-method-switch"
                className="flex-1 py-2 rounded bg-matrix-yellow/20 border border-matrix-yellow font-terminal text-xs text-matrix-yellow"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
