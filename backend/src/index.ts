import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { trainingDays } from "./routes/trainingDays.js";
import { sessions } from "./routes/sessions.js";
import { progress } from "./routes/progress.js";
import type { Env } from "./types.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", corsMiddleware);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes — event-driven fetch handler dispatches to domain routes
app.route("/api/training-days", trainingDays);
app.route("/api/sessions", sessions);
app.route("/api/progress", progress);

// Serve frontend static assets (Cloudflare Pages Assets binding)
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  // For SPA routing: serve index.html for non-asset paths
  if (!url.pathname.startsWith("/api")) {
    try {
      return c.env.ASSETS.fetch(c.req.raw);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
  return c.json({ error: "Not found" }, 404);
});

export default app;
