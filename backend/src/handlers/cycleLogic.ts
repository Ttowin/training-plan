import type { TrainingSession } from "../types.js";

const CYCLE_LENGTH = 4;

/**
 * Determines the next training day order_idx based on the last completed session.
 * Returns 1 if no sessions have been completed (start of cycle).
 */
export function computeCurrentDayIdx(lastCompletedSession: TrainingSession | null): number {
  if (!lastCompletedSession) {
    return 1;
  }
  const lastOrderIdx = lastCompletedSession.training_day_id;
  return (lastOrderIdx % CYCLE_LENGTH) + 1;
}

/**
 * Returns the order_idx of the training day that should be shown
 * based on the last completed session's training_day_id (which equals order_idx
 * since we seed with id == order_idx).
 */
export function getNextDayOrderIdx(lastCompletedDayOrderIdx: number | null): number {
  if (lastCompletedDayOrderIdx === null) {
    return 1;
  }
  return (lastCompletedDayOrderIdx % CYCLE_LENGTH) + 1;
}
