# GymMatrix — System Design Document

## 1. Overview

**GymMatrix** is a progressive-overload fitness tracking web application optimized for mobile use and deployed entirely on Cloudflare's edge infrastructure. The application adopts a cyberpunk / Matrix aesthetic — matrix code rain, terminal readouts, and neon-glow interfaces — while providing a no-friction workout logging experience.

---

## 2. Goals & Requirements

### Functional Requirements
| # | Requirement |
|---|---|
| F1 | Maintain a 4-day cyclic training schedule: Chest & Shoulder → Back → Shoulder & Arm → Leg |
| F2 | Display the current training day based on cycle position; allow user override |
| F3 | Accept shorthand exercise input: `15x12x3` → 15 kg × 12 reps × 3 sets |
| F4 | Allow non-sequential exercise logging (user picks any exercise in any order) |
| F5 | Allow adding ad-hoc exercises not in the default plan |
| F6 | Display last week's performance side-by-side for every exercise during a session |
| F7 | Show week-over-week training volume comparison after session completion |
| F8 | Persist all training data across sessions |
| F9 | End / close a training session |

### Non-Functional Requirements
| # | Requirement |
|---|---|
| N1 | Mobile-first responsive layout |
| N2 | Deployed to Cloudflare (Workers + Pages + D1) |
| N3 | Event-driven backend architecture |
| N4 | < 200 ms API response time at edge |
| N5 | Automated test suite: unit, integration, E2E |

---

## 3. Training Plan Reference

The default plan seeded into the database:

| Cycle Order | Day Name | Muscle Targets |
|---|---|---|
| 1 | Chest & Shoulder Day | Chest 9 sets, Delt 6 sets |
| 2 | Back Day | Back 12 sets, Biceps 3 sets |
| 3 | Shoulder & Arm Day | Front Delt 6, Side Delt 3, Rear Delt 3, Tricep 3 |
| 4 | Leg Day | Quad 6, Hamstring 3, Hip 3 |

### Default Exercises (seeded)

**Chest & Shoulder Day**
1. Machine Chest Press — 3×10-12 — Smith machine or Machine
2. Dumbbell Incline Chest Press — 3×10-12
3. Machine Chest Fly — 3×12-15 — machine or cable
4. Shoulder Press — 3×10-12 — Smith machine or DB
5. Lateral Raise — 3×12-15 — dumbbell

**Back Day**
1. High Row — 3×10-12 — Machine
2. T Bar Row — 3×10-12 — Chest supported T bar
3. Wide Grip Lat Pulldown — 3×10-12
4. Low Row / Seated Row — 3×10-12
5. Hammer Curl — 3×10-15

**Shoulder & Arm Day**
1. Shoulder Press — 3×10-12 — Machine
2. Lateral Raise — 3×12-15 — Cable or machine
3. Reverse Rear Delt Fly — 3×12-15
4. Dumbbell Front Raise — 3×12-15
5. Cable Tricep Pushdown — 3×10-12

**Leg Day**
1. Hack Squat — 3×9-12
2. Single Leg Leg Press — 3×12
3. Leg Extension — 3×15
4. Leg Curl — 3×15
5. Ab Abductor Machine — 3×12-15

---

