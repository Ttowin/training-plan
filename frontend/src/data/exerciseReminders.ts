/**
 * Per-exercise form-cue reminders.
 *
 * Seeded defaults live in EXERCISE_REMINDERS; users can add their own cues,
 * which are persisted in localStorage and merged with the defaults. Custom
 * cues can be removed; seeded defaults cannot.
 */
export const EXERCISE_REMINDERS: Record<string, string[]> = {
  "High Row": [
    "肩胛骨同手踭向下沉",
    "向前嗰陣，拉伸多啲",
    "唔係諗住向後",
    "手踭貼近個身",
  ],
};

const STORAGE_KEY = "gymmatrix:custom-cues";

type CustomStore = Record<string, string[]>;

function readStore(): CustomStore {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CustomStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function getDefaultReminders(exerciseName: string): string[] {
  return EXERCISE_REMINDERS[exerciseName] ?? [];
}

export function getCustomReminders(exerciseName: string): string[] {
  const defaults = getDefaultReminders(exerciseName);
  return (readStore()[exerciseName] ?? []).filter((c) => !defaults.includes(c));
}

/** Seeded defaults first, then user-added cues (de-duplicated). */
export function getReminders(exerciseName: string): string[] {
  return [...getDefaultReminders(exerciseName), ...getCustomReminders(exerciseName)];
}

export function addReminder(exerciseName: string, cue: string): string[] {
  const trimmed = cue.trim();
  if (trimmed) {
    const store = readStore();
    const list = store[exerciseName] ?? [];
    if (!list.includes(trimmed) && !getDefaultReminders(exerciseName).includes(trimmed)) {
      store[exerciseName] = [...list, trimmed];
      writeStore(store);
    }
  }
  return getReminders(exerciseName);
}

export function removeReminder(exerciseName: string, cue: string): string[] {
  const store = readStore();
  const list = store[exerciseName] ?? [];
  const next = list.filter((c) => c !== cue);
  if (next.length !== list.length) {
    store[exerciseName] = next;
    writeStore(store);
  }
  return getReminders(exerciseName);
}
