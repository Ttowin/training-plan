import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CycleSelector } from "../../src/components/CycleSelector.js";
import type { TrainingDay } from "../../src/types/index.js";

const mockDays: TrainingDay[] = [
  { id: 1, name: "Chest & Shoulder Day", order_idx: 1, muscle_targets: [{ muscle: "Chest", sets: 9 }], exercises: [] },
  { id: 2, name: "Back Day", order_idx: 2, muscle_targets: [{ muscle: "Back", sets: 12 }], exercises: [] },
  { id: 3, name: "Shoulder & Arm Day", order_idx: 3, muscle_targets: [{ muscle: "Front Delt", sets: 6 }], exercises: [] },
  { id: 4, name: "Leg Day", order_idx: 4, muscle_targets: [{ muscle: "Quad", sets: 6 }], exercises: [] },
];

describe("CycleSelector component", () => {
  it("renders all 4 training day options", () => {
    render(<CycleSelector days={mockDays} selectedId={1} onSelect={vi.fn()} />);
    const selector = screen.getByTestId("cycle-selector");
    expect(selector.querySelectorAll("button")).toHaveLength(4);
  });

  it("highlights the currently selected day", () => {
    render(<CycleSelector days={mockDays} selectedId={2} onSelect={vi.fn()} />);
    const selectedBtn = screen.getByTestId("cycle-option-2");
    expect(selectedBtn).toHaveClass("border-matrix-green");
  });

  it("calls onSelect when user picks a different day", () => {
    const onSelect = vi.fn();
    render(<CycleSelector days={mockDays} selectedId={1} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("cycle-option-3"));
    expect(onSelect).toHaveBeenCalledWith(mockDays[2]);
  });

  it("renders all day names", () => {
    render(<CycleSelector days={mockDays} selectedId={1} onSelect={vi.fn()} />);
    expect(screen.getByText("Chest & Shoulder Day")).toBeInTheDocument();
    expect(screen.getByText("Leg Day")).toBeInTheDocument();
  });
});
