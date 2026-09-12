import type {
  Exercise,
  SessionExercise,
  TrainingDay,
  TrainingSession,
} from "../types.js";

export const queries = {
  // ── Training Days ──────────────────────────────────────────────────────
  getAllTrainingDays: `
    SELECT * FROM training_days ORDER BY order_idx ASC
  `,

  getTrainingDayByOrderIdx: `
    SELECT * FROM training_days WHERE order_idx = ? LIMIT 1
  `,

  getTrainingDayById: `
    SELECT * FROM training_days WHERE id = ? LIMIT 1
  `,

  getExercisesForDay: `
    SELECT * FROM exercises WHERE training_day_id = ? ORDER BY order_idx ASC
  `,

  // ── Sessions ───────────────────────────────────────────────────────────
  getLastCompletedSession: `
    SELECT * FROM training_sessions
    WHERE completed_at IS NOT NULL
    ORDER BY session_date DESC, completed_at DESC
    LIMIT 1
  `,

  createSession: `
    INSERT INTO training_sessions (training_day_id, session_date, started_at)
    VALUES (?, ?, ?)
    RETURNING *
  `,

  getSessionById: `
    SELECT * FROM training_sessions WHERE id = ? LIMIT 1
  `,

  getActiveSessions: `
    SELECT * FROM training_sessions
    WHERE completed_at IS NULL
    ORDER BY started_at DESC
  `,

  completeSession: `
    UPDATE training_sessions
    SET completed_at = ?
    WHERE id = ? AND completed_at IS NULL
    RETURNING *
  `,

  listSessions: `
    SELECT ts.*, td.name as day_name
    FROM training_sessions ts
    JOIN training_days td ON ts.training_day_id = td.id
    ORDER BY ts.session_date DESC, ts.started_at DESC
    LIMIT ? OFFSET ?
  `,

  // ── Session Exercises ──────────────────────────────────────────────────
  getExercisesForSession: `
    SELECT * FROM session_exercises WHERE session_id = ? ORDER BY logged_at ASC
  `,

  logExercise: `
    INSERT INTO session_exercises
      (session_id, exercise_id, exercise_name, weight_kg, reps, sets, input_raw, logged_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `,

  deleteSessionExercise: `
    DELETE FROM session_exercises WHERE id = ? AND session_id = ?
  `,

  // ── Comparison ─────────────────────────────────────────────────────────
  getLastCompletedSessionForDay: `
    SELECT * FROM training_sessions
    WHERE training_day_id = ?
      AND completed_at IS NOT NULL
      AND id != ?
    ORDER BY session_date DESC
    LIMIT 1
  `,

  // ── Progress ───────────────────────────────────────────────────────────
  getSessionsForDateRange: `
    SELECT ts.*, td.name as day_name, td.muscle_targets
    FROM training_sessions ts
    JOIN training_days td ON ts.training_day_id = td.id
    WHERE ts.session_date >= ? AND ts.session_date <= ?
      AND ts.completed_at IS NOT NULL
    ORDER BY ts.session_date ASC
  `,
};

export function parseTrainingDay(row: Record<string, unknown>): TrainingDay {
  return {
    id: row.id as number,
    name: row.name as string,
    order_idx: row.order_idx as number,
    muscle_targets: JSON.parse(row.muscle_targets as string),
  };
}

export function parseSession(row: Record<string, unknown>): TrainingSession {
  return {
    id: row.id as number,
    training_day_id: row.training_day_id as number,
    session_date: row.session_date as string,
    started_at: row.started_at as string,
    completed_at: (row.completed_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

export function parseExercise(row: Record<string, unknown>): Exercise {
  return {
    id: row.id as number,
    training_day_id: row.training_day_id as number,
    name: row.name as string,
    order_idx: row.order_idx as number,
    default_sets: row.default_sets as number,
    reps_min: (row.reps_min as number | null) ?? null,
    reps_max: (row.reps_max as number | null) ?? null,
    equipment: (row.equipment as string | null) ?? null,
    is_custom: row.is_custom as 0 | 1,
  };
}

export function parseSessionExercise(row: Record<string, unknown>): SessionExercise {
  return {
    id: row.id as number,
    session_id: row.session_id as number,
    exercise_id: (row.exercise_id as number | null) ?? null,
    exercise_name: row.exercise_name as string,
    weight_kg: (row.weight_kg as number | null) ?? null,
    reps: (row.reps as number | null) ?? null,
    sets: (row.sets as number | null) ?? null,
    input_raw: (row.input_raw as string | null) ?? null,
    logged_at: row.logged_at as string,
  };
}
