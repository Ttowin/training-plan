import type { ParsedShorthand, ShorthandResult } from "../types.js";

/**
 * Parses shorthand exercise input into structured values.
 *
 * Format: <weight>x<reps>x<sets>
 *   weight: positive number, or "bw"/"BW" for bodyweight
 *   reps:   positive integer
 *   sets:   positive integer (optional, defaults to 1)
 *
 * Examples:
 *   "15x12x3"   → { weight: 15, reps: 12, sets: 3 }
 *   "15x12"     → { weight: 15, reps: 12, sets: 1 }
 *   "15.5x12x4" → { weight: 15.5, reps: 12, sets: 4 }
 *   "bwx12x3"   → { weight: null, reps: 12, sets: 3 }
 */
export function parseShorthand(input: string): ShorthandResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "Input cannot be empty" };
  }

  const parts = trimmed.toLowerCase().split("x");
  if (parts.length < 2 || parts.length > 3) {
    return { error: "Format must be weight×reps×sets (e.g. 15x12x3) or weight×reps (e.g. 15x12)" };
  }

  const [weightPart, repsPart, setsPart] = parts;

  let weight: number | null;
  if (weightPart === "bw") {
    weight = null;
  } else {
    const w = parseFloat(weightPart);
    if (isNaN(w) || w <= 0) {
      return { error: "Weight must be a positive number or 'bw' for bodyweight" };
    }
    weight = w;
  }

  const reps = parseInt(repsPart, 10);
  if (isNaN(reps) || reps <= 0) {
    return { error: "Reps must be a positive integer" };
  }

  const sets = setsPart !== undefined ? parseInt(setsPart, 10) : 1;
  if (isNaN(sets) || sets <= 0) {
    return { error: "Sets must be a positive integer" };
  }

  return { weight, reps, sets } satisfies ParsedShorthand;
}

export function isParseError(result: ShorthandResult): result is { error: string } {
  return "error" in result;
}
