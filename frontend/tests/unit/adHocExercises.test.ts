import { describe, expect, it } from "vitest";
import {
  buildAdHocExercise,
  getSessionExercises,
  sessionExerciseIdForApi,
  stableAdHocExerciseId,
} from "../../src/utils/adHocExercises.js";
import type { Exercise, SessionDetail } from "../../src/types/index.js";

function makeSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 1,
    training_day_id: 10,
    session_date: "2026-01-01",
    started_at: "2026-01-01T10:00:00Z",
    completed_at: null,
    notes: null,
    training_day: {
      id: 10,
      name: "Day",
      order_idx: 0,
      muscle_targets: [],
      exercises: [],
    },
    planExercises: [
      {
        id: 100,
        training_day_id: 10,
        name: "Bench Press",
        order_idx: 0,
        default_sets: 3,
        reps_min: 8,
        reps_max: 12,
        equipment: "Barbell",
        is_custom: 0,
      },
    ],
    exercises: [],
    ...overrides,
  };
}

describe("adHocExercises", () => {
  it("assigns stable negative ids per exercise name", () => {
    const a = stableAdHocExerciseId("Cable Crossover");
    const b = stableAdHocExerciseId("Cable Crossover");
    expect(a).toBeLessThan(0);
    expect(a).toBe(b);
  });

  it("merges ad-hoc names into session exercises after plan", () => {
    const session = makeSession({
      exercises: [
        {
          id: 1,
          session_id: 1,
          exercise_id: null,
          exercise_name: "Cable Crossover",
          weight_kg: 12,
          reps: 15,
          sets: 3,
          input_raw: "12x15x3",
          method_id: null,
          method_label: null,
          logged_at: "2026-01-01T10:05:00Z",
        },
      ],
    });

    const merged = getSessionExercises(session);
    expect(merged).toHaveLength(2);
    expect(merged[0].name).toBe("Bench Press");
    expect(merged[1].name).toBe("Cable Crossover");
    expect(merged[1].id).toBe(stableAdHocExerciseId("Cable Crossover"));
  });

  it("maps ad-hoc exercises to null api ids", () => {
    const adHoc = buildAdHocExercise("Pull-up", makeSession());
    expect(sessionExerciseIdForApi(adHoc)).toBeNull();
    const plan: Exercise = { ...adHoc, id: 5, is_custom: 0 };
    expect(sessionExerciseIdForApi(plan)).toBe(5);
  });
});
