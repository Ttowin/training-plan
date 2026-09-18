-- Add exercise method tracking to session logs (nullable for legacy rows)
ALTER TABLE session_exercises ADD COLUMN method_id TEXT DEFAULT NULL;
ALTER TABLE session_exercises ADD COLUMN method_label TEXT DEFAULT NULL;
