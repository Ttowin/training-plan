---
name: gymmatrix-db
description: >
  Query, insert, update, and analyze GymMatrix workout records in the local
  D1 database the running app uses. Use when asked to look up sessions,
  exercises, sets, volume, or progression, to log or edit training data, or
  to reason about the records currently stored by the app.
---

# GymMatrix local database

The running app (`npm run dev --workspace=backend`, Wrangler on port 8787) stores its records in the local Cloudflare D1 SQLite file under `backend/.wrangler/state/v3/d1`. Query and change that file with `db:sql`. The command finds the file itself, including while the worker has it open, so the rows you read are the rows the app is serving and a committed write shows up in the app immediately.

Run it from the repo root:

```bash
npm run db:sql --workspace=backend -- "SELECT id, name, order_idx FROM training_days ORDER BY order_idx"
```

Writes stay off until the user has asked to add or change records. Then pass `--write` and bind every value with `?` plus `--params`, a JSON array:

```bash
npm run db:sql --workspace=backend -- --write --params '[1,"2026-11-08","2026-11-08T04:00:00.000Z",null]' -- "INSERT INTO training_sessions (training_day_id, session_date, started_at, notes) VALUES (?, ?, ?, ?) RETURNING *"
```

`npm` prints a short script banner before the result. The result itself is one JSON object on stdout:

- `ok` — whether the statement ran
- `mode` — `read` or `write`
- `database` — repo-relative file that was opened. It should sit under `backend/.wrangler/state/v3/d1`
- `rows` — result rows. `INSERT`/`UPDATE`/`DELETE` include rows only when the statement says `RETURNING`
- `changes` — rows written
- `lastInsertRowid` — new row id after an insert
- `alsoFound` — other sqlite files in that directory. The command opens the one most recently touched (the file the worker is using). If `alsoFound` is non-empty, say which file you opened

A non-zero exit means `ok` is false and `error` explains why. The statement was not applied.

## Rules

- One statement per call. Put values in `--params`, so names and notes cannot change the statement.
- Reads need no flag. `INSERT`, `UPDATE`, and `DELETE` need `--write`.
- The tool rejects `DROP`, `ALTER`, `CREATE`, and other schema statements. Schema changes belong in `backend/src/db/migrations/` and `schema.sql`, then the app's migrate scripts.
- Leave `backend/.wrangler` in place. Deleting it destroys the workouts the app is using. `db:seed:local` only inserts missing seed rows; it is not a reload.
- This environment's install recreates that directory from the seed when a new VM is built. Records added after that live in the local file for this environment. A new environment starts from the seed again.
- The dev server's working directory is `backend/`. Start it with `npm run dev --workspace=backend` so it uses this same directory. `db:sql` always opens `backend/.wrangler/state`, whatever the shell's current directory is.
- Confirm a write by selecting the row back. When the worker is up, `GET http://127.0.0.1:8787/api/sessions` and `GET http://127.0.0.1:8787/api/training-days` read this same database.
- `session_date` is a calendar date `YYYY-MM-DD`. When the user says today, use the date in Asia/Hong_Kong. `started_at` and `logged_at` are UTC ISO-8601 timestamps, the same form `new Date().toISOString()` writes.
- Deleting a session also deletes its `session_exercises` rows. Deleting a training day also deletes its plan exercises.

## Tables

`training_days`

| column | notes |
|---|---|
| `id` | integer primary key |
| `name` | day name |
| `order_idx` | cycle position, unique. Seeded 1–4 |
| `muscle_targets` | JSON text, e.g. `[{"muscle":"Quad","sets":6}]` |

Seeded days: 1 Chest & Shoulder, 2 Back, 3 Shoulder & Arm, 4 Leg.

`exercises`

| column | notes |
|---|---|
| `id` | integer primary key. Seeded plan rows are 1–20 |
| `training_day_id` | required, references `training_days.id`. Deleting the day deletes these rows |
| `name` | display name |
| `order_idx` | order within the day. For a new row use `MAX(order_idx) + 1` for that day |
| `default_sets`, `reps_min`, `reps_max` | plan targets. Reps columns may be null |
| `equipment` | text or null |
| `is_custom` | `0` seeded plan, `1` user-added |

`training_sessions`

