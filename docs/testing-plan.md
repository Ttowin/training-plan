# GymMatrix — Testing Plan Document

## 1. Testing Philosophy

All tests are **descriptive**, automated, and CI-gated. Every test includes a human-readable `describe`/`it` or `test` label that doubles as living documentation. Tests are organized into three tiers:

| Tier | Scope | Tools | Speed |
|---|---|---|---|
| Unit | Single function / component in isolation | Vitest, React Testing Library | < 1s per test |
| Integration | Multiple modules + D1 (local SQLite) | Vitest + Miniflare | < 5s per test |
| E2E | Full browser + running server | Playwright | < 30s per test |

CI matrix runs all tiers on every pull request and every push to `main`.

---

## 2. Test Infrastructure

### Backend
- **Runner**: Vitest
- **D1 mock**: Miniflare's D1 in-process SQLite for integration tests
- **HTTP testing**: Hono's `app.request()` test helper (no real network)

### Frontend
- **Unit runner**: Vitest + jsdom
- **Component testing**: React Testing Library
- **E2E runner**: Playwright (Chromium, Firefox, Mobile Chrome viewport)

### CI Automation
```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:backend
      - run: npm run test:frontend

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

---

## 3. Unit Tests

### 3.1 Backend Unit Tests

#### `shorthandParser.test.ts`
```
describe("Shorthand exercise input parser")
  ✓ parses "15x12x3" into weight=15, reps=12, sets=3
  ✓ parses "15x12" into weight=15, reps=12, sets=1 (default sets=1)
  ✓ parses "15.5x12x4" into weight=15.5 (float weights)
  ✓ parses "bwx12x3" into weight=null (bodyweight)
  ✓ returns validation error for empty string
  ✓ returns validation error for non-numeric weight
  ✓ returns validation error for zero reps
  ✓ returns validation error for negative sets
```

#### `cycleLogic.test.ts`
```
describe("Training day cycle logic")
  ✓ returns Day 1 (Chest & Shoulder) when no sessions exist
  ✓ returns Day 2 (Back) after completing Day 1
  ✓ returns Day 3 (Shoulder & Arm) after completing Day 2
  ✓ returns Day 4 (Leg) after completing Day 3
  ✓ wraps back to Day 1 after completing Day 4
  ✓ ignores incomplete (non-completed) sessions when computing next day
```

#### `volumeCalc.test.ts`
```
describe("Training volume calculation")
  ✓ computes total volume as weight × reps × sets
  ✓ sums volume correctly across multiple exercises in a session
  ✓ groups volume by muscle group from training day metadata
  ✓ returns 0 volume for sessions with no logged exercises
  ✓ handles bodyweight (null weight) exercises gracefully
```

#### `sessionValidator.test.ts`
```
describe("Session input validation (Zod schemas)")
  ✓ accepts valid session creation payload
  ✓ rejects missing trainingDayId
  ✓ rejects future session dates
  ✓ accepts valid exercise log payload
  ✓ rejects exercise log with no weight and no rawInput
```

### 3.2 Frontend Unit Tests

#### `ShorthandInput.test.tsx`
```
describe("ShorthandInput component")
  ✓ renders placeholder text "e.g. 15x12x3"
  ✓ calls onChange with parsed values on valid input
  ✓ shows error message for invalid shorthand format
  ✓ shows parsed preview (weight / reps / sets) below input field
  ✓ clears error on valid input after error state
  ✓ renders in matrix terminal style (dark bg, green text)
```

#### `ExerciseCard.test.tsx`
```
describe("ExerciseCard component")
  ✓ renders exercise name and default reps/sets
  ✓ renders "No previous data" when lastWeek is null
  ✓ renders last week's weight, reps, sets as reference
  ✓ highlights improvement when this session's volume > last week
  ✓ shows warning indicator when volume decreased
  ✓ calls onLog with parsed exercise data on submit
