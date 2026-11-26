import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantRequestForm } from "@/components/assistant/CompanionAssistant";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), busy: false, error: null as string | null, kind: "customer_support" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/usePortalIdentity", () => ({ usePortalIdentity: () => ({ identity: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/features/assistant/CompanionAssistantContext", () => ({
  useCompanionAssistant: () => ({
    formState: { kind: mocks.kind, name: "Example visitor", email: "visitor@example.com", issueType: "Product question", summary: "Please help me choose a coating.", customerName: "", password: "", businessName: "", market: "", requesterType: "" },
    updateForm: vi.fn(), submitForm: mocks.submit, submitQuickAction: vi.fn(), isSubmitting: mocks.busy, submissionError: mocks.error,
  }),
}));

const form = () => render(<MemoryRouter><AssistantRequestForm requestFiles={[]} requestFileError={null} addRequestFiles={vi.fn()} removeRequestFile={vi.fn()} /></MemoryRouter>);
beforeEach(() => {
  mocks.busy = false;
  mocks.error = null;
  mocks.kind = "customer_support";
  mocks.submit.mockReset();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});
describe("Iris public request feedback", () => {
  it("marks required fields and keeps confirmation explicit", () => {
    form();
    expect(screen.getByLabelText(/Reply email/)).toBeRequired();
    expect(screen.getByLabelText(/Request details/)).toBeRequired();
    expect(screen.getByRole("button", { name: "Confirm & send" })).toBeEnabled();
    expect(screen.queryByText(/Signed-in account/)).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("preserves entries across an offline transition and requires reconnecting to send", () => {
    form();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("button", { name: "Confirm & send" })).toBeDisabled();
    expect(screen.getByLabelText(/Request details/)).toHaveValue("Please help me choose a coating.");
    expect(screen.getByText(/Your entries remain in this open form/)).toBeVisible();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("keeps failed request fields and offers a way to check whether the request arrived", () => {
    mocks.error = "Network request failed";
    form();
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t confirm your request");
    expect(screen.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:+12464334928");
    expect(screen.getByLabelText(/Reply email/)).toHaveValue("visitor@example.com");
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("shows honest progress and blocks repeated confirmation during a send", () => {
    mocks.busy = true;
    form();
    expect(screen.getByRole("progressbar", { name: "Sending request" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Sending…" }));
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("explains the existing trade-price eligibility restriction and gives a way back", () => {
    mocks.kind = "pricelist_request";
    form();
    expect(screen.getByText("Confirm your optical business first")).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to Iris" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Confirm & send" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
