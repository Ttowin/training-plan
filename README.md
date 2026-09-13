# GymMatrix

> Progressive-overload fitness tracker with a Matrix / cyberpunk aesthetic. Deployed on Cloudflare Workers + D1 + Pages.

## Features

- **Cyclic training days**: Chest & Shoulder → Back → Shoulder & Arm → Leg (auto-detected, user-overridable)
- **Shorthand input**: Type `15x12x3` → 15 kg × 12 reps × 3 sets
- **Week-over-week comparison**: Last session's data shown inline as reference
- **Ad-hoc exercises**: Add any exercise not in the default plan during a session
- **Volume analytics**: Weekly bar charts with per-day breakdown
- **Matrix UI**: Canvas-based matrix code rain, terminal readouts, neon-glow styling

## Architecture

```
Cloudflare Pages (React SPA)
        ↓
Cloudflare Worker (Hono, event-driven)
        ↓
Cloudflare D1 (SQLite)
```

See [`docs/system-design.md`](docs/system-design.md) for full system design.  
See [`docs/testing-plan.md`](docs/testing-plan.md) for the complete testing strategy.

## Local Development

### Prerequisites

- Node.js 22+
- `wrangler` CLI (installed as dev dependency)

### Setup

```bash
# Install all dependencies
npm install

# Create local D1 database and seed with default training plan
npm run db:migrate:local --workspace=backend
npm run db:seed:local --workspace=backend

# Start backend (Cloudflare Worker dev server on :8787)
npm run dev --workspace=backend

# In a second terminal, start frontend (Vite dev server on :5173, proxies /api to :8787)
npm run dev --workspace=frontend
```

Open http://localhost:5173

### Run All Tests

```bash
# Unit + integration tests
npm test

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend

# E2E tests (requires running dev server)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Cloudflare Deployment

### One-time Setup

```bash
# 1. Create D1 database
npx wrangler d1 create gymmatrix-db

# 2. Copy the database_id from output into backend/wrangler.toml

# 3. Run schema migration
npm run db:migrate:remote --workspace=backend

# 4. Seed default training plan
npm run db:seed:remote --workspace=backend

# 5. Build frontend
npm run build --workspace=frontend

# 6. Deploy Worker (serves API + static assets)
npx wrangler deploy --config backend/wrangler.toml
```

### CI/CD (GitHub Actions)

Set these secrets in your GitHub repository:
- `CLOUDFLARE_API_TOKEN` — API token with Worker and D1 permissions
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

The workflow (`.github/workflows/test.yml`) automatically:
1. Runs all unit + integration tests
2. Runs Playwright E2E tests
3. Deploys to Cloudflare on push to `main`

## Project Structure

```
├── docs/
│   ├── system-design.md     # Architecture and API design
│   └── testing-plan.md      # Test strategy and test catalogue
├── backend/
│   ├── src/
│   │   ├── index.ts          # Hono app entry point
│   │   ├── routes/           # API route handlers
│   │   ├── handlers/         # Domain logic (parser, cycle, volume)
│   │   ├── db/               # SQL schema, seed, query helpers
│   │   └── types.ts
│   ├── tests/unit/           # Vitest unit tests
│   └── wrangler.toml
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (MatrixRain, ExerciseCard, etc.)
│   │   ├── pages/            # Page components (Dashboard, ActiveSession, etc.)
│   │   ├── utils/            # API client, shorthand parser
│   │   └── types/
│   ├── tests/
│   │   ├── unit/             # Vitest + React Testing Library
│   │   └── e2e/              # Playwright E2E tests
│   └── playwright.config.ts
└── .github/workflows/test.yml
```

## Shorthand Input Format

| Input | Meaning |
|---|---|
| `15x12x3` | 15 kg × 12 reps × 3 sets |
| `15x12` | 15 kg × 12 reps × 1 set |
| `17.5x12x4` | 17.5 kg × 12 reps × 4 sets |
| `bwx15x3` | Bodyweight × 15 reps × 3 sets |

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/training-days` | All training days with exercises |
| `GET` | `/api/training-days/current` | Current cycle day |
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/:id` | Session detail |
| `PATCH` | `/api/sessions/:id/complete` | Complete session |
| `POST` | `/api/sessions/:id/exercises` | Log exercise |
| `DELETE` | `/api/sessions/:id/exercises/:exId` | Delete exercise entry |
| `GET` | `/api/sessions/:id/comparison` | Last week comparison |
| `GET` | `/api/progress/volume` | Weekly volume stats |