```

#### `MatrixRain.test.tsx`
```
describe("MatrixRain canvas component")
  ✓ renders a canvas element
  ✓ starts animation on mount
  ✓ stops animation on unmount (no memory leak)
```

#### `CycleSelector.test.tsx`
```
describe("CycleSelector component")
  ✓ renders all 4 training day options
  ✓ highlights currently selected day
  ✓ calls onSelect when user picks a different day
```

---

## 4. Integration Tests

### 4.1 Backend Integration Tests (Miniflare D1)

#### `sessions.integration.test.ts`
```
describe("Sessions API — POST /api/sessions")
  ✓ creates a new session and returns 201 with session id
  ✓ returns 400 when trainingDayId is invalid
  ✓ prevents creating a second active session (uncompleted) for same day

describe("Sessions API — GET /api/sessions/:id")
  ✓ returns session with logged exercises array
  ✓ returns 404 for non-existent session id

describe("Sessions API — POST /api/sessions/:id/exercises")
  ✓ logs exercise and returns 201
  ✓ accepts rawInput shorthand and persists parsed weight/reps/sets
  ✓ accepts ad-hoc exercise not in default plan (exerciseId = null)
  ✓ returns 404 when session does not exist
  ✓ returns 400 for malformed exercise payload

describe("Sessions API — PATCH /api/sessions/:id/complete")
  ✓ marks session as completed and sets completed_at timestamp
  ✓ returns 409 if session already completed
```

#### `comparison.integration.test.ts`
```
describe("Sessions API — GET /api/sessions/:id/comparison")
  ✓ returns null comparison when no previous session for that training day
  ✓ returns the most recent session of same training_day_id within past 14 days
  ✓ includes exercise breakdown in comparison response
  ✓ returns exercises in same order as default plan
```

#### `trainingDays.integration.test.ts`
```
describe("Training Days API — GET /api/training-days")
  ✓ returns all 4 training days with exercises
  ✓ exercises are ordered by order_idx ascending

describe("Training Days API — GET /api/current-day")
  ✓ returns Day 1 when database has no sessions
  ✓ returns Day 2 after Day 1 session is completed
  ✓ returns Day 1 after full cycle completes
```

#### `progress.integration.test.ts`
```
describe("Progress API — GET /api/progress/volume")
  ✓ returns empty weeks array when no sessions exist
  ✓ returns weekly volume grouped by muscle group
  ✓ shows increasing trend when volume grows week over week
```

---

## 5. End-to-End Tests (Playwright)

All E2E tests are written with `test.describe` blocks and descriptive test names.

### 5.1 Full Training Day Simulation

#### `training-day.e2e.ts`
```
describe("Full training day workflow — Chest & Shoulder Day")

  test("User sees today's training day on dashboard")
    → Navigate to /
    → Assert "Chest & Shoulder Day" is visible
    → Assert list of 5 default exercises is visible

  test("User starts a session")
    → Click "Start Training" button
    → Assert URL is /session/:id
    → Assert session header shows "Chest & Shoulder Day"
    → Assert all 5 exercises appear with "No previous data" badges

  test("User logs Dumbbell Incline Chest Press first (skipping order)")
    → Click on "Dumbbell Incline Chest Press" card
    → Type "15x12x3" in shorthand input
    → Assert preview shows "15 kg × 12 reps × 3 sets"
    → Click "Log Exercise"
    → Assert exercise card shows logged values
    → Assert total sets counter updates

  test("User logs Machine Chest Press")
    → Click on "Machine Chest Press" card
    → Type "20x12x3"
    → Click "Log Exercise"
    → Assert card shows 20 kg, 12 reps, 3 sets

  test("User adds an ad-hoc exercise")
    → Click "Add Exercise" button
    → Type "Cable Crossover" in exercise name input
    → Type "12x15x3" in shorthand input
    → Click "Add"
    → Assert "Cable Crossover" appears in the exercise list
    → Assert logged values are displayed

  test("User completes the session")
    → Click "Complete Session" button
    → Assert confirmation modal appears
    → Click "Confirm"
    → Assert URL redirects to /history or /dashboard
    → Assert session appears in history list with correct date

  test("Next day in cycle is Shoulder & Arm Day after completing Back Day")
    → Seed a completed Back Day session
    → Navigate to /
    → Assert "Shoulder & Arm Day" badge is displayed as current day
