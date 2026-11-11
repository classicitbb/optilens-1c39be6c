import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivacyFilterProvider, PrivacyToggle, Private } from "@/features/admin/hr/privacy";

const setup = () =>
  render(
    <PrivacyFilterProvider seconds={30}>
      <PrivacyToggle />
      <Private block><input aria-label="amount" /></Private>
    </PrivacyFilterProvider>,
  );

const hidden = () => screen.queryByRole("button", { name: /show figures/i }) !== null;
const wait = (seconds: number) => act(() => { vi.advanceTimersByTime(seconds * 1000); });

describe("privacy filter timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hides the figures again after the idle time", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /show figures/i }));
    expect(hidden()).toBe(false);
    wait(29);
    expect(hidden()).toBe(false);
    wait(2);
    expect(hidden()).toBe(true);
  });

  it("keeps the figures up while the mouse is moving or someone is typing", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /show figures/i }));
    for (let i = 0; i < 6; i++) {
      wait(20);
      fireEvent.mouseMove(document.body);
    }
    expect(hidden()).toBe(false);
    for (let i = 0; i < 4; i++) {
      wait(20);
      fireEvent.keyDown(screen.getByLabelText("amount"), { key: "1" });
    }
    expect(hidden()).toBe(false);
  });

  it("counts down from the last activity once everything goes quiet", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /show figures/i }));
    wait(25);
    fireEvent.focusIn(screen.getByLabelText("amount"));
    wait(25);
    expect(hidden()).toBe(false);
    wait(6);
    expect(hidden()).toBe(true);
  });
});
