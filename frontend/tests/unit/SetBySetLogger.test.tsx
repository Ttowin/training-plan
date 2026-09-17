import { StrictMode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SetBySetLogger } from "../../src/components/proposals/SetBySetLogger.js";
import type { LastEntry, LogResult, ProposalExercise } from "../../src/components/proposals/types.js";

const exercise: ProposalExercise = {
  name: "Machine Chest Press",
  reps_min: 10,
  reps_max: 12,
  default_sets: 3,
  equipment: null,
};

const lastWeek: LastEntry = { weight: 15, reps: 12, sets: 3 };

function countRows() {
  return screen.getAllByTestId(/^set-row-\d+$/).length;
}

describe("SetBySetLogger", () => {
  it("starts with one row per last week's set count", () => {
    render(<SetBySetLogger exercise={exercise} lastWeek={lastWeek} onLog={vi.fn()} />);
    expect(countRows()).toBe(3);
  });

  it("keeps every row when adding multiple sets and toggling them done", () => {
    render(<SetBySetLogger exercise={exercise} lastWeek={lastWeek} onLog={vi.fn()} />);

    // Add two more sets -> 5 total
    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });
    expect(countRows()).toBe(5);

    // Toggle each row's done checkbox; no rows should vanish (no id collision)
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId(`set-row-${i}-done`));
      });
      expect(countRows()).toBe(5);
    }

    expect(screen.getByText("5/5 sets done")).toBeInTheDocument();
  });

  it("keeps every row under StrictMode (double-invoked updaters, unique ids)", () => {
    render(
      <StrictMode>
        <SetBySetLogger exercise={exercise} lastWeek={lastWeek} onLog={vi.fn()} />
      </StrictMode>
    );

    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });
    expect(countRows()).toBe(5);

    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId(`set-row-${i}-done`));
      });
      expect(countRows()).toBe(5);
    }
    expect(screen.getByText("5/5 sets done")).toBeInTheDocument();
  });

  it("edits only the targeted row's weight (rows are independent)", () => {
    render(<SetBySetLogger exercise={exercise} lastWeek={lastWeek} onLog={vi.fn()} />);
    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });

    // Increase weight on row index 1 (set 2) only, from 15 -> 17.5
    act(() => {
      fireEvent.click(screen.getByLabelText("set 2 increase weight"));
    });

    expect(screen.getByTestId("set-row-0-weight")).toHaveTextContent("15");
    expect(screen.getByTestId("set-row-1-weight")).toHaveTextContent("17.5");
    expect(screen.getByTestId("set-row-2-weight")).toHaveTextContent("15");
    expect(screen.getByTestId("set-row-3-weight")).toHaveTextContent("15");
  });

  it("logs all completed sets with a per-set breakdown", () => {
    const onLog = vi.fn<[], void>() as unknown as (r: LogResult) => void;
    const spy = vi.fn();
    render(<SetBySetLogger exercise={exercise} lastWeek={lastWeek} onLog={spy} />);

    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-add"));
    });
    // mark all 4 done
    for (let i = 0; i < 4; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId(`set-row-${i}-done`));
      });
    }
    act(() => {
      fireEvent.click(screen.getByTestId("setbyset-log"));
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const result = spy.mock.calls[0][0] as LogResult;
    expect(result.method).toBe("Set-by-Set");
    expect(result.summary).toContain("4 sets");
    // 4 sets × 15kg × 12 = 720
    expect(result.volume).toBe(720);
    void onLog;
  });
});
