import { describe, it, expect, beforeEach } from "vitest";
import {
  getReminders,
  getCustomReminders,
  addReminder,
  removeReminder,
} from "../../src/data/exerciseReminders.js";

describe("exercise reminder store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns seeded defaults for a known exercise", () => {
    const cues = getReminders("High Row");
    expect(cues).toContain("肩胛骨同手踭向下沉");
    expect(cues.length).toBe(4);
    expect(getCustomReminders("High Row")).toEqual([]);
  });

  it("returns an empty list for an exercise with no cues", () => {
    expect(getReminders("Leg Extension")).toEqual([]);
  });

  it("adds a custom cue and persists it after the defaults", () => {
    const cues = addReminder("High Row", "膊頭放鬆");
    expect(cues[cues.length - 1]).toBe("膊頭放鬆");
    expect(getCustomReminders("High Row")).toEqual(["膊頭放鬆"]);
    // Re-reading from storage keeps the custom cue
    expect(getReminders("High Row")).toContain("膊頭放鬆");
  });

  it("adds cues for exercises that have no defaults", () => {
    addReminder("Leg Extension", "腳趾向前");
    expect(getReminders("Leg Extension")).toEqual(["腳趾向前"]);
  });

  it("ignores empty/whitespace and duplicate cues", () => {
    addReminder("High Row", "   ");
    expect(getCustomReminders("High Row")).toEqual([]);
    addReminder("High Row", "肩胛骨同手踭向下沉"); // already a default
    expect(getCustomReminders("High Row")).toEqual([]);
    addReminder("Leg Extension", "focus");
    addReminder("Leg Extension", "focus");
    expect(getCustomReminders("Leg Extension")).toEqual(["focus"]);
  });

  it("removes custom cues but never seeded defaults", () => {
    addReminder("High Row", "custom cue");
    removeReminder("High Row", "custom cue");
    expect(getCustomReminders("High Row")).toEqual([]);
    // Removing a default is a no-op
    const after = removeReminder("High Row", "肩胛骨同手踭向下沉");
    expect(after).toContain("肩胛骨同手踭向下沉");
  });
});
