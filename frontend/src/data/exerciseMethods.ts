import type { Exercise } from "../types/index.js";
import {
  type ExerciseMethod,
  type WeightMode,
  parseSeedMethods,
} from "../utils/parseSeedMethods.js";

const STORAGE_KEY = "gymmatrix:exercise-methods";

interface SeededOverride {
  label?: string;
  weightMode?: WeightMode;
  notes?: string;
  hidden?: boolean;
}

interface MethodStore {
  custom: Record<string, ExerciseMethod[]>;
  seededOverrides: Record<string, Record<string, SeededOverride>>;
  defaultMethodId: Record<string, string>;
  lastUsedMethodId: Record<string, string>;
}

function readStore(): MethodStore {
  if (typeof localStorage === "undefined") {
    return { custom: {}, seededOverrides: {}, defaultMethodId: {}, lastUsedMethodId: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { custom: {}, seededOverrides: {}, defaultMethodId: {}, lastUsedMethodId: {} };
    const parsed = JSON.parse(raw) as Partial<MethodStore>;
    return {
      custom: parsed.custom ?? {},
      seededOverrides: parsed.seededOverrides ?? {},
      defaultMethodId: parsed.defaultMethodId ?? {},
      lastUsedMethodId: parsed.lastUsedMethodId ?? {},
    };
  } catch {
    return { custom: {}, seededOverrides: {}, defaultMethodId: {}, lastUsedMethodId: {} };
  }
}

function writeStore(store: MethodStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

function exerciseKey(exerciseId: number): string {
  return String(exerciseId);
}

function applySeededOverride(method: ExerciseMethod, override?: SeededOverride): ExerciseMethod | null {
  if (override?.hidden) return null;
  if (!override) return method;
  return {
    ...method,
    label: override.label ?? method.label,
    weightMode: override.weightMode ?? method.weightMode,
    notes: override.notes ?? method.notes,
  };
}

export function getMethods(exercise: Exercise): ExerciseMethod[] {
  const store = readStore();
  const key = exerciseKey(exercise.id);
  const overrides = store.seededOverrides[key] ?? {};

  const seeded = parseSeedMethods(exercise)
    .map((method) => applySeededOverride(method, overrides[method.id]))
    .filter((method): method is ExerciseMethod => method !== null);

  const custom = (store.custom[key] ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const merged = [...seeded, ...custom];
  const defaultId = store.defaultMethodId[key];
  return merged.map((method, index) => ({
    ...method,
    isDefault: defaultId ? method.id === defaultId : index === 0 && method.isDefault,
    sortOrder: index,
  }));
}

export function getDefaultMethodId(exercise: Exercise): string | null {
  const methods = getMethods(exercise);
  if (methods.length === 0) return null;
  const store = readStore();
  const preferred = store.defaultMethodId[exerciseKey(exercise.id)];
  if (preferred && methods.some((m) => m.id === preferred)) return preferred;
  const lastUsed = store.lastUsedMethodId[exerciseKey(exercise.id)];
  if (lastUsed && methods.some((m) => m.id === lastUsed)) return lastUsed;
  return methods[0]?.id ?? null;
}

export function getMethodById(exercise: Exercise, methodId: string): ExerciseMethod | null {
  return getMethods(exercise).find((m) => m.id === methodId) ?? null;
}

export function setDefaultMethod(exerciseId: number, methodId: string): void {
  const store = readStore();
  store.defaultMethodId[exerciseKey(exerciseId)] = methodId;
  writeStore(store);
}

export function setLastUsedMethod(exerciseId: number, methodId: string): void {
  const store = readStore();
  store.lastUsedMethodId[exerciseKey(exerciseId)] = methodId;
  writeStore(store);
}

export function addCustomMethod(
  exerciseId: number,
  input: { label: string; weightMode: WeightMode; notes?: string }
): ExerciseMethod {
  const trimmed = input.label.trim();
  if (!trimmed) throw new Error("Method label is required");

  const store = readStore();
  const key = exerciseKey(exerciseId);
  const list = store.custom[key] ?? [];
  const method: ExerciseMethod = {
    id: crypto.randomUUID(),
    exerciseId,
    label: trimmed,
    weightMode: input.weightMode,
    isDefault: false,
    isSeeded: false,
    sortOrder: list.length,
    notes: input.notes?.trim() || undefined,
  };
  store.custom[key] = [...list, method];
  writeStore(store);
  return method;
}

export function updateMethod(
  exercise: Exercise,
  methodId: string,
  patch: Partial<Pick<ExerciseMethod, "label" | "weightMode" | "notes">>
): ExerciseMethod | null {
  const store = readStore();
  const key = exerciseKey(exercise.id);
  const method = getMethodById(exercise, methodId);
  if (!method) return null;

  if (method.isSeeded) {
    const overrides = store.seededOverrides[key] ?? {};
    overrides[methodId] = {
      ...overrides[methodId],
      ...(patch.label !== undefined ? { label: patch.label.trim() || method.label } : {}),
      ...(patch.weightMode !== undefined ? { weightMode: patch.weightMode } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() || undefined } : {}),
    };
    store.seededOverrides[key] = overrides;
    writeStore(store);
    return getMethodById(exercise, methodId);
  }

  const list = store.custom[key] ?? [];
  const next = list.map((m) =>
    m.id === methodId
      ? {
          ...m,
          label: patch.label !== undefined ? patch.label.trim() || m.label : m.label,
          weightMode: patch.weightMode ?? m.weightMode,
          notes: patch.notes !== undefined ? patch.notes.trim() || undefined : m.notes,
        }
      : m
  );
  store.custom[key] = next;
  writeStore(store);
  return getMethodById(exercise, methodId);
}

export function hideSeededMethod(exerciseId: number, methodId: string): void {
  const store = readStore();
  const key = exerciseKey(exerciseId);
  const overrides = store.seededOverrides[key] ?? {};
  overrides[methodId] = { ...overrides[methodId], hidden: true };
  store.seededOverrides[key] = overrides;
  writeStore(store);
}

export function deleteCustomMethod(exerciseId: number, methodId: string): void {
  const store = readStore();
  const key = exerciseKey(exerciseId);
  store.custom[key] = (store.custom[key] ?? []).filter((m) => m.id !== methodId);
  if (store.defaultMethodId[key] === methodId) delete store.defaultMethodId[key];
  if (store.lastUsedMethodId[key] === methodId) delete store.lastUsedMethodId[key];
  writeStore(store);
}

export function restoreSeededMethods(exerciseId: number): void {
  const store = readStore();
  const key = exerciseKey(exerciseId);
  delete store.seededOverrides[key];
  writeStore(store);
}
