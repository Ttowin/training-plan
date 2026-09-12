export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export interface TrainingDay {
  id: number;
  name: string;
  order_idx: number;
  muscle_targets: MuscleTarget[];
}

export interface MuscleTarget {
  muscle: string;
  sets: number;
}

export interface Exercise {
  id: number;
  training_day_id: number;
  name: string;
  order_idx: number;
  default_sets: number;
  reps_min: number | null;
  reps_max: number | null;
  equipment: string | null;
  is_custom: 0 | 1;
}

export interface TrainingSession {
  id: number;
  training_day_id: number;
  session_date: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface SessionExercise {
  id: number;
  session_id: number;
  exercise_id: number | null;
  exercise_name: string;
  weight_kg: number | null;
  reps: number | null;
  sets: number | null;
  input_raw: string | null;
  logged_at: string;
}

export interface ParsedShorthand {
  weight: number | null;
  reps: number;
  sets: number;
}

export interface ShorthandParseError {
  error: string;
}

export type ShorthandResult = ParsedShorthand | ShorthandParseError;

export interface SessionWithExercises extends TrainingSession {
  exercises: SessionExercise[];
  training_day: TrainingDay;
}

export interface ComparisonSession {
  session: TrainingSession | null;
  exercises: SessionExercise[];
}
