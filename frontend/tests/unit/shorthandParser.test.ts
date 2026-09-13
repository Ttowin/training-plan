import { describe, it, expect } from "vitest";
import { parseShorthand, formatShorthand, computeVolume } from "../../src/utils/shorthandParser.js";

describe("Shorthand exercise input parser (frontend)", () => {
  it("parses '15x12x3' into weight=15, reps=12, sets=3", () => {
    const { parsed, error } = parseShorthand("15x12x3");
    expect(error).toBeNull();
    expect(parsed).toEqual({ weight: 15, reps: 12, sets: 3 });
  });

  it("parses '15x12' into weight=15, reps=12, sets=1 (default)", () => {
    const { parsed } = parseShorthand("15x12");
    expect(parsed?.sets).toBe(1);
  });

  it("parses '15.5x12x4' with float weight", () => {
    const { parsed } = parseShorthand("15.5x12x4");
    expect(parsed?.weight).toBe(15.5);
  });

  it("parses 'bwx12x3' as bodyweight (null weight)", () => {
    const { parsed } = parseShorthand("bwx12x3");
    expect(parsed?.weight).toBeNull();
    expect(parsed?.reps).toBe(12);
    expect(parsed?.sets).toBe(3);
  });

  it("returns error for empty string", () => {
    const { parsed, error } = parseShorthand("");
    expect(parsed).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error for too many parts", () => {
    const { error } = parseShorthand("15x12x3x4");
    expect(error).toBeTruthy();
  });

  it("returns error for non-numeric weight", () => {
    const { error } = parseShorthand("heavyx12x3");
    expect(error).toBeTruthy();
  });

  it("returns error for zero reps", () => {
    const { error } = parseShorthand("15x0x3");
    expect(error).toBeTruthy();
  });

  it("returns error for negative sets", () => {
    const { error } = parseShorthand("15x12x-1");
    expect(error).toBeTruthy();
  });
});

describe("formatShorthand", () => {
  it("formats weight, reps, sets into human-readable string", () => {
    const result = formatShorthand(15, 12, 3);
    expect(result).toContain("15kg");
    expect(result).toContain("12");
    expect(result).toContain("3");
  });

  it("formats bodyweight as 'BW'", () => {
    const result = formatShorthand(null, 12, 3);
    expect(result).toContain("BW");
  });
});

describe("computeVolume", () => {
  it("computes weight × reps × sets", () => {
    expect(computeVolume(15, 12, 3)).toBe(540);
  });

  it("returns 0 for bodyweight exercises", () => {
    expect(computeVolume(null, 12, 3)).toBe(0);
  });
});
