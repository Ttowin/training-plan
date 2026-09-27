import { describe, it, expect, beforeEach } from "vitest";
import {
  addCustomMethod,
  deleteCustomMethod,
  getDefaultMethodId,
  getMethods,
  hideSeededMethod,
  setDefaultMethod,
  updateMethod,
} from "../../src/data/exerciseMethods.js";
import type { Exercise } from "../../src/types/index.js";

const shoulderPress: Exercise = {
  id: 4,
  training_day_id: 1,
  name: "Shoulder Press",
  order_idx: 4,
  default_sets: 3,
  reps_min: 10,
  reps_max: 12,
  equipment: "Smith machine or DB",
  is_custom: 0,
};

describe("exerciseMethods store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merges seeded methods with custom methods", () => {
    expect(getMethods(shoulderPress).map((m) => m.label)).toEqual(["Smith machine", "DB"]);
    addCustomMethod(shoulderPress.id, { label: "Cable crossover", weightMode: "stack" });
    expect(getMethods(shoulderPress).map((m) => m.label)).toEqual([
      "Smith machine",
      "DB",
      "Cable crossover",
    ]);
  });

  it("remembers default and last-used method ids", () => {
    const methods = getMethods(shoulderPress);
    setDefaultMethod(shoulderPress.id, methods[1].id);
    expect(getDefaultMethodId(shoulderPress)).toBe(methods[1].id);
  });

  it("updates custom methods and hides seeded ones", () => {
    const custom = addCustomMethod(shoulderPress.id, { label: "Hotel DBs", weightMode: "per_dumbbell" });
    const updated = updateMethod(shoulderPress, custom.id, { label: "Travel DBs" });
    expect(updated?.label).toBe("Travel DBs");

    hideSeededMethod(shoulderPress.id, getMethods(shoulderPress)[0].id);
    expect(getMethods(shoulderPress).some((m) => m.label === "Smith machine")).toBe(false);

    deleteCustomMethod(shoulderPress.id, custom.id);
    expect(getMethods(shoulderPress).some((m) => m.id === custom.id)).toBe(false);
  });
});
