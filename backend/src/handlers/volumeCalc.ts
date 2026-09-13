import type { SessionExercise } from "../types.js";

export interface ExerciseVolume {
  exerciseName: string;
  totalVolume: number;
  sets: number;
  reps: number;
  weightKg: number | null;
}

export interface WeeklyVolume {
  weekStart: string;
  totalVolume: number;
  exercises: ExerciseVolume[];
}

/**
 * Computes total volume for a single exercise entry.
 * Volume = weight_kg × reps × sets
 * Bodyweight exercises (null weight) are counted as 0 kg for volume purposes.
 */
export function computeExerciseVolume(exercise: SessionExercise): number {
  const weight = exercise.weight_kg ?? 0;
  const reps = exercise.reps ?? 0;
  const sets = exercise.sets ?? 0;
  return weight * reps * sets;
}

/**
 * Aggregates volume across all exercises in a session.
 */
export function computeSessionVolume(exercises: SessionExercise[]): number {
  return exercises.reduce((sum, ex) => sum + computeExerciseVolume(ex), 0);
}

/**
 * Returns per-exercise volume breakdown for a session.
 */
export function computeExerciseBreakdown(exercises: SessionExercise[]): ExerciseVolume[] {
  return exercises.map((ex) => ({
    exerciseName: ex.exercise_name,
    totalVolume: computeExerciseVolume(ex),
    sets: ex.sets ?? 0,
    reps: ex.reps ?? 0,
    weightKg: ex.weight_kg,
  }));
}
