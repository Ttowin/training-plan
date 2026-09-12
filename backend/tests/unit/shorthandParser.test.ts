import { describe, it, expect } from "vitest";
import { parseShorthand, isParseError } from "../../src/handlers/shorthandParser.js";

describe("Shorthand exercise input parser", () => {
  it("parses '15x12x3' into weight=15, reps=12, sets=3", () => {
    const result = parseShorthand("15x12x3");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBe(15);
      expect(result.reps).toBe(12);
      expect(result.sets).toBe(3);
    }
  });

  it("parses '15x12' into weight=15, reps=12, sets=1 (default sets=1)", () => {
    const result = parseShorthand("15x12");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBe(15);
      expect(result.reps).toBe(12);
      expect(result.sets).toBe(1);
    }
  });

  it("parses '15.5x12x4' into weight=15.5 (float weights)", () => {
    const result = parseShorthand("15.5x12x4");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBe(15.5);
      expect(result.reps).toBe(12);
      expect(result.sets).toBe(4);
    }
  });

  it("parses 'bwx12x3' into weight=null (bodyweight)", () => {
    const result = parseShorthand("bwx12x3");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBeNull();
      expect(result.reps).toBe(12);
      expect(result.sets).toBe(3);
    }
  });

  it("parses 'BWx10x3' case-insensitively for bodyweight", () => {
    const result = parseShorthand("BWx10x3");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBeNull();
    }
  });

  it("returns validation error for empty string", () => {
    const result = parseShorthand("");
    expect(isParseError(result)).toBe(true);
    if (isParseError(result)) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns validation error for non-numeric weight", () => {
    const result = parseShorthand("heavyx12x3");
    expect(isParseError(result)).toBe(true);
  });

  it("returns validation error for zero reps", () => {
    const result = parseShorthand("15x0x3");
    expect(isParseError(result)).toBe(true);
  });

  it("returns validation error for negative sets", () => {
    const result = parseShorthand("15x12x-1");
    expect(isParseError(result)).toBe(true);
  });

  it("returns validation error for too many parts", () => {
    const result = parseShorthand("15x12x3x4");
    expect(isParseError(result)).toBe(true);
  });

  it("handles whitespace around input", () => {
    const result = parseShorthand("  20x10x4  ");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.weight).toBe(20);
    }
  });
});
