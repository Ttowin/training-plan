import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatrixRain } from "../../src/components/MatrixRain.js";

// jsdom doesn't implement canvas; mock it
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: "",
    font: "",
    fillRect: vi.fn(),
    fillText: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe("MatrixRain canvas component", () => {
  it("renders a canvas element", () => {
    render(<MatrixRain />);
    expect(screen.getByTestId("matrix-rain-canvas")).toBeInTheDocument();
  });

  it("canvas has fixed positioning class", () => {
    render(<MatrixRain />);
    const canvas = screen.getByTestId("matrix-rain-canvas");
    expect(canvas).toHaveClass("fixed");
  });

  it("renders without errors on mount and unmount", () => {
    const { unmount } = render(<MatrixRain />);
    expect(() => unmount()).not.toThrow();
  });
});
