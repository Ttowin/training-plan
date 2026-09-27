import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { parseShorthand, isParseError } from "../handlers/shorthandParser.js";
import {
  parseExercise,
  parseSession,
  parseSessionExercise,
  parseTrainingDay,
  queries,
} from "../db/queries.js";
import type { Env } from "../types.js";

const sessions = new Hono<{ Bindings: Env }>();

const createSessionSchema = z.object({
  trainingDayId: z.number().int().positive(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

const logExerciseSchema = z.object({
  exerciseId: z.number().int().positive().nullable().optional(),
  exerciseName: z.string().min(1, "Exercise name required"),
  inputRaw: z.string().min(1, "Shorthand input required"),
  methodId: z.string().min(1).nullable().optional(),
  methodLabel: z.string().min(1).nullable().optional(),
});

// List sessions
sessions.get("/", async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = parseInt(c.req.query("offset") ?? "0");

  const result = await db
    .prepare(queries.listSessions)
    .bind(limit, offset)
    .all();

  const data = (result.results as Record<string, unknown>[]).map((row) => ({
    ...parseSession(row),
    day_name: row.day_name as string,
  }));

  return c.json({ data });
});

// Create session — SessionStarted event
sessions.post(
  "/",
  zValidator("json", createSessionSchema),
  async (c) => {
    const db = c.env.DB;
    const { trainingDayId, sessionDate } = c.req.valid("json");

    // Verify training day exists
    const dayRow = await db
      .prepare(queries.getTrainingDayById)
      .bind(trainingDayId)
      .first<Record<string, unknown>>();

    if (!dayRow) {
      return c.json({ error: "Training day not found" }, 404);
    }

    const now = new Date().toISOString();
    const row = await db
      .prepare(queries.createSession)
      .bind(trainingDayId, sessionDate, now)
      .first<Record<string, unknown>>();

    if (!row) {
      return c.json({ error: "Failed to create session" }, 500);
    }

    return c.json({ data: parseSession(row) }, 201);
  }
);

// Get session by id
sessions.get("/:id", async (c) => {
  const db = c.env.DB;
  const sessionId = parseInt(c.req.param("id"));

  const sessionRow = await db
    .prepare(queries.getSessionById)
    .bind(sessionId)
    .first<Record<string, unknown>>();

  if (!sessionRow) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = parseSession(sessionRow);

  const dayRow = await db
    .prepare(queries.getTrainingDayById)
    .bind(session.training_day_id)
    .first<Record<string, unknown>>();

  const trainingDay = dayRow ? parseTrainingDay(dayRow) : null;

  const exResult = await db
    .prepare(queries.getExercisesForSession)
    .bind(sessionId)
    .all();
  const exercises = (exResult.results as Record<string, unknown>[]).map(
    parseSessionExercise
  );

  // Get plan exercises for reference
  const planExResult = await db
    .prepare(queries.getExercisesForDay)
    .bind(session.training_day_id)
    .all();
  const planExercises = (planExResult.results as Record<string, unknown>[]).map(parseExercise);

  return c.json({ data: { ...session, training_day: trainingDay, exercises, planExercises } });
});

// Complete session — SessionCompleted event
sessions.patch("/:id/complete", async (c) => {
  const db = c.env.DB;
  const sessionId = parseInt(c.req.param("id"));

  const sessionRow = await db
    .prepare(queries.getSessionById)
    .bind(sessionId)
    .first<Record<string, unknown>>();

  if (!sessionRow) {
    return c.json({ error: "Session not found" }, 404);
  }

  const existing = parseSession(sessionRow);
  if (existing.completed_at) {
    return c.json({ error: "Session already completed" }, 409);
  }

  const now = new Date().toISOString();
  const row = await db
    .prepare(queries.completeSession)
    .bind(now, sessionId)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Failed to complete session" }, 500);
  }

  return c.json({ data: parseSession(row) });
});

// Log exercise — ExerciseLogged event
sessions.post(
  "/:id/exercises",
  zValidator("json", logExerciseSchema),
  async (c) => {
    const db = c.env.DB;
    const sessionId = parseInt(c.req.param("id"));
    const { exerciseId, exerciseName, inputRaw, methodId, methodLabel } = c.req.valid("json");

    const sessionRow = await db
      .prepare(queries.getSessionById)
      .bind(sessionId)
      .first<Record<string, unknown>>();

    if (!sessionRow) {
      return c.json({ error: "Session not found" }, 404);
    }

    const parsed = parseShorthand(inputRaw);
    if (isParseError(parsed)) {
      return c.json({ error: parsed.error }, 400);
    }

    const now = new Date().toISOString();
    const row = await db
      .prepare(queries.logExercise)
      .bind(
        sessionId,
        exerciseId ?? null,
        exerciseName,
        parsed.weight,
        parsed.reps,
        parsed.sets,
        inputRaw,
        methodId ?? null,
        methodLabel ?? null,
        now
      )
      .first<Record<string, unknown>>();

    if (!row) {
      return c.json({ error: "Failed to log exercise" }, 500);
    }

    return c.json({ data: parseSessionExercise(row) }, 201);
  }
);

// Delete a logged exercise entry
sessions.delete("/:id/exercises/:exId", async (c) => {
  const db = c.env.DB;
  const sessionId = parseInt(c.req.param("id"));
  const exId = parseInt(c.req.param("exId"));

  await db
    .prepare(queries.deleteSessionExercise)
    .bind(exId, sessionId)
    .run();

  return c.json({ data: { deleted: true } });
});

// Get comparison with last session of same training day
sessions.get("/:id/comparison", async (c) => {
  const db = c.env.DB;
  const sessionId = parseInt(c.req.param("id"));

  const sessionRow = await db
    .prepare(queries.getSessionById)
    .bind(sessionId)
    .first<Record<string, unknown>>();

  if (!sessionRow) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = parseSession(sessionRow);

  const prevRow = await db
    .prepare(queries.getLastCompletedSessionForDay)
    .bind(session.training_day_id, sessionId)
    .first<Record<string, unknown>>();

  if (!prevRow) {
    return c.json({ data: { session: null, exercises: [] } });
  }

  const prevSession = parseSession(prevRow);
  const exResult = await db
    .prepare(queries.getExercisesForSession)
    .bind(prevSession.id)
    .all();
  const exercises = (exResult.results as Record<string, unknown>[]).map(
    parseSessionExercise
  );

  return c.json({ data: { session: prevSession, exercises } });
});

// Delete session — cascades to session_exercises via FK
sessions.delete("/:id", async (c) => {
  const db = c.env.DB;
  const sessionId = parseInt(c.req.param("id"));

  const sessionRow = await db
    .prepare(queries.getSessionById)
    .bind(sessionId)
    .first<Record<string, unknown>>();

  if (!sessionRow) {
    return c.json({ error: "Session not found" }, 404);
  }

  await db.prepare(queries.deleteSession).bind(sessionId).run();

  return c.json({ data: { deleted: true } });
});

export { sessions };
