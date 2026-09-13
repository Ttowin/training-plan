import type { ParsedShorthand } from "../types/index.js";

export interface ParseResult {
  parsed: ParsedShorthand | null;
  error: string | null;
}

export function parseShorthand(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { parsed: null, error: "Input cannot be empty" };

  const parts = trimmed.toLowerCase().split("x");
  if (parts.length < 2 || parts.length > 3) {
    return { parsed: null, error: "Format: weight×reps×sets (e.g. 15x12x3)" };
  }

  const [weightPart, repsPart, setsPart] = parts;

  let weight: number | null;
  if (weightPart === "bw") {
    weight = null;
  } else {
    const w = parseFloat(weightPart);
    if (isNaN(w) || w <= 0) {
      return { parsed: null, error: "Weight must be a positive number or 'bw'" };
    }
    weight = w;
  }

  const reps = parseInt(repsPart, 10);
  if (isNaN(reps) || reps <= 0) {
    return { parsed: null, error: "Reps must be a positive integer" };
  }

  const sets = setsPart !== undefined ? parseInt(setsPart, 10) : 1;
  if (isNaN(sets) || sets <= 0) {
    return { parsed: null, error: "Sets must be a positive integer" };
  }

  return { parsed: { weight, reps, sets }, error: null };
}

export function formatShorthand(weight: number | null, reps: number, sets: number): string {
  const w = weight === null ? "BW" : `${weight}kg`;
  return `${w} × ${reps} reps × ${sets} sets`;
}

export function computeVolume(weight: number | null, reps: number, sets: number): number {
  return (weight ?? 0) * reps * sets;
}
