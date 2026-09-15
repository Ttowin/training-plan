import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { SetBySetCard, type SetInput } from "../../src/components/SetBySetCard.js";
import type { Exercise, SessionExercise } from "../../src/types/index.js";

const exercise: Exercise = {
  id: 7,
  training_day_id: 2,
  name: "High Row",
  order_idx: 1,
  default_sets: 3,
  reps_min: 10,
  reps_max: 12,
  equipment: "Machine",
  is_custom: 0,
};

const lastWeek: SetInput[] = [
  { weight: 40, reps: 11 },
  { weight: 40, reps: 11 },
  { weight: 42.5, reps: 10 },
];

function loggedEntry(id: number, weight: number, reps: number): SessionExercise {
  return {
    id,
    session_id: 1,
    exercise_id: 7,
    exercise_name: "High Row",
    weight_kg: weight,
    reps,
    sets: 1,
    input_raw: `${weight}x${reps}`,
    logged_at: new Date().toISOString(),
  };
}

describe("SetBySetCard", () => {
  it("prefills set rows from the last training log for the same exercise", () => {
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
    );
    // 3 sets from last week
    expect(screen.getByTestId("set-row-7-0-weight")).toHaveTextContent("40");
    expect(screen.getByTestId("set-row-7-0-reps")).toHaveTextContent("11");
    expect(screen.getByTestId("set-row-7-2-weight")).toHaveTextContent("42.5");
    expect(screen.getByTestId("set-row-7-2-reps")).toHaveTextContent("10");
    // last-week reference line present
    expect(screen.getByTestId("last-week-ref-7")).toHaveTextContent("40×11");
  });

  it("does NOT render a done checkbox", () => {
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
    );
    expect(screen.queryByTestId("set-row-7-0-done")).toBeNull();
    expect(screen.queryByLabelText(/toggle set .* done/i)).toBeNull();
  });

  it("renders selectable reminder cues that can be toggled", () => {
    const cues = ["肩胛骨同手踭向下沉", "手踭貼近個身"];
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={[]} reminders={cues} onLogSets={vi.fn()} />
    );
    const chip = screen.getByTestId("reminder-cue-7-0");
    expect(chip).toHaveTextContent("肩胛骨同手踭向下沉");
    expect(chip).toHaveAttribute("aria-pressed", "false");
    act(() => {
      fireEvent.click(chip);
    });
    expect(screen.getByTestId("reminder-cue-7-0")).toHaveAttribute("aria-pressed", "true");
  });

  it("edits only the targeted set's weight", () => {
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
    );
    act(() => {
      fireEvent.click(screen.getByLabelText("set 1 increase weight"));
    });
    expect(screen.getByTestId("set-row-7-0-weight")).toHaveTextContent("42.5");
    expect(screen.getByTestId("set-row-7-1-weight")).toHaveTextContent("40");
    expect(screen.getByTestId("set-row-7-2-weight")).toHaveTextContent("42.5");
  });

  it("logs all current sets on 'Log sets'", async () => {
    const onLogSets = vi.fn().mockResolvedValue(undefined);
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={onLogSets} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("log-sets-7"));
    });
    expect(onLogSets).toHaveBeenCalledTimes(1);
    expect(onLogSets).toHaveBeenCalledWith([
      { weight: 40, reps: 11 },
      { weight: 40, reps: 11 },
      { weight: 42.5, reps: 10 },
    ]);
  });

  it("prefills from already-logged sets and shows a logged summary", () => {
    const logged = [loggedEntry(101, 45, 10), loggedEntry(102, 45, 10)];
    render(
      <SetBySetCard exercise={exercise} lastWeekSets={lastWeek} loggedSets={logged} reminders={[]} onLogSets={vi.fn()} />
    );
    expect(screen.getByTestId("set-row-7-0-weight")).toHaveTextContent("45");
    const summary = screen.getByTestId("logged-summary-7");
    expect(within(summary as HTMLElement).getByText(/2 sets logged/)).toBeInTheDocument();
    // Button switches to update mode
    expect(screen.getByTestId("log-sets-7")).toHaveTextContent(/update sets/i);
  });
});
