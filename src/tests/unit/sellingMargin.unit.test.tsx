import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { sellingMargin } from "@/features/rx-order/form/marginEstimate";
import { GrossMarginEstimate } from "@/features/rx-order/form/GrossMarginEstimate";

describe("selling margin estimate", () => {
  it("uses selling price as the percentage denominator, not cost", () => {
    expect(sellingMargin(100, "150")?.profitBBD).toBe(50);
    expect(sellingMargin(100, "150")?.marginPercent).toBeCloseTo(100 / 3);
    expect(sellingMargin(150, "100")).toEqual({ profitBBD: -50, marginPercent: -50 });
    expect(sellingMargin(100, "100")).toEqual({ profitBBD: 0, marginPercent: 0 });
    expect(sellingMargin(0.1, "0.30")?.profitBBD).toBe(0.2);
  });
  it("handles zero sales without dividing by zero and rejects invalid amounts", () => {
    expect(sellingMargin(100, "0")).toEqual({ profitBBD: -100, marginPercent: null });
    for (const input of ["", "-1", "abc", "Infinity", "1e3", "1.234"]) expect(sellingMargin(100, input)).toBeNull();
    expect(sellingMargin(Infinity, "150")).toBeNull();
  });
  it("updates profit when the quote changes and clears the estimate for invalid input", () => {
    const view = render(<GrossMarginEstimate costBBD={100} />);
    const input = screen.getByLabelText("Your selling price (BBD)");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "150" } });
    expect(screen.getByRole("status")).toHaveTextContent("BBD $ 50.00");
    expect(screen.getByRole("status")).toHaveTextContent("33.3%");
    view.rerender(<GrossMarginEstimate costBBD={175} />);
    expect(screen.getByRole("status")).toHaveTextContent("BBD $ -25.00");
    fireEvent.change(input, { target: { value: "-1" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
