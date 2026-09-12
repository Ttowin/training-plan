import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShorthandInput } from "../../src/components/ShorthandInput.js";

describe("ShorthandInput component", () => {
  it("renders placeholder text 'e.g. 15x12x3'", () => {
    render(<ShorthandInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. 15x12x3")).toBeInTheDocument();
  });

  it("renders in matrix terminal style with dark background styling", () => {
    render(<ShorthandInput value="" onChange={vi.fn()} />);
    const input = screen.getByTestId("shorthand-input");
    expect(input).toHaveClass("font-terminal");
  });

  it("calls onChange with parsed values on valid input", () => {
    const onChange = vi.fn();
    render(<ShorthandInput value="" onChange={onChange} />);
    const input = screen.getByTestId("shorthand-input");
    // Use fireEvent.change to simulate typing the full string at once
    fireEvent.change(input, { target: { value: "15x12x3" } });
    expect(onChange).toHaveBeenCalledWith(
      "15x12x3",
      expect.objectContaining({ weight: 15, reps: 12, sets: 3 })
    );
  });

  it("shows parsed preview below input on valid input", () => {
    render(<ShorthandInput value="15x12x3" onChange={vi.fn()} />);
    const preview = screen.getByTestId("shorthand-preview");
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).toContain("15kg");
    expect(preview.textContent).toContain("12");
    expect(preview.textContent).toContain("3");
  });

  it("shows error message after blur with invalid input", async () => {
    render(<ShorthandInput value="bad" onChange={vi.fn()} />);
    const input = screen.getByTestId("shorthand-input");
    fireEvent.blur(input);
    const error = screen.getByTestId("shorthand-error");
    expect(error).toBeInTheDocument();
  });

  it("does not show error before user interacts (untouched)", () => {
    render(<ShorthandInput value="bad" onChange={vi.fn()} />);
    expect(screen.queryByTestId("shorthand-error")).not.toBeInTheDocument();
  });

  it("calls onSubmit with parsed values on Enter key", async () => {
    const onSubmit = vi.fn();
    render(<ShorthandInput value="20x10x4" onChange={vi.fn()} onSubmit={onSubmit} />);
    const input = screen.getByTestId("shorthand-input");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith(
      { weight: 20, reps: 10, sets: 4 },
      "20x10x4"
    );
  });

  it("is disabled when disabled prop is true", () => {
    render(<ShorthandInput value="" onChange={vi.fn()} disabled />);
    const input = screen.getByTestId("shorthand-input");
    expect(input).toBeDisabled();
  });
});
