import type { Exercise, SessionDetail } from "../types/index.js";

/** Stable negative id so ad-hoc exercises can use the same method storage as plan exercises. */
export function stableAdHocExerciseId(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = h | 0;
  return n <= 0 ? n : -n;
}

export function isAdHocExercise(exercise: Exercise): boolean {
  return exercise.id < 0;
}

export function buildAdHocExercise(name: string, session: SessionDetail): Exercise {
  return {
    id: stableAdHocExerciseId(name),
    training_day_id: session.training_day_id,
    name,
    order_idx: 9999,
    default_sets: 3,
    reps_min: 8,
    reps_max: 12,
    equipment: null,
    is_custom: 1,
  };
}

/** Plan exercises plus one entry per ad-hoc exercise name logged in this session. */
export function getSessionExercises(session: SessionDetail): Exercise[] {
  const planNames = new Set(session.planExercises.map((e) => e.name));
  const adHocNames: string[] = [];
  for (const entry of session.exercises) {
    if (!planNames.has(entry.exercise_name) && !adHocNames.includes(entry.exercise_name)) {
      adHocNames.push(entry.exercise_name);
    }
  }
  const adHoc = adHocNames.map((name) => buildAdHocExercise(name, session));
  return [...session.planExercises, ...adHoc];
}

export function sessionExerciseIdForApi(exercise: Exercise): number | null {
  return isAdHocExercise(exercise) ? null : exercise.id;
}
