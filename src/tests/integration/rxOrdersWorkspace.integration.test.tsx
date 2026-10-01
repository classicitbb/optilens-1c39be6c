import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import RxOrdersWorkspace from "@/features/rx-order/workspace/RxOrdersWorkspace";
import { buildItems, type CaptureRow } from "@/features/rx-order/workspace/classify";
import type { RxSubmissionRow } from "@/features/rx-order/types";

const mocks = vi.hoisted(() => ({ email: vi.fn(), approve: vi.fn(), cancel: vi.fn(), resend: vi.fn(), pull: vi.fn(), navigate: vi.fn(), state: { items: [] as any[] } }));

vi.mock("react-router", async (orig) => ({ ...(await orig<typeof import("react-router")>()), useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/features/rx-order/workspace/useRxWorkspace", () => ({
  useRxWorkspace: () => ({
    items: mocks.state.items, isLoading: false, accountName: () => "—", refresh: vi.fn(),
    outbox: {
      approveMutation: { mutateAsync: mocks.approve, mutate: mocks.approve, isPending: false },
      cancelMutation: { mutate: mocks.cancel, isPending: false },
      resendMutation: { mutate: mocks.resend, isPending: false },
      pullStatusesMutation: { mutate: mocks.pull, isPending: false },
    },
  }),
  useRxOrderDetail: () => ({ data: { quote: null, lines: [], events: [{ id: "e1", event: "submission_pending_review", from_status: null, to_status: "pending_review", detail: {}, created_at: "2026-10-01T10:00:00Z" }] } }),
  useCaptureImage: () => ({ data: null }),
  emailCustomer: mocks.email,
}));

const sub = (id: string, over: Partial<RxSubmissionRow> = {}): RxSubmissionRow => ({
  id, quote_id: `q-${id}`, order_id: null, account_id: 1, status: "pending_review", dispatch_provider: "innovations", transport: null,
  result_code: null, result_message: null, rxt_data: null, attempts: 0, last_error: null, approved_by: null, approved_at: null, submitted_at: null,
  created_at: "2026-10-01T10:00:00Z", gatekeeper_order_id: null, lab_status: null, lab_status_detail: null, lab_status_at: null,
  payload: { quote: { quote_number: `Q-${id}` }, account: { name: `Customer ${id}` } }, ...over,
});
const cap: CaptureRow = { id: "c1", account_id: 1, source: "local_capture", status: "ready", error: null, quote_id: null, created_at: "2026-10-02T10:00:00Z", storage_path: null, file_name: null };

const load = (submissions: RxSubmissionRow[], captures: CaptureRow[] = []) => {
  mocks.state.items = buildItems({ submissions, captures, accountName: () => "Acme", quoteNumbers: new Map() });
};
const show = () => render(<MemoryRouter><RxOrdersWorkspace /></MemoryRouter>);

describe("Rx Orders workspace", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("opens on what needs review, with a count on every tab", () => {
    load([sub("1"), sub("2", { status: "failed", last_error: "boom" }), sub("3", { status: "submitted", lab_status: "Shipped" })], [cap]);
    show();
    expect(screen.getByRole("tab", { name: /Needs review/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Ready to release/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Problems/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Done/ })).toHaveTextContent("1");
    expect(screen.getByText("Office capture")).toBeInTheDocument();
  });

  it("shows a failed order under Problems with its error and a Retry", async () => {
    load([sub("2", { status: "failed", last_error: "Innovations refused it" })]);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Problems/ }));
    await waitFor(() => expect(screen.getByText("Innovations refused it")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(mocks.approve).toHaveBeenCalledWith({ id: "2", provider: "innovations" });
  });

  it("writes every underscore of a status as a space", async () => {
    load([sub("1", { status: "pending_review" })]);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => expect(screen.getByText("pending review")).toBeInTheDocument());
  });

  it("releases only the selected orders, each to its own sender, after a confirmation", async () => {
    load([sub("1"), sub("2", { dispatch_provider: "gatekeeper" }), sub("3")]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.approve.mockResolvedValue(undefined);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByLabelText("Select Q-1"));
    fireEvent.click(screen.getByLabelText("Select Q-1"));
    fireEvent.click(screen.getByLabelText("Select Q-2"));
    fireEvent.click(screen.getByRole("button", { name: /Release selected/ }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledTimes(2));
    expect(mocks.approve).toHaveBeenCalledWith({ id: "1", provider: "innovations" });
    expect(mocks.approve).toHaveBeenCalledWith({ id: "2", provider: "gatekeeper" });
  });

  it("does not release anything when the confirmation is declined", async () => {
    load([sub("1")]);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByLabelText("Select Q-1"));
    fireEvent.click(screen.getByLabelText("Select Q-1"));
    fireEvent.click(screen.getByRole("button", { name: /Release selected/ }));
    expect(mocks.approve).not.toHaveBeenCalled();
  });

  it("filters by account or quote number", async () => {
    load([sub("1"), sub("2")]);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByText("Q-1"));
    fireEvent.change(screen.getByPlaceholderText(/Account or quote number/), { target: { value: "customer 2" } });
    expect(screen.queryByText("Q-1")).not.toBeInTheDocument();
    expect(screen.getByText("Q-2")).toBeInTheDocument();
  });

  it("opens a capture for review and an order into its drawer", async () => {
    load([sub("1")], [cap]);
    show();
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(mocks.navigate).toHaveBeenCalledWith("/admin/orders/rx-capture?job=c1");
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByText("Q-1"));
    fireEvent.click(screen.getByText("Q-1"));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText("Q-1")).toBeInTheDocument();
    fireEvent.mouseDown(within(drawer).getByRole("tab", { name: "Timeline" }));
    await waitFor(() => expect(within(drawer).getByText(/submission pending review/)).toBeInTheDocument());
  });

  it("does not email the customer on release unless the switch is on", async () => {
    load([sub("1")]);
    mocks.approve.mockResolvedValue(undefined);
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByRole("button", { name: /^Release$/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Release$/ }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalled());
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("emails the customer after release when the switch is on", async () => {
    load([sub("1")]);
    mocks.approve.mockResolvedValue(undefined);
    mocks.email.mockResolvedValue("sent");
    show();
    fireEvent.click(screen.getByRole("switch", { name: /Email customer when released/ }));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Ready to release/ }));
    await waitFor(() => screen.getByRole("button", { name: /^Release$/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Release$/ }));
    await waitFor(() => expect(mocks.email).toHaveBeenCalledWith("1", "released"));
  });

  it("offers released / shipped emails for a released order in its drawer", async () => {
    load([sub("1", { status: "submitted", lab_status: "In production" })]);
    mocks.email.mockResolvedValue("sent");
    show();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /At lab/ }));
    await waitFor(() => screen.getByText("Q-1"));
    fireEvent.click(screen.getByText("Q-1"));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: /Email customer: shipped/ }));
    await waitFor(() => expect(mocks.email).toHaveBeenCalledWith("1", "shipped"));
  });
});
