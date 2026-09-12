import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExerciseCard } from "../../src/components/ExerciseCard.js";
import type { Exercise, SessionExercise } from "../../src/types/index.js";

const mockExercise: Exercise = {
  id: 1,
  training_day_id: 1,
  name: "Dumbbell Incline Chest Press",
  order_idx: 2,
  default_sets: 3,
  reps_min: 10,
  reps_max: 12,
  equipment: null,
  is_custom: 0,
};

const mockLastWeek: SessionExercise = {
  id: 10,
  session_id: 5,
  exercise_id: 1,
  exercise_name: "Dumbbell Incline Chest Press",
  weight_kg: 15,
  reps: 12,
  sets: 3,
  input_raw: "15x12x3",
  logged_at: new Date().toISOString(),
};

const mockLoggedEntry: SessionExercise = {
  id: 20,
  session_id: 6,
  exercise_id: 1,
  exercise_name: "Dumbbell Incline Chest Press",
  weight_kg: 17.5,
  reps: 12,
  sets: 3,
  input_raw: "17.5x12x3",
  logged_at: new Date().toISOString(),
};

describe("ExerciseCard component", () => {
  it("renders exercise name", () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        lastWeekEntry={null}
        onLog={vi.fn()}
      />
    );
    expect(screen.getByTestId("exercise-name")).toHaveTextContent("Dumbbell Incline Chest Press");
  });

  it("renders default reps and sets", () => {
    render(
      <ExerciseCard exercise={mockExercise} lastWeekEntry={null} onLog={vi.fn()} />
    );
    expect(screen.getByText(/3 sets × 10-12 reps/)).toBeInTheDocument();
  });

  it("renders 'No previous data' when lastWeekEntry is null", () => {
    render(
      <ExerciseCard exercise={mockExercise} lastWeekEntry={null} onLog={vi.fn()} />
    );
    expect(screen.getByTestId("no-previous-data")).toBeInTheDocument();
  });

  it("renders last week's data when lastWeekEntry is provided", () => {
    render(
      <ExerciseCard exercise={mockExercise} lastWeekEntry={mockLastWeek} onLog={vi.fn()} />
    );
    const ref = screen.getByTestId("last-week-ref");
    expect(ref.textContent).toContain("15x12x3");
  });

  it("calls onLog when form is submitted with valid input", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    render(
      <ExerciseCard exercise={mockExercise} lastWeekEntry={null} onLog={onLog} />
    );
    const input = screen.getByTestId("shorthand-input");
    await act(async () => {
      fireEvent.change(input, { target: { value: "15x12x3" } });
    });
    const logButton = screen.getByText("LOG EXERCISE");
    await act(async () => {
      fireEvent.click(logButton);
    });
    expect(onLog).toHaveBeenCalledWith(1, "Dumbbell Incline Chest Press", expect.objectContaining({ weight: 15, reps: 12, sets: 3 }), "15x12x3");
  });
});
