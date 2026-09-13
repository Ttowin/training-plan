import { Hono } from "hono";
import { computeSessionVolume } from "../handlers/volumeCalc.js";
import { parseSessionExercise, queries } from "../db/queries.js";
import type { Env, MuscleTarget } from "../types.js";

const progress = new Hono<{ Bindings: Env }>();

// Weekly volume for the past N weeks
progress.get("/volume", async (c) => {
  const db = c.env.DB;
  const weeksBack = Math.min(parseInt(c.req.query("weeks") ?? "8"), 26);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeksBack * 7);

  const result = await db
    .prepare(queries.getSessionsForDateRange)
    .bind(
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10)
    )
    .all();

  const sessions = result.results as Record<string, unknown>[];

  // Group by ISO week
  const weekMap = new Map<
    string,
    {
      weekStart: string;
      totalVolume: number;
      sessionCount: number;
      byDay: Record<string, number>;
    }
  >();

  for (const sess of sessions) {
    const sessDate = new Date(sess.session_date as string);
    const weekStart = getWeekStart(sessDate);

    const exResult = await db
      .prepare(queries.getExercisesForSession)
      .bind(sess.id as number)
      .all();
    const exercises = (exResult.results as Record<string, unknown>[]).map(
      parseSessionExercise
    );

    const sessVolume = computeSessionVolume(exercises);
    const dayName = sess.day_name as string;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {
        weekStart,
        totalVolume: 0,
        sessionCount: 0,
        byDay: {},
      });
    }

    const week = weekMap.get(weekStart)!;
    week.totalVolume += sessVolume;
    week.sessionCount += 1;
    week.byDay[dayName] = (week.byDay[dayName] ?? 0) + sessVolume;
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  return c.json({ data: { weeks } });
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export { progress };
