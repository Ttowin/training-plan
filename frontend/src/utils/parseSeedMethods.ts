import type { Exercise } from "../types/index.js";

export type WeightMode = "stack" | "per_dumbbell" | "total" | "bodyweight";

export interface ExerciseMethod {
  id: string;
  exerciseId: number;
  label: string;
  weightMode: WeightMode;
  isDefault: boolean;
  isSeeded: boolean;
  sortOrder: number;
  notes?: string;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function seededMethodId(exerciseId: number, label: string): string {
  return `seed-${exerciseId}-${slugify(label)}`;
}

export function inferWeightMode(label: string): WeightMode {
  const lower = label.toLowerCase();
  if (lower === "db" || lower.includes("dumbbell")) return "per_dumbbell";
  if (lower.includes("bodyweight") || lower === "bw") return "bodyweight";
  return "stack";
}

export function getWeightLabel(mode: WeightMode): string {
  switch (mode) {
    case "per_dumbbell":
      return "Weight per DB (kg)";
    case "total":
      return "Total weight (kg)";
    case "bodyweight":
      return "Reps";
    case "stack":
    default:
      return "Weight (kg)";
  }
}

export function getWeightHelperText(mode: WeightMode): string | null {
  if (mode === "per_dumbbell") return "Enter weight of one dumbbell";
  if (mode === "total") return "Enter combined weight (both sides)";
  return null;
}

function normalizeLabel(raw: string): string {
  const trimmed = raw.trim();
  if (/^db$/i.test(trimmed)) return "DB";
  if (/^dumbbell$/i.test(trimmed)) return "Dumbbell";
  if (/^machine$/i.test(trimmed)) return "Machine";
  if (/^cable$/i.test(trimmed)) return "Cable";
  if (/^smith(\s+machine)?$/i.test(trimmed)) return "Smith machine";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function splitEquipmentOptions(equipment: string): string[] {
  return equipment
    .split(/\s+or\s+/i)
    .map((part) => normalizeLabel(part))
    .filter(Boolean);
}

/** Build seeded methods from plan `equipment` text and exercise name. */
export function parseSeedMethods(exercise: Pick<Exercise, "id" | "name" | "equipment">): ExerciseMethod[] {
  const labels: string[] = [];

  if (exercise.equipment?.trim()) {
    labels.push(...splitEquipmentOptions(exercise.equipment));
  } else if (/dumbbell/i.test(exercise.name)) {
    labels.push("Dumbbell");
  }

  return labels.map((label, index) => ({
    id: seededMethodId(exercise.id, label),
    exerciseId: exercise.id,
    label,
    weightMode: inferWeightMode(label),
    isDefault: index === 0,
    isSeeded: true,
    sortOrder: index,
  }));
}

export function logKey(exerciseName: string, methodId: string | null | undefined): string {
  return `${exerciseName}::${methodId ?? ""}`;
}

export function defaultWeightForMode(mode: WeightMode): number | null {
  if (mode === "bodyweight") return null;
  if (mode === "per_dumbbell") return 20;
  return 40;
}
