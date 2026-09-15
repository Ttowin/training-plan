/**
 * Per-exercise form-cue reminders. Keyed by the exercise name as seeded in the
 * training plan. Displayed as selectable chips on the logging card so the user
 * can pick the cues they want to focus on for the session.
 */
export const EXERCISE_REMINDERS: Record<string, string[]> = {
  "High Row": [
    "肩胛骨同手踭向下沉",
    "向前嗰陣，拉伸多啲",
    "唔係諗住向後",
    "手踭貼近個身",
  ],
};

export function getReminders(exerciseName: string): string[] {
  return EXERCISE_REMINDERS[exerciseName] ?? [];
}
