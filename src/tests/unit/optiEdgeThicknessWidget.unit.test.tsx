import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import OptiEdgeThicknessWidget from "@/components/lenses/OptiEdgeThicknessWidget";

describe("OptiEdgeThicknessWidget input behavior", () => {
  it("keeps the raw draft while typing and normalizes the PD on blur", () => {
    vi.useFakeTimers();

    const { container } = render(<OptiEdgeThicknessWidget />);
    const rightPd = container.querySelector<HTMLInputElement>("#right-pd");

    expect(rightPd).not.toBeNull();
    if (!rightPd) return;

    fireEvent.focus(rightPd);
    fireEvent.change(rightPd, { target: { value: "100" } });

    // Field keeps what the user typed immediately (no interruption / no spinner).
    expect(rightPd.value).toBe("100");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Still editing, so the raw draft is preserved during the debounce window.
    expect(rightPd.value).toBe("100");

    fireEvent.blur(rightPd);

    // On commit the value is clamped to the max mono PD and reformatted.
    expect(rightPd.value).toBe("40.0");

    vi.useRealTimers();
  });

  it("renders signed, two-decimal power fields with no native spinner", () => {
    const { container } = render(<OptiEdgeThicknessWidget />);
    const rightSph = container.querySelector<HTMLInputElement>("#right-sph");

    expect(rightSph).not.toBeNull();
    if (!rightSph) return;

    // type="text" => no browser increment/decrement buttons.
    expect(rightSph.getAttribute("type")).toBe("text");
    expect(rightSph.value).toBe("-2.50");
  });

  it("switches the PD entry between monocular and binocular", () => {
    const { container, getByText } = render(<OptiEdgeThicknessWidget />);

    expect(container.querySelector("#right-pd")).not.toBeNull();
    expect(container.querySelector("#binocular-pd")).toBeNull();

    fireEvent.click(getByText("Binocular"));

    expect(container.querySelector("#right-pd")).toBeNull();
    expect(container.querySelector("#binocular-pd")).not.toBeNull();
  });
});
