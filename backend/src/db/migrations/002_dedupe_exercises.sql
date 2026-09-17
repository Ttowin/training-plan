-- Remove duplicate exercises (keep lowest id per training day + order slot)
DELETE FROM exercises
WHERE id NOT IN (
  SELECT MIN(id)
  FROM exercises
  GROUP BY training_day_id, order_idx
);

DROP INDEX IF EXISTS idx_exercises_day;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_day_order ON exercises(training_day_id, order_idx);
