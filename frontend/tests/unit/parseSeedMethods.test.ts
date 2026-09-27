import { describe, it, expect } from "vitest";
import {
  parseSeedMethods,
  inferWeightMode,
  logKey,
  seededMethodId,
} from "../../src/utils/parseSeedMethods.js";

describe("parseSeedMethods", () => {
  it("splits multi-option equipment strings", () => {
    const methods = parseSeedMethods({
      id: 4,
      name: "Shoulder Press",
      equipment: "Smith machine or DB",
    });
    expect(methods.map((m) => m.label)).toEqual(["Smith machine", "DB"]);
    expect(methods[1].weightMode).toBe("per_dumbbell");
  });

  it("creates a single method for fixed equipment", () => {
    const methods = parseSeedMethods({
      id: 6,
      name: "High Row",
      equipment: "Machine",
    });
    expect(methods).toHaveLength(1);
    expect(methods[0].label).toBe("Machine");
    expect(methods[0].id).toBe(seededMethodId(6, "Machine"));
  });

  it("infers dumbbell from exercise name when equipment is empty", () => {
    const methods = parseSeedMethods({
      id: 2,
      name: "Dumbbell Incline Chest Press",
      equipment: null,
    });
    expect(methods).toHaveLength(1);
    expect(methods[0].label).toBe("Dumbbell");
    expect(methods[0].weightMode).toBe("per_dumbbell");
  });

  it("builds stable log keys per method", () => {
    expect(logKey("Shoulder Press", "seed-4-db")).toBe("Shoulder Press::seed-4-db");
    expect(logKey("Shoulder Press", null)).toBe("Shoulder Press::");
  });
});

describe("inferWeightMode", () => {
  it("detects dumbbell modes", () => {
    expect(inferWeightMode("DB")).toBe("per_dumbbell");
    expect(inferWeightMode("Dumbbell")).toBe("per_dumbbell");
  });

  it("defaults to stack for machines", () => {
    expect(inferWeightMode("Machine")).toBe("stack");
    expect(inferWeightMode("Cable")).toBe("stack");
  });
});
