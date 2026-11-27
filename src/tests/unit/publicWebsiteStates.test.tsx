import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import ContactForm from "@/components/ContactForm";
import RetailerDirectory from "@/components/retailers/RetailerDirectory";
import { RequestField } from "@/components/public-states/RequestField";
import { useDelayedBusy } from "@/hooks/useDelayedBusy";

const mocks = vi.hoisted(() => ({ load: vi.fn(), search: vi.fn(), assistant: vi.fn(), retailer: vi.fn() }));
vi.mock("@/features/assistant/CompanionAssistantContext", () => ({ useCompanionAssistant: () => ({ openAssistant: mocks.assistant }), useRetailerAssistantPrompt: () => mocks.retailer }));
vi.mock("@/lib/publicSiteSearch", () => ({ loadPublicContentIndex: mocks.load, searchPublicPages: mocks.search }));

function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: online });
  act(() => { window.dispatchEvent(new Event(online ? "online" : "offline")); });
}

beforeEach(() => {
  vi.clearAllMocks();
  connection(true);
  mocks.load.mockResolvedValue([]);
  mocks.search.mockReturnValue([]);
});
afterEach(() => { vi.useRealTimers(); });
const search = () => render(<MemoryRouter><PublicSearchPanel /></MemoryRouter>);

describe("public search recovery", () => {
  it("offers starting points before a query and useful alternatives when nothing matches", async () => {
    search();
    expect(screen.getByRole("link", { name: "Explore lenses" })).toBeVisible();
    expect(mocks.load).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "unknown lens" } });
    expect(await screen.findByText("No page matches for “unknown lens”")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("shows loading rather than a false empty state, then recovers from a failed index load", async () => {
    let rejectLoad!: (reason: Error) => void;
    mocks.load.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectLoad = reject; }));
    search();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "coatings" } });
    expect(screen.getByRole("progressbar")).toBeVisible();
    expect(screen.queryByText(/No page matches for/)).not.toBeInTheDocument();
    await act(async () => { rejectLoad(new Error("network unavailable")); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Page search couldn’t load");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No page matches for “coatings”")).toBeVisible();
    expect(mocks.load).toHaveBeenCalledTimes(2);
  });

  it("preserves loaded matches offline and disables only the Iris handoff", async () => {
    mocks.search.mockReturnValue([{ path: "/coatings", title: "Lens coatings", snippet: "Explore coatings", matchStart: 0, matchLength: 8, matchCount: 1, viaAltText: false }]);
    search();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "coatings" } });
    expect(await screen.findByRole("link", { name: /Lens coatings/ })).toBeVisible();
    connection(false);
    expect(screen.getByText("You’re offline")).toBeVisible();
    expect(screen.getByRole("link", { name: /Lens coatings/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ask Iris about this" })).toBeDisabled();
    connection(true);
    fireEvent.click(screen.getByRole("button", { name: "Ask Iris about this" }));
    expect(mocks.assistant).toHaveBeenCalledWith({ query: "coatings", autoSubmit: true });
  });

  it("waits offline without fetching and loads automatically on reconnect", async () => {
    connection(false);
    search();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "coatings" } });
    expect(mocks.load).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    connection(true);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No page matches for “coatings”")).toBeVisible();
  });
});

describe("contact and retailer feedback", () => {
  it("keeps a telephone route available when contact chat is offline", () => {
    connection(false);
    render(<ContactForm />);
    expect(screen.getByRole("button", { name: /Chat with our team/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "+1 246 433-4928" })).toHaveAttribute("href", "tel:+12464334928");
    expect(mocks.assistant).not.toHaveBeenCalled();
  });

  it("lets visitors recover a retailer search offline without calling Iris", () => {
    connection(false);
    render(<MemoryRouter><RetailerDirectory /></MemoryRouter>);
    const input = screen.getByLabelText("Search retailers, clinics, or islands");
    fireEvent.change(input, { target: { value: "zzzz-no-retailer" } });
    expect(screen.getByText("No retailers match “zzzz-no-retailer”")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ask for help" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset search" }));
    expect(input).toHaveValue("");
    expect(screen.queryByText(/No retailers match/)).not.toBeInTheDocument();
    expect(mocks.retailer).not.toHaveBeenCalled();
  });
});

describe("inline request validation", () => {
  function Form() {
    const [value, setValue] = useState("");
    return <form><RequestField label="Reply email" type="email" value={value} onValueChange={setValue} /><button type="submit">Send</button></form>;
  }
  it("waits for interaction, links the error to the field, and clears it when corrected", () => {
    render(<Form />);
    const input = screen.getByLabelText(/Reply email/);
    expect(input).toHaveAttribute("aria-invalid", "false");
    fireEvent.change(input, { target: { value: "broken" } });
    expect(screen.queryByText(/Enter an email address/)).not.toBeInTheDocument();
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter an email address like name@example.com.");
    fireEvent.change(input, { target: { value: "name@example.com" } });
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
  it("rejects whitespace and exposes required errors after an attempted send", () => {
    render(<Form />);
    const input = screen.getByLabelText(/Reply email/);
    fireEvent.invalid(input);
    expect(screen.getByText("Enter reply email.")).toBeVisible();
    fireEvent.change(input, { target: { value: "   " } });
    expect(input).toBeInvalid();
  });
});

it("shows slow-request guidance only after the delay and clears it for the next request", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ busy }) => useDelayedBusy(busy), { initialProps: { busy: true } });
  expect(result.current).toBe(false);
  act(() => { vi.advanceTimersByTime(6000); });
  expect(result.current).toBe(true);
  rerender({ busy: false });
  expect(result.current).toBe(false);
  rerender({ busy: true });
  expect(result.current).toBe(false);
});
