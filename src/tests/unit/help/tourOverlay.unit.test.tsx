import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TourProvider, useTours } from "@/help/tours/TourProvider";

const record = vi.fn(async () => undefined);
vi.mock("@/help/tours/useTourProgress", () => ({
  useTourProgress: () => ({ progress: [], isLoaded: false, record }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// jsdom lays nothing out; give every element a box so targets count as visible.
const originalRects = Element.prototype.getClientRects;
beforeAll(() => {
  Element.prototype.getClientRects = function () {
    return [{}] as unknown as DOMRectList;
  };
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  Element.prototype.getClientRects = originalRects;
});

const Starter = ({ step = 0 }: { step?: number }) => {
  const tours = useTours();
  return <button onClick={() => tours?.startTour("hr.payroll-run", step)}>start</button>;
};

// The payroll-run tour minus "hr-run-missing" (only shown when someone is left out), "hr-run-mark-paid" and "hr-run-archive" (approved runs only).
const Page = ({ step }: { step?: number }) => (
  <MemoryRouter initialEntries={["/admin/finance/payroll/run-1"]}>
    <TourProvider contextSlug="finance/payroll">
      <Starter step={step} />
      <div data-tour="hr-run-totals">totals</div>
      <div data-tour="hr-run-payslips">payslips</div>
      <button data-tour="hr-run-recalculate">Recalculate</button>
      <button data-tour="hr-run-approve">Approve</button>
    </TourProvider>
  </MemoryRouter>
);

const dialog = () => screen.getByRole("dialog");

describe("TourOverlay", () => {
  it("walks forward, skips missing targets, goes back and finishes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Page />);
    fireEvent.click(screen.getByText("start"));
    await waitFor(() => expect(dialog().getAttribute("aria-label")).toContain("step 1 of 7"));
    expect(record).toHaveBeenCalledWith("hr.payroll-run", expect.objectContaining({ seen_at: expect.any(String) }));

    // Step 2 ("Who is left out") has no target: Next waits briefly, then lands on step 3.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await waitFor(() => expect(dialog().getAttribute("aria-label")).toContain("step 3 of 7"));

    // Back skips the missing step 2 the other way.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await waitFor(() => expect(dialog().getAttribute("aria-label")).toContain("step 1 of 7"));

    // Jump straight to step 5 with the step picker.
    fireEvent.change(screen.getByLabelText("Jump to step"), { target: { value: "4" } });
    await waitFor(() => expect(dialog().getAttribute("aria-label")).toContain("step 5 of 7"));

    // Steps 6 and 7 have no target, so step 5 is the last one shown.
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(record).toHaveBeenCalledWith("hr.payroll-run", expect.objectContaining({ completed_at: expect.any(String), last_step: 4 }));
    vi.useRealTimers();
  });

  it("can start at any step and exit with Escape", async () => {
    render(<Page step={3} />);
    fireEvent.click(screen.getByText("start"));
    await waitFor(() => expect(dialog().getAttribute("aria-label")).toContain("step 4 of 7"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
