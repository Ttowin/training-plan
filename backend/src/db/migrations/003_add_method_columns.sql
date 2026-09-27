-- One-time upgrade for databases created before method columns were added to schema.sql.
-- Fresh installs get method_id/method_label from schema.sql; run this only on legacy DBs.
-- Safe to re-run via db:upgrade:method-columns:* (errors are ignored when columns exist).
ALTER TABLE session_exercises ADD COLUMN method_id TEXT DEFAULT NULL;
ALTER TABLE session_exercises ADD COLUMN method_label TEXT DEFAULT NULL;
