import { describe, it, expect } from "vitest";
import { getNextDayOrderIdx } from "../../src/handlers/cycleLogic.js";

describe("Training day cycle logic", () => {
  it("returns Day 1 (Chest & Shoulder) when no sessions exist", () => {
    expect(getNextDayOrderIdx(null)).toBe(1);
  });

  it("returns Day 2 (Back) after completing Day 1", () => {
    expect(getNextDayOrderIdx(1)).toBe(2);
  });

  it("returns Day 3 (Shoulder & Arm) after completing Day 2", () => {
    expect(getNextDayOrderIdx(2)).toBe(3);
  });

  it("returns Day 4 (Leg) after completing Day 3", () => {
    expect(getNextDayOrderIdx(3)).toBe(4);
  });

  it("wraps back to Day 1 after completing Day 4", () => {
    expect(getNextDayOrderIdx(4)).toBe(1);
  });
});