## 4. Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Cloudflare Network                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Cloudflare Pages (CDN Edge)              │  │
│  │  React SPA (static assets: JS, CSS, HTML)            │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │ /api/* requests                  │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │          Cloudflare Worker (Hono Framework)          │  │
│  │  • Route dispatch (event-driven request handlers)    │  │
│  │  • Business logic layer                              │  │
│  │  • D1 binding                                        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │ D1 SQL                           │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │              Cloudflare D1 (SQLite)                  │  │
│  │  • training_days, exercises                          │  │
│  │  • training_sessions, session_exercises              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Frontend (React + Vite)
- **Pages**: Dashboard, ActiveSession, History, Progress
- **Components**: MatrixRain canvas, ExerciseCard, InputShorthand, VolumeComparison, SessionSummary
- **State**: React Query for server state, Zustand for UI state
- **Styling**: TailwindCSS with custom Matrix theme tokens (neon green `#00ff41`, dark `#0d0208`)
- **Build output**: Static files deployed to Cloudflare Pages

#### Backend (Hono on Cloudflare Workers)
- Hono router handles incoming fetch events — pure event-driven model aligned with Cloudflare Workers' `fetch` event handler
- Routes delegate to domain service functions that read/write D1
- No long-running processes — each request is a self-contained event

---

## 5. Database Schema

```sql
-- Cyclic training day definitions
CREATE TABLE training_days (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  order_idx  INTEGER NOT NULL UNIQUE,
  muscle_targets TEXT NOT NULL  -- JSON: [{"muscle":"Chest","sets":9}, ...]
);

-- Default and user-added exercises per training day
CREATE TABLE exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  training_day_id  INTEGER NOT NULL REFERENCES training_days(id),
  name             TEXT    NOT NULL,
  order_idx        INTEGER NOT NULL,
  default_sets     INTEGER,
  reps_min         INTEGER,
  reps_max         INTEGER,
  equipment        TEXT,
  is_custom        INTEGER NOT NULL DEFAULT 0  -- 0=seeded, 1=user-added
);

-- One row per gym visit
CREATE TABLE training_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  training_day_id  INTEGER NOT NULL REFERENCES training_days(id),
  session_date     TEXT    NOT NULL,  -- YYYY-MM-DD
  started_at       TEXT    NOT NULL,  -- ISO-8601
  completed_at     TEXT,              -- NULL while active
  notes            TEXT
);

-- Each exercise log within a session (one row per exercise entry)
CREATE TABLE session_exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id       INTEGER NOT NULL REFERENCES training_sessions(id),
  exercise_id      INTEGER REFERENCES exercises(id),  -- NULL for ad-hoc
  exercise_name    TEXT    NOT NULL,   -- denormalised for ad-hoc support
  weight_kg        REAL,
  reps             INTEGER,
  sets             INTEGER,
  input_raw        TEXT,              -- original shorthand string "15x12x3"
  logged_at        TEXT    NOT NULL   -- ISO-8601
);
```

---

## 6. API Design

Base path: `/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/training-days` | List all training days with exercises |
| `GET` | `/current-day` | Compute current cycle day (based on last session date) |
| `POST` | `/sessions` | Create new training session `{trainingDayId, sessionDate}` |
| `GET` | `/sessions` | List sessions (optional `?limit=20&offset=0`) |
| `GET` | `/sessions/:id` | Get session detail with logged exercises |
| `PATCH` | `/sessions/:id/complete` | Mark session completed |
| `POST` | `/sessions/:id/exercises` | Log an exercise `{exerciseId?, exerciseName, weightKg, reps, sets, inputRaw}` |
| `DELETE` | `/sessions/:id/exercises/:exId` | Remove a logged exercise entry |
| `GET` | `/sessions/:id/comparison` | Last week's equivalent session for side-by-side comparison |
| `GET` | `/progress/volume` | Aggregate weekly volume per muscle group |

### Event Model (Event-Driven Pattern)
Each API request is treated as a **domain event**:
- `SessionStarted` — POST /sessions
- `ExerciseLogged` — POST /sessions/:id/exercises  
- `SessionCompleted` — PATCH /sessions/:id/complete

The Worker's fetch handler dispatches these events to pure handler functions, keeping side-effects isolated and testable.

---

## 7. Frontend Component Hierarchy

```
App
├── MatrixRainCanvas (background, canvas-based)
├── Router
│   ├── DashboardPage
│   │   ├── CurrentDayBadge
│   │   ├── CycleSelector (override training day)
│   │   └── StartSessionButton
│   ├── ActiveSessionPage
│   │   ├── SessionHeader (day name, elapsed timer)
│   │   ├── ExerciseList
│   │   │   └── ExerciseCard (last week ref + input field)
│   │   │       └── ShorthandInput ("15x12x3")
│   │   ├── AddExerciseModal
│   │   └── CompleteSessionButton
│   ├── HistoryPage
│   │   └── SessionCard[]
│   └── ProgressPage
│       ├── WeeklyVolumeChart
│       └── ExerciseProgressTable
└── GlobalNav
```

---

## 8. Shorthand Input Parser

User types: `15x12x3`
Parser produces: `{ weight: 15, reps: 12, sets: 3 }`

Also supports:
- `15x12` → `{ weight: 15, reps: 12, sets: 1 }`
- `bwx12x3` → `{ weight: null, reps: 12, sets: 3 }` (bodyweight)
- `15.5x12x4` → float weights

---

## 9. Cycle Logic

```
currentDayIndex = (lastCompletedSessionOrderIdx % 4) + 1
```

- On first use: defaults to Day 1 (Chest & Shoulder)
- After each completed session: next day in cycle is suggested
- User can override at any time via the CycleSelector UI

---

## 10. Deployment Configuration

```toml
# wrangler.toml
name = "gymmatrix"
main = "backend/src/index.ts"
compatibility_date = "2024-09-01"

[[ d1_databases ]]
binding = "DB"
database_name = "gymmatrix-db"
database_id = "<id after cf d1 create>"

[assets]
directory = "frontend/dist"
```

CI/CD: GitHub Actions pipeline
1. `npm test` — unit + integration
2. `npx playwright test` — E2E
3. `wrangler deploy` — on push to `main`

---

## 11. Security Considerations

- No authentication in MVP (single-user app, local storage of user preference for cycle position)
- All D1 queries use parameterized statements (no SQL injection risk)
- CORS restricted to same origin in production
- Input sanitized at API boundary with Zod schema validation

---

## 12. File Structure

```
/
├── docs/
│   ├── system-design.md          ← this file
│   └── testing-plan.md
├── backend/
│   ├── src/
│   │   ├── index.ts              ← Hono app entry
│   │   ├── routes/
│   │   │   ├── trainingDays.ts
│   │   │   ├── sessions.ts
│   │   │   └── progress.ts
│   │   ├── handlers/             ← domain event handlers
│   │   │   ├── sessionHandler.ts
│   │   │   └── exerciseHandler.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── seed.sql
│   │   │   └── queries.ts
│   │   └── types.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── wrangler.toml
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/
│   └── package.json
└── package.json                   ← root workspace scripts
```
