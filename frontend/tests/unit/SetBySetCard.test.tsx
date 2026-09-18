import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { SetBySetCard, type SetInput } from "../../src/components/SetBySetCard.js";
import type { Exercise, SessionExercise } from "../../src/types/index.js";
import type { ExerciseMethod } from "../../src/utils/parseSeedMethods.js";

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

const methods: ExerciseMethod[] = [
  {
    id: "seed-7-machine",
    exerciseId: 7,
    label: "Machine",
    weightMode: "stack",
    isDefault: true,
    isSeeded: true,
    sortOrder: 0,
  },
];

const selectedMethod = methods[0];

const methodProps = {
  methods,
  selectedMethod,
  onMethodSelect: vi.fn(),
  onAddMethod: vi.fn(),
  onEditMethod: vi.fn(),
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
    method_id: selectedMethod.id,
    method_label: selectedMethod.label,
    logged_at: new Date().toISOString(),
  };
}

describe("SetBySetCard", () => {
  it("prefills set rows from the last training log for the same exercise", () => {
    render(
      <SetBySetCard exercise={exercise} {...methodProps} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
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
      <SetBySetCard exercise={exercise} {...methodProps} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
    );
    expect(screen.queryByTestId("set-row-7-0-done")).toBeNull();
    expect(screen.queryByLabelText(/toggle set .* done/i)).toBeNull();
  });

  it("renders selectable reminder cues that can be toggled", () => {
    const cues = ["肩胛骨同手踭向下沉", "手踭貼近個身"];
    render(
      <SetBySetCard
        exercise={exercise}
        {...methodProps}
        lastWeekSets={lastWeek}
        loggedSets={[]}
        reminders={cues}
        onLogSets={vi.fn()}
      />
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
      <SetBySetCard exercise={exercise} {...methodProps} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
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
      <SetBySetCard
        exercise={exercise}
        {...methodProps}
        lastWeekSets={lastWeek}
        loggedSets={[]}
        reminders={[]}
        onLogSets={onLogSets}
      />
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

  it("lets the user add a new form cue", () => {
    const onAddCue = vi.fn();
    render(
      <SetBySetCard
        exercise={exercise}
        {...methodProps}
        lastWeekSets={lastWeek}
        loggedSets={[]}
        reminders={["肩胛骨同手踭向下沉"]}
        onAddCue={onAddCue}
        onLogSets={vi.fn()}
      />
    );
    const input = screen.getByTestId("add-cue-input-7");
    act(() => {
      fireEvent.change(input, { target: { value: "膊頭放鬆" } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-cue-submit-7"));
    });
    expect(onAddCue).toHaveBeenCalledWith("膊頭放鬆");
    // New cue chip is rendered (index 1 after the seeded one)
    expect(screen.getByTestId("reminder-cue-7-1")).toHaveTextContent("膊頭放鬆");
    // Input cleared
    expect(screen.getByTestId("add-cue-input-7")).toHaveValue("");
  });

  it("allows removing only user-added (custom) cues", () => {
    const onRemoveCue = vi.fn();
    render(
      <SetBySetCard
        exercise={exercise}
        {...methodProps}
        lastWeekSets={lastWeek}
        loggedSets={[]}
        reminders={["default cue", "my cue"]}
        customCues={["my cue"]}
        onRemoveCue={onRemoveCue}
        onLogSets={vi.fn()}
      />
    );
    // default cue has no remove button; custom one does
    expect(screen.queryByTestId("remove-cue-7-0")).toBeNull();
    const removeBtn = screen.getByTestId("remove-cue-7-1");
    act(() => {
      fireEvent.click(removeBtn);
    });
    expect(onRemoveCue).toHaveBeenCalledWith("my cue");
    expect(screen.queryByText("my cue")).toBeNull();
  });

  it("prefills from already-logged sets and shows a logged summary", () => {
    const logged = [loggedEntry(101, 45, 10), loggedEntry(102, 45, 10)];
    render(
      <SetBySetCard exercise={exercise} {...methodProps} lastWeekSets={lastWeek} loggedSets={logged} reminders={[]} onLogSets={vi.fn()} />
    );
    expect(screen.getByTestId("set-row-7-0-weight")).toHaveTextContent("45");
    const summary = screen.getByTestId("logged-summary-7");
    expect(within(summary as HTMLElement).getByText(/2 sets logged/)).toBeInTheDocument();
    // Button switches to update mode
    expect(screen.getByTestId("log-sets-7")).toHaveTextContent(/update sets/i);
  });

  it("lets the user type weight and reps via keyboard after clicking the value", () => {
    render(
      <SetBySetCard exercise={exercise} {...methodProps} lastWeekSets={lastWeek} loggedSets={[]} reminders={[]} onLogSets={vi.fn()} />
    );

    act(() => {
      fireEvent.click(screen.getByTestId("set-row-7-0-weight"));
    });
    const weightInput = screen.getByTestId("set-row-7-0-weight-input");
    act(() => {
      fireEvent.change(weightInput, { target: { value: "37.5" } });
      fireEvent.blur(weightInput);
    });
    expect(screen.getByTestId("set-row-7-0-weight")).toHaveTextContent("37.5");

    act(() => {
      fireEvent.click(screen.getByTestId("set-row-7-0-reps"));
    });
    const repsInput = screen.getByTestId("set-row-7-0-reps-input");
    act(() => {
      fireEvent.change(repsInput, { target: { value: "8" } });
      fireEvent.keyDown(repsInput, { key: "Enter" });
    });
    expect(screen.getByTestId("set-row-7-0-reps")).toHaveTextContent("8");
  });
});
