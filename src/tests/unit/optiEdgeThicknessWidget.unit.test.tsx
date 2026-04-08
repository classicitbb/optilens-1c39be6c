import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import OptiEdgeThicknessWidget from "@/components/lenses/OptiEdgeThicknessWidget";

describe("OptiEdgeThicknessWidget input behavior", () => {
  it("debounces numeric commits so typing is not interrupted", () => {
    vi.useFakeTimers();

    const { container } = render(<OptiEdgeThicknessWidget />);
    const rightPd = container.querySelector<HTMLInputElement>("#right-pd");

    expect(rightPd).not.toBeNull();
    if (!rightPd) return;

    fireEvent.change(rightPd, { target: { value: "100" } });

    // Field should keep what the user typed immediately.
    expect(rightPd.value).toBe("100");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // After debounce + clamping, it should normalize to max PD.
    expect(rightPd.value).toBe("40");

    vi.useRealTimers();
  });
});
