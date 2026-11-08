---
name: gymmatrix-db
description: >
  Query, insert, update, and analyze GymMatrix workout records in the hosted
  Cloudflare D1 database gymmatrix-db. Use when asked to look up sessions,
  exercises, sets, volume, or progression, to log or edit training data, or
  to reason about the records the deployed Worker is serving. Prefer the
  Cloudflare API MCP tools search, execute, and whoami when they are connected.
---

# GymMatrix Cloudflare D1

The deployed Worker, https://gymmatrix.cchunyungg123.workers.dev, stores its records in Cloudflare D1 database `gymmatrix-db` (`database_id` in `backend/wrangler.toml`). A committed write is what the hosted app serves.

## Cloudflare API MCP

Use the connected Cloudflare API MCP server (`https://mcp.cloudflare.com/mcp`, configured in `.cursor/mcp.json` as `cloudflare-api`) before any local command. Its tools are `whoami`, `search`, `execute`, and `docs`. Code Mode keeps the OpenAPI spec on the server: `search` finds the endpoint, `execute` calls it.

1. Call `whoami`. A user login returns `{ id, email }`. An account token returns `{ id, name }` with `id` shaped like `account: <account id>`.
2. `search` for the D1 query route, `POST /accounts/{account_id}/d1/database/{database_id}/query`.
3. `execute` that route. The database id is `1f2eaa61-d59c-4060-9b09-c8f7ffb2a6eb`. Pass SQL in the JSON body as `sql` and bound values as `params`. For a user OAuth login, pass `account_id` into `execute`. An account token fills the account id in itself.

```javascript
async () => {
  const response = await cloudflare.request({
    method: "POST",
    path: `/accounts/${accountId}/d1/database/1f2eaa61-d59c-4060-9b09-c8f7ffb2a6eb/query`,
    body: {
      sql: "SELECT id, name, order_idx FROM training_days ORDER BY order_idx",
      params: []
    }
  });
  return response.result;
}
```

Reads need the `d1.read` scope. Inserts, updates, and deletes need `d1.write`. If the tool result says a scope is missing, stop and ask the user to re-authorize so that scope is added. One statement per call. Bind values in `params`. Do not send `DROP`, `ALTER`, or `CREATE` through this path.

The server answers `401` until someone signs in. Signing in is a Cloudflare OAuth redirect. For a Cloud Agent, add an HTTP MCP server named `cloudflare-api` with URL `https://mcp.cloudflare.com/mcp` from the MCP list at cursor.com/agents, then choose Authorize and grant D1 read and D1 write. Cursor's redirect URL is `https://www.cursor.com/agents/mcp/oauth/callback`. Desktop Cursor uses the same URL from `.cursor/mcp.json` and redirects through `http://localhost:8787/callback`. A new agent run picks up the connection. This run does not.

The other login is a Cloudflare API token sent as `Authorization: Bearer <token>` on that same MCP server. Create it in the Cloudflare dashboard with D1 Read, D1 Edit, and Account Settings Read (account tokens need Account Resources Read so the server can see the account). Do not paste the token into chat, commit it, or put it in `.cursor/mcp.json`. Add it only as the MCP server's Authorization header where Cursor stores MCP headers. Tokens with client IP filtering do not work against this server.

When `whoami`, `search`, and `execute` are absent, the MCP server is not connected. Say that and stop, unless `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are already in the environment. In that case use `db:sql` below. Do not query `backend/.wrangler` and present those rows as the hosted data. That directory is the local Wrangler simulator.

## Direct D1 API

`db:sql` calls the same D1 query endpoint when the MCP tools are not connected and both environment variables are set. It reads them from the environment. Never print the token, put it in a command argument, or write it into a file.

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
- `host` — `cloudflare-d1`
- `database` — `gymmatrix-db`
- `databaseId` — the D1 id from `backend/wrangler.toml`
- `rows` — result rows. `INSERT`/`UPDATE`/`DELETE` include rows only when the statement says `RETURNING`
- `changes` — rows written
- `lastInsertRowid` — new row id after an insert

A non-zero exit means `ok` is false and `error` explains why. The statement was not applied. If `error` says the Cloudflare credentials are required, stop. Ask for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to be added to the cloud agent environment. Do not query `backend/.wrangler` and present those rows as the hosted data. That directory is the local Wrangler simulator, a different database from D1.

## Rules

- One statement per call. Put values in `--params`, so names and notes cannot change the statement.
- Reads need no flag. `INSERT`, `UPDATE`, and `DELETE` need `--write`.
- The tool rejects `DROP`, `ALTER`, `CREATE`, and other schema statements. Schema changes belong in `backend/src/db/migrations/` and `schema.sql`, then `npm run db:migrate:remote --workspace=backend`.
- Confirm a write by selecting the row back. The hosted app reads this same D1 database: `GET https://gymmatrix.cchunyungg123.workers.dev/api/sessions` and `GET https://gymmatrix.cchunyungg123.workers.dev/api/training-days`.
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