| column | notes |
|---|---|
| `id` | integer primary key |
| `training_day_id` | required, references `training_days.id` |
| `session_date` | `YYYY-MM-DD` |
| `started_at` | ISO-8601 UTC |
| `completed_at` | null while the session is in progress |
| `notes` | text or null |

`session_exercises` — one logged entry. A repeated exercise in the same session is another row.

| column | notes |
|---|---|
| `id` | integer primary key |
| `session_id` | required, references `training_sessions.id` |
| `exercise_id` | plan exercise id, or null for an ad-hoc name |
| `exercise_name` | required. Copy the plan name when `exercise_id` is set |
| `weight_kg` | number, or null for bodyweight |
| `reps`, `sets` | integers |
| `input_raw` | shorthand the app would have stored, such as `15x12x3` or `bwx15x3` |
| `method_id`, `method_label` | null when the log has no method |
| `logged_at` | ISO-8601 UTC |

Shorthand is `weight x reps x sets`. `15x12x3` means 15 kg, 12 reps, 3 sets. `15x12` means 1 set. `bwx15x3` means bodyweight: store `weight_kg` as null. Volume in the app is `weight_kg × reps × sets`, and a null weight counts as 0. The in-app volume chart (`GET /api/progress/volume`) sums that formula for sessions whose `completed_at` is set, grouped by the Monday of `session_date`.

## Statements that match the app

List recent sessions with the day name:

```sql
SELECT ts.id, ts.session_date, ts.started_at, ts.completed_at, td.name AS day_name, ts.notes
FROM training_sessions ts
JOIN training_days td ON td.id = ts.training_day_id
ORDER BY ts.session_date DESC, ts.started_at DESC
LIMIT 50
```

Per-exercise history, heaviest set first within each day:

```sql
SELECT se.exercise_name, ts.session_date, se.weight_kg, se.reps, se.sets,
       COALESCE(se.weight_kg, 0) * COALESCE(se.reps, 0) * COALESCE(se.sets, 0) AS volume_kg,
       se.input_raw, se.method_label
FROM session_exercises se
JOIN training_sessions ts ON ts.id = se.session_id
ORDER BY se.exercise_name, ts.session_date, se.logged_at
```

Weekly volume for completed sessions, week starting Monday, matching the progress page:

```sql
SELECT date(ts.session_date, '-' || ((CAST(strftime('%w', ts.session_date) AS INTEGER) + 6) % 7) || ' days') AS week_start,
       td.name AS day_name,
       SUM(COALESCE(se.weight_kg, 0) * COALESCE(se.reps, 0) * COALESCE(se.sets, 0)) AS volume_kg,
       COUNT(DISTINCT ts.id) AS sessions
FROM training_sessions ts
JOIN training_days td ON td.id = ts.training_day_id
JOIN session_exercises se ON se.session_id = ts.id
WHERE ts.completed_at IS NOT NULL
GROUP BY week_start, td.name
ORDER BY week_start, td.order_idx
```

Open a session (use the real `training_days.id`):

```sql
INSERT INTO training_sessions (training_day_id, session_date, started_at, notes)
VALUES (?, ?, ?, ?)
RETURNING *
```

Log a set on that session:

```sql
INSERT INTO session_exercises
  (session_id, exercise_id, exercise_name, weight_kg, reps, sets, input_raw, method_id, method_label, logged_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *
```

Mark a session complete:

```sql
UPDATE training_sessions
SET completed_at = ?
WHERE id = ? AND completed_at IS NULL
RETURNING *
```

Look up a plan exercise before logging it, and use that id and name:

```sql
SELECT id, name, training_day_id FROM exercises
WHERE training_day_id = ? AND name = ?
```

Add a custom plan exercise only when the user wants it on the day, not for a one-off log. A one-off log keeps `exercise_id` null.

```sql
INSERT INTO exercises (training_day_id, name, order_idx, default_sets, reps_min, reps_max, equipment, is_custom)
VALUES (?, ?, ?, ?, ?, ?, ?, 1)
RETURNING *
```

Column details are also available with `PRAGMA table_info('session_exercises')`.

When you answer with an analysis, use the figures from the JSON `rows` you just queried and name the session dates they come from. Say when a session is still open (`completed_at` null), because the progress chart leaves those out.
