import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(source: string): unknown {
  const result = spawnSync(
    process.execPath,
    ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", source],
    { encoding: "utf8", cwd: backendRoot },
  );
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

const importHelper = `import { executeSql, inspectSql, locateLocalD1, parseArgs } from ${JSON.stringify(
  path.join(backendRoot, "scripts/d1-sql.mjs"),
)};`;

describe("d1-sql", () => {
  it("treats a select as a read and rejects schema changes", () => {
    const result = run(`
      ${importHelper}
      const read = inspectSql("SELECT 'please drop the set' AS note");
      let oneStatement = "";
      let drop = "";
      try { inspectSql("SELECT 1; DELETE FROM training_sessions"); } catch (error) { oneStatement = error.message; }
      try { inspectSql("DROP TABLE training_sessions"); } catch (error) { drop = error.message; }
      console.log(JSON.stringify({ kind: read.kind, oneStatement, drop }));
    `) as { kind: string; oneStatement: string; drop: string };
    expect(result.kind).toBe("read");
    expect(result.oneStatement).toMatch(/one SQL statement/);
    expect(result.drop).toMatch(/DROP/);
  });

  it("reads, inserts, updates, and deletes against a temporary schema", () => {
    const result = run(`
      ${importHelper}
      import { mkdtempSync, readFileSync, rmSync } from "node:fs";
      import { tmpdir } from "node:os";
      import path from "node:path";
      import { DatabaseSync } from "node:sqlite";

      const dir = mkdtempSync(path.join(tmpdir(), "gymmatrix-d1-"));
      const file = path.join(dir, "app.sqlite");
      const db = new DatabaseSync(file, { enableForeignKeyConstraints: true });
      db.exec(readFileSync("src/db/schema.sql", "utf8"));
      db.exec("INSERT INTO training_days (name, order_idx, muscle_targets) VALUES ('Leg Day', 4, '[]')");
      db.close();

      const read = executeSql(file, "SELECT name FROM training_days WHERE order_idx = ?", [4]);
      let refused = "";
      try {
        executeSql(file, "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?)", [1, "2026-11-08", "2026-11-08T00:00:00.000Z"]);
      } catch (error) { refused = error.message; }
      const untouched = executeSql(file, "SELECT COUNT(*) AS n FROM training_sessions");
      const inserted = executeSql(
        file,
        "INSERT INTO training_sessions (training_day_id, session_date, started_at, notes) VALUES (?, ?, ?, ?) RETURNING id, session_date, notes",
        [1, "2026-11-08", "2026-11-08T12:00:00.000Z", "skill check"],
        { write: true },
      );
      let fk = "";
      try {
        executeSql(file, "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?)", [99, "2026-11-08", "2026-11-08T12:00:00.000Z"], { write: true });
      } catch (error) { fk = error.message; }
      const updated = executeSql(file, "UPDATE training_sessions SET notes = ? WHERE id = ?", ["edited", inserted.lastInsertRowid], { write: true });
      const removed = executeSql(file, "DELETE FROM training_sessions WHERE id = ?", [inserted.lastInsertRowid], { write: true });
      rmSync(dir, { recursive: true, force: true });
      console.log(JSON.stringify({ read, refused, untouched, inserted, fk, updated, removed }));
    `) as {
      read: { rows: { name: string }[]; changes: number };
      refused: string;
      untouched: { rows: { n: number }[] };
      inserted: { changes: number; lastInsertRowid: number; rows: { id: number; session_date: string; notes: string }[] };
      fk: string;
      updated: { changes: number };
      removed: { changes: number };
    };

    expect(result.read.rows).toEqual([{ name: "Leg Day" }]);
    expect(result.read.changes).toBe(0);
    expect(result.refused).toMatch(/--write/);
    expect(result.untouched.rows).toEqual([{ n: 0 }]);
    expect(result.inserted.changes).toBe(1);
    expect(result.inserted.lastInsertRowid).toBe(1);
    expect(result.inserted.rows).toEqual([{ id: 1, session_date: "2026-11-08", notes: "skill check" }]);
    expect(result.fk).toMatch(/FOREIGN KEY/);
    expect(result.updated.changes).toBe(1);
    expect(result.removed.changes).toBe(1);
  });

  it("picks the sqlite file whose wal was touched most recently", () => {
    const chosen = run(`
      ${importHelper}
      import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
      import { tmpdir } from "node:os";
      import path from "node:path";
      const root = mkdtempSync(path.join(tmpdir(), "gymmatrix-d1-"));
      const older = path.join(root, "old", "a.sqlite");
      const newer = path.join(root, "live", "b.sqlite");
      mkdirSync(path.dirname(older), { recursive: true });
      mkdirSync(path.dirname(newer), { recursive: true });
      writeFileSync(older, "");
      writeFileSync(newer, "");
      writeFileSync(older + "-wal", "");
      const oldTime = new Date("2026-01-01T00:00:00.000Z");
      const liveTime = new Date("2026-11-08T00:00:00.000Z");
      utimesSync(older, oldTime, oldTime);
      utimesSync(newer, oldTime, oldTime);
      utimesSync(older + "-wal", liveTime, liveTime);
      const picked = locateLocalD1(root)[0];
      rmSync(root, { recursive: true, force: true });
      console.log(JSON.stringify(picked));
    `);
    expect(String(chosen).endsWith(`${path.sep}old${path.sep}a.sqlite`)).toBe(true);
  });

  it("parses the write flag and JSON params", () => {
    const result = run(`
      ${importHelper}
      const parsed = parseArgs(["--write", "--params", "[1, null]", "--", "INSERT INTO t VALUES (?, ?)"]);
      let bad = "";
      try { parseArgs(["--params", "{\\"a\\":1}", "SELECT 1"]); } catch (error) { bad = error.message; }
      console.log(JSON.stringify({ parsed, bad }));
    `) as { parsed: { write: boolean; params: unknown[]; sql: string }; bad: string };
    expect(result.parsed).toEqual({
      write: true,
      params: [1, null],
      sql: "INSERT INTO t VALUES (?, ?)",
    });
    expect(result.bad).toMatch(/JSON array/);
  });
});
