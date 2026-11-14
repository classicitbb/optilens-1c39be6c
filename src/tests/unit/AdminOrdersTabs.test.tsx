import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import OrdersPage from "@/pages/admin/OrdersPage";
import { rxBucket, rxItemMatches, type WorkspaceItem } from "@/features/rx-order/workspace/classify";

const base = { source: "form", provider: "innovations", accountId: 1, quoteId: null, createdAt: "2026-11-10T10:00:00Z" } as const;
const item = (over: Partial<WorkspaceItem> & { key: string }): WorkspaceItem =>
  ({ ...base, kind: "submission", tab: "lab", accountName: "Acme Optical", quoteNumber: "RX-1", status: "submitted", ...over }) as WorkspaceItem;

const rxItems: WorkspaceItem[] = [
  item({ key: "a", quoteNumber: "RX-100", accountName: "Acme Optical", patientName: "Ada Lovelace", tab: "lab", submission: { lab_status: "Surfacing" } as never }),
  item({ key: "b", quoteNumber: "RX-200", accountName: "Bay Vision", tab: "ready", status: "pending_review" }),
  item({ key: "c", quoteNumber: "RX-300", accountName: "Acme Optical", tab: "done", submission: { lab_status: "Delivered" } as never }),
  item({ key: "d", quoteNumber: "RX-400", accountName: "Cove Eyes", tab: "done", status: "cancelled" }),
];

vi.mock("@/hooks/useAdminOrders", () => ({
  useAdminOrders: () => ({
    orders: [{ id: "abcdef12-0000", userId: "u", status: "pending", totalAmount: 10, checkoutMethod: "on_account", customerName: "Web Customer", contactEmail: "w@example.com", contactPhone: null, createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z", paymentStatus: null, paymentProvider: null }],
    loading: false, fetchOrders: vi.fn(), approvePayment: vi.fn(),
  }),
}));
vi.mock("@/features/rx-order/workspace/useRxWorkspace", () => ({
  useRxWorkspace: () => ({ items: rxItems, isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock("@/features/rx-order/workspace/RxOrderDrawer", () => ({ RxOrderDrawer: () => null }));
vi.mock("@/components/admin/OrderDetailDialog", () => ({ default: () => null }));
vi.mock("@/components/admin/AdminPageHeader", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

const renderPage = (path = "/admin/orders") => render(<MemoryRouter initialEntries={[path]}><OrdersPage /></MemoryRouter>);
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("rx buckets and search", () => {
  it("separates active, shipped and cancelled Rx work", () => {
    expect(rxItems.map(rxBucket)).toEqual(["active", "active", "shipped", "cancelled"]);
  });

  it("matches patient, account, quote number and lab status", () => {
    expect(rxItemMatches(rxItems[0], "ada")).toBe(true);
    expect(rxItemMatches(rxItems[0], "surfac")).toBe(true);
    expect(rxItemMatches(rxItems[1], "bay")).toBe(true);
    expect(rxItemMatches(rxItems[1], "rx-100")).toBe(false);
  });
});

describe("admin orders tabs", () => {
  it("shows web orders first with counts for every category", () => {
    renderPage();
    expect(screen.getByText("Web Customer")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Active Rx/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: /Shipped Rx/ })).toHaveTextContent("1");
  });

  it("lists every customer's active Rx orders and filters by stage", () => {
    renderPage("/admin/orders?tab=active-rx");
    expect(screen.getByText("RX-100")).toBeInTheDocument();
    expect(screen.getByText("RX-200")).toBeInTheDocument();
    expect(screen.queryByText("RX-300")).not.toBeInTheDocument();
    expect(screen.queryByText("RX-400")).not.toBeInTheDocument();
  });

  it("lists shipped Rx orders and keeps cancelled ones behind the outcome filter", () => {
    renderPage("/admin/orders?tab=shipped-rx");
    expect(screen.getByText("RX-300")).toBeInTheDocument();
    expect(screen.queryByText("RX-400")).not.toBeInTheDocument();
    expect(screen.queryByText("RX-100")).not.toBeInTheDocument();
  });

  it("applies the shared search to Rx tabs and updates the counts", () => {
    renderPage("/admin/orders?tab=active-rx");
    fireEvent.change(screen.getByPlaceholderText(/Search name, email/), { target: { value: "ada" } });
    expect(screen.getByText("RX-100")).toBeInTheDocument();
    expect(screen.queryByText("RX-200")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Active Rx/ })).toHaveTextContent("1");
  });

  it("switches tabs from the tab list", () => {
    renderPage();
    openTab(/Shipped Rx/);
    expect(screen.getByText("RX-300")).toBeInTheDocument();
    expect(screen.queryByText("Web Customer")).not.toBeInTheDocument();
  });
});
