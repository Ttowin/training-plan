/**
 * Query the hosted Cloudflare D1 database the GymMatrix Worker uses.
 *
 * The Worker at https://gymmatrix.cchunyungg123.workers.dev binds D1 database
 * gymmatrix-db. This script calls the Cloudflare D1 HTTP API for that database.
 * Credentials come from the environment (CLOUDFLARE_API_TOKEN and
 * CLOUDFLARE_ACCOUNT_ID) and are never printed.
 *
 *   npm run db:sql --workspace=backend -- "SELECT id, name FROM training_days"
 *   npm run db:sql --workspace=backend -- --write --params '[1,"2026-11-08","2026-11-08T00:00:00.000Z"]' -- "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?) RETURNING *"
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(scriptDir, "..");
export const wranglerConfigPath = path.join(backendRoot, "wrangler.toml");

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

export function numberPlaceholders(sql) {
  let out = "";
  let index = 0;
  let count = 0;
  while (index < sql.length) {
    const char = sql[index];
    if (char === "'" || char === '"') {
      const quote = char;
      let end = index + 1;
      while (end < sql.length) {
        if (sql[end] === quote && sql[end + 1] === quote) {
          end += 2;
          continue;
        }
        if (sql[end] === quote) {
          end += 1;
          break;
        }
        end += 1;
      }
      out += sql.slice(index, end);
      index = end;
      continue;
    }
    if (char === "-" && sql[index + 1] === "-") {
      const end = sql.indexOf("\n", index);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "?" && !/\d/.test(sql[index + 1] ?? "")) {
      count += 1;
      out += `?${count}`;
      index += 1;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

export function readWranglerD1(tomlText) {
  const name = tomlText.match(/^\s*database_name\s*=\s*"([^"]+)"/m);
  const id = tomlText.match(/^\s*database_id\s*=\s*"([^"]+)"/m);
  if (!name || !id) {
    throw new Error("backend/wrangler.toml is missing database_name or database_id");
  }
  return { databaseName: name[1], databaseId: id[1] };
}

function credentialError() {
  return new Error(
    "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required. This command queries the hosted Cloudflare D1 database gymmatrix-db. Set both in the cloud agent environment, using the same secret names as the Deploy to Cloudflare workflow. Do not print the token.",
  );
}

function sanitize(message, token) {
  if (!token) return message;
  return message.split(token).join("[redacted]");
}

export async function executeSql(sql, params = [], options = {}) {
  const inspected = inspectSql(sql);
  if (inspected.kind === "write" && options.write !== true) {
    throw new Error(
      "This statement changes rows. Re-run with --write when the user asked to add or change records.",
    );
  }
  if (!Array.isArray(params)) {
    throw new Error("params must be an array");
  }
  const accountId = (options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const apiToken = (options.apiToken ?? process.env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const databaseId = options.databaseId;
  const databaseName = options.databaseName;
  if (accountId === "" || apiToken === "" || !databaseId || !databaseName) {
    throw credentialError();
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const remoteSql = numberPlaceholders(sql);
  let response;
  try {
    response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql: remoteSql, params }),
      },
    );
  } catch (error) {
    throw new Error(`Cloudflare D1 request failed: ${sanitize(error.message, apiToken)}`);
  }
  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`Cloudflare D1 returned HTTP ${response.status} with a non-JSON body`);
  }
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors)
      ? body.errors.map((item) => item.message).filter(Boolean).join("; ")
      : "";
    throw new Error(
      sanitize(
        `Cloudflare D1 query failed${detail ? `: ${detail}` : ` (HTTP ${response.status})`}`,
        apiToken,
      ),
    );
  }
  const first = Array.isArray(body.result) ? body.result[0] : body.result;
  const rows = first?.results ?? [];
  const meta = first?.meta ?? {};
  const changes = Number(meta.changes ?? 0);
  const lastId = Number(meta.last_row_id ?? 0);
  return {
    ok: true,
    mode: inspected.kind,
    rows,
    changes: inspected.kind === "write" ? changes : 0,
    lastInsertRowid: inspected.kind === "write" && lastId > 0 ? lastId : null,
    database: databaseName,
    databaseId,
    host: "cloudflare-d1",
  };
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

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
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
  let binding;
  try {
    binding = readWranglerD1(readFileSync(wranglerConfigPath, "utf8"));
  } catch (error) {
    printResult({ ok: false, error: error.message });
    return 1;
  }
  try {
    const result = await executeSql(parsed.sql, parsed.params, {
      write: parsed.write,
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      databaseId: binding.databaseId,
      databaseName: binding.databaseName,
    });
    printResult(result);
    return 0;
  } catch (error) {
    printResult({
      ok: false,
      error: sanitize(error.message, (env.CLOUDFLARE_API_TOKEN ?? "").trim()),
      database: binding.databaseName,
      databaseId: binding.databaseId,
      host: "cloudflare-d1",
    });
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
