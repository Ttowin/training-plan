import { Hono } from "hono";
import { getNextDayOrderIdx } from "../handlers/cycleLogic.js";
import {
  parseExercise,
  parseSession,
  parseTrainingDay,
  queries,
} from "../db/queries.js";
import type { Env } from "../types.js";

const trainingDays = new Hono<{ Bindings: Env }>();

trainingDays.get("/", async (c) => {
  const db = c.env.DB;

  const daysResult = await db.prepare(queries.getAllTrainingDays).all();
  const days = (daysResult.results as Record<string, unknown>[]).map(parseTrainingDay);

  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const exResult = await db
        .prepare(queries.getExercisesForDay)
        .bind(day.id)
        .all();
      const exercises = (exResult.results as Record<string, unknown>[]).map(parseExercise);
      return { ...day, exercises };
    })
  );

  return c.json({ data: daysWithExercises });
});

trainingDays.get("/current", async (c) => {
  const db = c.env.DB;

  const lastSessionResult = await db
    .prepare(queries.getLastCompletedSession)
    .first<Record<string, unknown>>();

  const lastSession = lastSessionResult ? parseSession(lastSessionResult) : null;
  const lastDayOrderIdx = lastSession
    ? (lastSession.training_day_id as number)
    : null;

  // Look up what order_idx the last session's day had
  let lastOrderIdx: number | null = null;
  if (lastSession) {
    const dayRow = await db
      .prepare(queries.getTrainingDayById)
      .bind(lastSession.training_day_id)
      .first<Record<string, unknown>>();
    if (dayRow) {
      lastOrderIdx = dayRow.order_idx as number;
    }
  }

  const nextOrderIdx = getNextDayOrderIdx(lastOrderIdx);

  const dayRow = await db
    .prepare(queries.getTrainingDayByOrderIdx)
    .bind(nextOrderIdx)
    .first<Record<string, unknown>>();

  if (!dayRow) {
    return c.json({ error: "Training day not found" }, 404);
  }

  const day = parseTrainingDay(dayRow);
  const exResult = await db
    .prepare(queries.getExercisesForDay)
    .bind(day.id)
    .all();
  const exercises = (exResult.results as Record<string, unknown>[]).map(parseExercise);

  return c.json({
    data: {
      ...day,
      exercises,
      lastSession: lastSession
        ? { id: lastSession.id, session_date: lastSession.session_date }
        : null,
    },
  });
});

export { trainingDays };
