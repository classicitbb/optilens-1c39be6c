import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "@/pages/admin/OrdersPage";
import { requestLiveData } from "@/lib/liveDataGateway";
import {
  labOrderMatches, shipmentCustomers, shipmentIsOpen, shipmentMatches, shippingMethodLabel,
  type AllLabOrdersResponse, type AllShipmentsResponse, type LabOrder, type Shipment,
} from "@/features/admin-live-orders/liveOrders";

vi.mock("@/lib/liveDataGateway", () => ({ requestLiveData: vi.fn() }));
vi.mock("@/hooks/useAdminOrders", () => ({
  useAdminOrders: () => ({
    orders: [{ id: "abcdef12-0000", userId: "u", status: "pending", totalAmount: 10, checkoutMethod: "on_account", customerName: "Web Customer", contactEmail: "w@example.com", contactPhone: null, createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z", paymentStatus: null, paymentProvider: null }],
    loading: false, fetchOrders: vi.fn(), approvePayment: vi.fn(),
  }),
}));
vi.mock("@/components/admin/OrderDetailDialog", () => ({ default: () => null }));
vi.mock("@/components/admin/AdminPageHeader", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

const labOrders: LabOrder[] = [
  { rx_number: "RX-100", patient: "Ada Lovelace", received_at: "2026-11-10T10:00:00Z", promise_date: "2026-11-17T10:00:00Z", status_name: "Surfacing", account_number: "A1", customer_name: "Acme Optical" },
  { rx_number: "RX-200", patient: "Bob Byron", received_at: "2026-11-11T10:00:00Z", status_name: "Coating", account_number: "B2", customer_name: "Bay Vision" },
];
const shipments: Shipment[] = [
  {
    shipment_session_id: "11111111-aaaa", source_shipment_id: 501, started_at: "2026-11-12T08:00:00Z", closed_at: null, tracking_number: null, shipping_method_name: "1 Tia Lewis", item_count: 2,
    orders: [
      { order_id: 9001, rx_number: "RX-100", patient: "Ada Lovelace", quantity: 1, status_name: "Ready", customer_name: "Acme Optical", account_number: "A1" },
      { order_id: 9002, rx_number: "RX-200", patient: "Bob Byron", quantity: 1, status_name: "Ready", customer_name: "Bay Vision", account_number: "B2" },
    ],
  },
  {
    shipment_session_id: "22222222-bbbb", source_shipment_id: 490, started_at: "2026-11-05T08:00:00Z", closed_at: "2026-11-06T16:00:00Z", tracking_number: "TRK-77", shipping_method_name: "2 DHL", item_count: 1,
    orders: [{ order_id: 8001, rx_number: "RX-050", patient: "Cy Cove", quantity: 1, status_name: "Shipped", customer_name: "Cove Eyes", account_number: "C3" }],
  },
];

const respond = (labs: Partial<AllLabOrdersResponse> = {}, ships: Partial<AllShipmentsResponse> = {}) => {
  vi.mocked(requestLiveData).mockImplementation((async (operation: string) =>
    operation === "innovations.all_orders"
      ? { orders: labOrders, retrieved_at: "2026-11-13T09:00:00Z", ...labs }
      : { deliveries: shipments, retrieved_at: "2026-11-13T09:00:00Z", ...ships }) as typeof requestLiveData);
};

const renderPage = (path = "/admin/orders") => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><OrdersPage /></MemoryRouter>
  </QueryClientProvider>,
);
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => { vi.mocked(requestLiveData).mockReset(); respond(); });

describe("live order helpers", () => {
  it("searches lab orders by Rx, patient, customer, account and status", () => {
    expect(labOrderMatches(labOrders[0], "rx-100")).toBe(true);
    expect(labOrderMatches(labOrders[0], "lovelace")).toBe(true);
    expect(labOrderMatches(labOrders[0], "acme")).toBe(true);
    expect(labOrderMatches(labOrders[0], "a1")).toBe(true);
    expect(labOrderMatches(labOrders[0], "surfac")).toBe(true);
    expect(labOrderMatches(labOrders[1], "ada")).toBe(false);
  });

  it("searches shipments by number, tracking, method and the contents' customer, Rx and patient", () => {
    expect(shipmentMatches(shipments[0], "501")).toBe(true);
    expect(shipmentMatches(shipments[0], "tia")).toBe(true);
    expect(shipmentMatches(shipments[0], "bay vision")).toBe(true);
    expect(shipmentMatches(shipments[1], "trk-77")).toBe(true);
    expect(shipmentMatches(shipments[1], "ada")).toBe(false);
  });

  it("reports open shipments, distinct customers and tidy method names", () => {
    expect(shipments.map(shipmentIsOpen)).toEqual([true, false]);
    expect(shipmentCustomers(shipments[0])).toEqual(["Acme Optical", "Bay Vision"]);
    expect(shippingMethodLabel("1 Tia Lewis")).toBe("Tia Lewis");
  });
});

describe("admin orders live tabs", () => {
  it("shows web orders first and asks the lab for nothing until a live tab is opened", () => {
    renderPage();
    expect(screen.getByText("Web Customer")).toBeInTheDocument();
    expect(requestLiveData).not.toHaveBeenCalled();
  });

  it("lists every customer's active lab orders and narrows them with search", async () => {
    renderPage("/admin/orders?tab=active-rx");
    expect(await screen.findByText("RX-100")).toBeInTheDocument();
    expect(screen.getByText("RX-200")).toBeInTheDocument();
    expect(screen.getByText("Acme Optical")).toBeInTheDocument();
    expect(requestLiveData).toHaveBeenCalledWith("innovations.all_orders", { status_scope: "active" }, expect.anything());
    expect(screen.getByRole("tab", { name: /Active Rx/ })).toHaveTextContent("2");

    fireEvent.change(screen.getByPlaceholderText(/Search name, email/), { target: { value: "bay" } });
    expect(screen.queryByText("RX-100")).not.toBeInTheDocument();
    expect(screen.getByText("RX-200")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Active Rx/ })).toHaveTextContent("1");
  });

  it("explains when the lab connector can't share live orders", async () => {
    respond({ orders: [], source_status: "offline", fallback: true });
    renderPage("/admin/orders?tab=active-rx");
    expect(await screen.findByText(/Live lab status isn.t available/)).toBeInTheDocument();
  });

  it("lists open and closed shipments with their customers, and shows contents on click", async () => {
    renderPage("/admin/orders?tab=shipments");
    expect(await screen.findByText("#501")).toBeInTheDocument();
    expect(screen.getByText("#490")).toBeInTheDocument();
    expect(screen.getByText("Acme Optical +1 more")).toBeInTheDocument();
    expect(requestLiveData).toHaveBeenCalledWith("optilens.all_deliveries", expect.objectContaining({ include_open: true }), expect.anything());
    expect(screen.getByRole("tab", { name: /Shipments/ })).toHaveTextContent("1");

    expect(screen.queryByText("9001")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("#501"));
    expect(screen.getByText("9001")).toBeInTheDocument();
    expect(screen.getByText("9002")).toBeInTheDocument();
  });

  it("applies the shared search to shipments", async () => {
    renderPage("/admin/orders?tab=shipments");
    await screen.findByText("#501");
    fireEvent.change(screen.getByPlaceholderText(/Search name, email/), { target: { value: "cy cove" } });
    expect(screen.queryByText("#501")).not.toBeInTheDocument();
    expect(screen.getByText("#490")).toBeInTheDocument();
  });

  it("switches tabs from the tab list", async () => {
    renderPage();
    openTab(/Shipments/);
    await waitFor(() => expect(screen.getByText("#501")).toBeInTheDocument());
    expect(screen.queryByText("Web Customer")).not.toBeInTheDocument();
  });
});
