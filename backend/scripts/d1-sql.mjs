/**
 * Read and write the local D1 SQLite file that `wrangler dev` uses.
 *
 * The running GymMatrix worker persists to backend/.wrangler/state.
 * This script opens that file directly, so a query sees the same rows
 * the app is serving and a write shows up in the app.
 *
 *   npm run db:sql --workspace=backend -- "SELECT id, name FROM training_days"
 *   npm run db:sql --workspace=backend -- --write --params '[1,"2026-11-08","2026-11-08T00:00:00.000Z"]' -- "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?) RETURNING *"
 */
import { DatabaseSync } from "node:sqlite";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(scriptDir, "..");
export const repoRoot = path.resolve(backendRoot, "..");
export const localD1Dir = path.join(backendRoot, ".wrangler", "state", "v3", "d1");

const FORBIDDEN = new Set([
  "DROP",
  "ALTER",
  "CREATE",
  "ATTACH",
  "DETACH",
  "VACUUM",
  "REINDEX",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
  "RELEASE",
  "ANALYZE",
]);

const WRITE_KEYWORDS = new Set(["INSERT", "UPDATE", "DELETE", "REPLACE"]);

export function maskSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
}

export function inspectSql(sql) {
  if (typeof sql !== "string" || sql.trim() === "") {
    throw new Error("SQL is empty");
  }
  const masked = maskSql(sql).trim().replace(/;\s*$/, "");
  if (masked.includes(";")) {
    throw new Error("Only one SQL statement is allowed");
  }
  const words = masked.match(/[A-Za-z_]+/g)?.map((word) => word.toUpperCase()) ?? [];
  if (words.length === 0) {
    throw new Error("SQL is empty");
  }
  for (const word of words) {
    if (FORBIDDEN.has(word)) {
      throw new Error(
        `Refusing to run ${word}. Use SELECT, INSERT, UPDATE, or DELETE for rows only.`,
      );
    }
  }
  const first = words[0];
  if (first === "SELECT" || first === "EXPLAIN" || first === "PRAGMA") {
    return { kind: "read", keyword: first };
  }
  if (WRITE_KEYWORDS.has(first)) {
    return { kind: "write", keyword: first };
  }
  if (first === "WITH") {
    const writes = words.some((word) => WRITE_KEYWORDS.has(word));
    return { kind: writes ? "write" : "read", keyword: first };
  }
  throw new Error(`Unsupported statement ${first}. Use SELECT, INSERT, UPDATE, or DELETE.`);
}

function activityMs(file) {
  let latest = statSync(file).mtimeMs;
  for (const suffix of ["-wal", "-shm"]) {
    try {
      latest = Math.max(latest, statSync(file + suffix).mtimeMs);
    } catch {
      // The companion file is absent when nothing has the database open.
    }
  }
  return latest;
}

export function locateLocalD1(root = localD1Dir) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".sqlite")) files.push(full);
    }
  };
  walk(root);
  files.sort((a, b) => activityMs(b) - activityMs(a) || a.localeCompare(b));
  return files;
}

function toJsonable(value) {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (Array.isArray(value)) return value.map(toJsonable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonable(item)]),
    );
  }
  return value;
}

export function executeSql(databasePath, sql, params = [], options = {}) {
  const inspected = inspectSql(sql);
  if (inspected.kind === "write" && options.write !== true) {
    throw new Error(
      "This statement changes rows. Re-run with --write when the user asked to add or change records.",
    );
  }
  if (!Array.isArray(params)) {
    throw new Error("params must be an array");
  }
  const db = new DatabaseSync(databasePath, {
    readOnly: inspected.kind !== "write",
    timeout: 5000,
    enableForeignKeyConstraints: true,
  });
  try {
    const rows = db.prepare(sql).all(...params);
    const meta = db
      .prepare("SELECT changes() AS changes, last_insert_rowid() AS last_insert_rowid")
      .get();
    const changes = Number(meta.changes ?? 0);
    const lastId = Number(meta.last_insert_rowid ?? 0);
    return {
      ok: true,
      mode: inspected.kind,
      rows: toJsonable(rows),
      changes: inspected.kind === "write" ? changes : 0,
      lastInsertRowid: inspected.kind === "write" && lastId > 0 ? lastId : null,
    };
  } finally {
    db.close();
  }
}

export function parseArgs(argv) {
  let write = false;
  let paramsJson = null;
  let sawSqlFlag = false;
  let sawPositional = false;
  const sqlParts = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--write") {
      write = true;
    } else if (arg === "--params") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--params needs a JSON array");
      paramsJson = next;
    } else if (arg === "--sql") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--sql needs a statement");
      sawSqlFlag = true;
      sqlParts.push(next);
    } else if (arg === "--") {
      const rest = argv.slice(i + 1);
      if (rest.length > 0) {
        sawPositional = true;
        sqlParts.push(rest.join(" "));
      }
      break;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag ${arg}`);
    } else {
      sawPositional = true;
      sqlParts.push(arg);
    }
  }
  if (sawSqlFlag && sawPositional) {
    throw new Error("Pass the statement either with --sql or as one argument, not both");
  }
  let params = [];
  if (paramsJson !== null) {
    try {
      params = JSON.parse(paramsJson);
    } catch {
      throw new Error('--params must be a JSON array, for example \'[1,"Leg Day"]\'');
    }
    if (!Array.isArray(params)) throw new Error("--params must be a JSON array");
  }
  return { write, params, sql: sqlParts.join(" ").trim() };
}

function relativeDatabase(databasePath) {
  return path.relative(repoRoot, databasePath).split(path.sep).join("/");
}

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    printResult({ ok: false, error: error.message });
    return 1;
  }
  if (parsed.sql === "") {
    printResult({
      ok: false,
      error:
        'SQL is empty. Example: npm run db:sql --workspace=backend -- "SELECT id, name FROM training_days ORDER BY order_idx"',
    });
    return 1;
  }
  const files = locateLocalD1();
  if (files.length === 0) {
    printResult({
      ok: false,
      error:
        "No local D1 database under backend/.wrangler/state/v3/d1. The running app stores its records there. Leave that directory in place. On a fresh environment, create it with: npm run db:migrate:local --workspace=backend && npm run db:seed:local --workspace=backend",
    });
    return 1;
  }
  const databasePath = files[0];
  try {
    const result = executeSql(databasePath, parsed.sql, parsed.params, { write: parsed.write });
    printResult({
      ...result,
      database: relativeDatabase(databasePath),
      alsoFound: files.slice(1).map(relativeDatabase),
    });
    return 0;
  } catch (error) {
    printResult({
      ok: false,
      error: error.message,
      database: relativeDatabase(databasePath),
    });
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
