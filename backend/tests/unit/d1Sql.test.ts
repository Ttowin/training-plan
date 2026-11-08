import { describe, expect, it } from "vitest";
import {
  executeSql,
  inspectSql,
  numberPlaceholders,
  parseArgs,
  readWranglerD1,
} from "../../scripts/d1-sql.mjs";

const databaseId = "1f2eaa61-d59c-4060-9b09-c8f7ffb2a6eb";

function d1Response(results: unknown[], meta: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify({
        success: true,
        errors: [],
        result: [{ success: true, results, meta }],
      });
    },
  };
}

describe("inspectSql", () => {
  it("treats a select as a read and rejects schema changes", () => {
    expect(inspectSql("SELECT 'please drop the set' AS note").kind).toBe("read");
    expect(() => inspectSql("SELECT 1; DELETE FROM training_sessions")).toThrow(/one SQL statement/);
    expect(() => inspectSql("DROP TABLE training_sessions")).toThrow(/DROP/);
  });
});

describe("numberPlaceholders", () => {
  it("numbers bare placeholders and leaves quoted question marks alone", () => {
    expect(numberPlaceholders("SELECT ? , '?' , ? -- ?\n")).toBe("SELECT ?1 , '?' , ?2 -- ?\n");
  });
});

describe("readWranglerD1", () => {
  it("reads the hosted database name and id", () => {
    expect(
      readWranglerD1(`
        [[ d1_databases ]]
        database_name = "gymmatrix-db"
        database_id = "${databaseId}"
      `),
    ).toEqual({ databaseName: "gymmatrix-db", databaseId });
  });
});

describe("executeSql", () => {
  it("posts a read to the Cloudflare D1 query API", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const result = await executeSql("SELECT name FROM training_days WHERE order_idx = ?", [4], {
      accountId: "account-1",
      apiToken: "token-secret",
      databaseId,
      databaseName: "gymmatrix-db",
      fetch: async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return d1Response([{ name: "Leg Day" }]);
      },
    });
    expect(result).toMatchObject({
      ok: true,
      mode: "read",
      rows: [{ name: "Leg Day" }],
      changes: 0,
      lastInsertRowid: null,
      database: "gymmatrix-db",
      databaseId,
      host: "cloudflare-d1",
    });
    expect(calls[0].url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/account-1/d1/database/${databaseId}/query`,
    );
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer token-secret");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      sql: "SELECT name FROM training_days WHERE order_idx = ?1",
      params: [4],
    });
  });

  it("refuses a write before calling Cloudflare", async () => {
    let called = false;
    await expect(
      executeSql(
        "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?)",
        [1, "2026-11-08", "2026-11-08T00:00:00.000Z"],
        {
          accountId: "account-1",
          apiToken: "token-secret",
          databaseId,
          databaseName: "gymmatrix-db",
          fetch: async () => {
            called = true;
            return d1Response([]);
          },
        },
      ),
    ).rejects.toThrow(/--write/);
    expect(called).toBe(false);
  });

  it("returns the inserted id from D1 metadata", async () => {
    const result = await executeSql(
      "INSERT INTO training_sessions (training_day_id, session_date, started_at) VALUES (?, ?, ?) RETURNING id",
      [1, "2026-11-08", "2026-11-08T00:00:00.000Z"],
      {
        write: true,
        accountId: "account-1",
        apiToken: "token-secret",
        databaseId,
        databaseName: "gymmatrix-db",
        fetch: async () => d1Response([{ id: 39 }], { changes: 1, last_row_id: 39 }),
      },
    );
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBe(39);
    expect(result.rows).toEqual([{ id: 39 }]);
  });

  it("surfaces the API error and keeps the token out of the message", async () => {
    await expect(
      executeSql("SELECT 1", [], {
        accountId: "account-1",
        apiToken: "token-secret",
        databaseId,
        databaseName: "gymmatrix-db",
        fetch: async () => ({
          ok: false,
          status: 403,
          async text() {
            return JSON.stringify({
              success: false,
              errors: [{ message: "token-secret is not allowed" }],
            });
          },
        }),
      }),
    ).rejects.toThrow("[redacted] is not allowed");
  });

  it("requires the Cloudflare credentials", async () => {
    await expect(
      executeSql("SELECT 1", [], {
        accountId: "",
        apiToken: "",
        databaseId,
        databaseName: "gymmatrix-db",
        fetch: async () => d1Response([]),
      }),
    ).rejects.toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});

describe("parseArgs", () => {
  it("reads a write flag, JSON params, and one statement", () => {
    expect(parseArgs(["--write", "--params", "[1, null]", "--", "INSERT INTO t VALUES (?, ?)"])).toEqual({
      write: true,
      params: [1, null],
      sql: "INSERT INTO t VALUES (?, ?)",
    });
  });

  it("rejects params that are not a JSON array", () => {
    expect(() => parseArgs(["--params", '{"a":1}', "SELECT 1"])).toThrow(/JSON array/);
  });
});
