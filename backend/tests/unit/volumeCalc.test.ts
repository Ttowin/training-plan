import { describe, it, expect } from "vitest";
import {
  computeExerciseVolume,
  computeSessionVolume,
  computeExerciseBreakdown,
} from "../../src/handlers/volumeCalc.js";
import type { SessionExercise } from "../../src/types.js";

function makeExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: 1,
    session_id: 1,
    exercise_id: 1,
    exercise_name: "Test Exercise",
    weight_kg: 15,
    reps: 12,
    sets: 3,
    input_raw: "15x12x3",
    logged_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Training volume calculation", () => {
  it("computes total volume as weight × reps × sets", () => {
    const ex = makeExercise({ weight_kg: 15, reps: 12, sets: 3 });
    expect(computeExerciseVolume(ex)).toBe(15 * 12 * 3); // 540
  });

  it("sums volume correctly across multiple exercises in a session", () => {
    const exercises = [
      makeExercise({ weight_kg: 15, reps: 12, sets: 3 }), // 540
      makeExercise({ weight_kg: 20, reps: 10, sets: 3 }), // 600
    ];
    expect(computeSessionVolume(exercises)).toBe(1140);
  });

  it("returns 0 volume for sessions with no logged exercises", () => {
    expect(computeSessionVolume([])).toBe(0);
  });

  it("handles bodyweight (null weight) exercises gracefully — counts as 0 kg", () => {
    const ex = makeExercise({ weight_kg: null, reps: 15, sets: 3 });
    expect(computeExerciseVolume(ex)).toBe(0);
  });

  it("handles null reps gracefully", () => {
    const ex = makeExercise({ weight_kg: 15, reps: null, sets: 3 });
    expect(computeExerciseVolume(ex)).toBe(0);
  });

  it("handles null sets gracefully", () => {
    const ex = makeExercise({ weight_kg: 15, reps: 12, sets: null });
    expect(computeExerciseVolume(ex)).toBe(0);
  });

  it("computes exercise breakdown with correct volume per exercise", () => {
    const exercises = [
      makeExercise({ exercise_name: "Bench Press", weight_kg: 100, reps: 5, sets: 5 }),
      makeExercise({ exercise_name: "Row", weight_kg: 60, reps: 10, sets: 4 }),
    ];
    const breakdown = computeExerciseBreakdown(exercises);
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].totalVolume).toBe(2500);
    expect(breakdown[1].totalVolume).toBe(2400);
    expect(breakdown[0].exerciseName).toBe("Bench Press");
  });
});