```

### 5.2 Week-over-Week Comparison

#### `comparison.e2e.ts`
```
describe("Last week comparison display")

  test("Exercise cards show 'No previous data' on first ever session")
    → Start a fresh session (clean DB)
    → Assert each exercise card has "No previous data" indicator

  test("Exercise cards show last week's reference after second session")
    → Seed a completed session 7 days ago with known exercise data
    → Start a new session for same training day
    → Assert "Dumbbell Incline Chest Press" card shows "Last: 15kg × 12 × 3"
    → Assert reference data is rendered in muted/secondary color

  test("Volume comparison shows improvement indicator")
    → Seed last week: Dumbbell Incline 15×12×3 = 540 vol
    → Log this week: Dumbbell Incline 17.5×12×3 = 630 vol
    → Complete session
    → Navigate to Progress page
    → Assert "Chest & Shoulder" row shows green up-arrow improvement
```

### 5.3 Cycle Navigation

#### `cycle-selector.e2e.ts`
```
describe("Training day cycle selector")

  test("User overrides training day to Leg Day")
    → Navigate to /
    → Click cycle selector
    → Select "Leg Day"
    → Assert dashboard now shows "Leg Day" exercises
    → Assert cycle badge shows "Leg Day"

  test("Cycle override persists after page refresh")
    → Select "Back Day" from cycle selector
    → Reload page
    → Assert "Back Day" is still selected

  test("Cycle resets to computed next day after completing a session")
    → Override to "Chest & Shoulder Day"
    → Complete a session
    → Assert dashboard shows "Back Day" (next in cycle)
```

### 5.4 Mobile Responsiveness

#### `mobile.e2e.ts`
```
describe("Mobile viewport — iPhone 14 Pro (390×844)")

  test("Dashboard loads correctly on mobile")
    → Set viewport to 390×844
    → Navigate to /
    → Assert no horizontal overflow
    → Assert exercise cards are full width
    → Assert shorthand input is easily tappable (min-height 44px)

  test("Active session is usable on mobile")
    → Start a session on mobile viewport
    → Tap an exercise card
    → Input shorthand value
    → Assert parsed preview is visible
    → Log the exercise successfully
```

---

## 6. Performance Tests

Not part of CI but documented for manual verification:

| Scenario | Target |
|---|---|
| Dashboard load (cold cache) | < 2s |
| API response: `GET /current-day` | < 100ms at Cloudflare edge |
| API response: `POST /sessions/:id/exercises` | < 150ms |
| Matrix rain animation frame rate | ≥ 55 fps on mid-range phone |

---

## 7. Test Coverage Targets

| Area | Line Coverage Target |
|---|---|
| Backend handlers | ≥ 90% |
| Frontend components | ≥ 80% |
| Utility functions (parser, cycle logic) | 100% |

---

## 8. Test Naming Convention

All tests follow **BDD-style** naming:
- `describe` block → component or API route name
- `test` / `it` → should/when/given clause in plain English

Example:
```ts
describe("Shorthand exercise input parser", () => {
  it("parses '15x12x3' into weight=15, reps=12, sets=3", () => { ... });
  it("returns a validation error when input is empty", () => { ... });
});
```

---

## 9. Running Tests

```bash
# All tests
npm test

# Backend unit + integration only
npm run test:backend

# Frontend unit only
npm run test:frontend

# E2E tests (requires running dev server)
npm run test:e2e

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage
```
