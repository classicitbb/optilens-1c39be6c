import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import PublishedLinkPanel from "@/features/admin/walk-in-payments/PublishedLinkPanel";
import PayPage from "@/pages/PayPage";

const { resolveWalkInPayment, startWalkInPayment, redirectToScotiaPayment } = vi.hoisted(() => ({
  resolveWalkInPayment: vi.fn(),
  startWalkInPayment: vi.fn(),
  redirectToScotiaPayment: vi.fn(),
}));

vi.mock("@/components/seo/Seo", () => ({ default: () => null }));
vi.mock("@/lib/payments/walkInPay", () => ({
  fetchWalkInPaySettings: async () => ({ selfServeEnabled: false }),
  formatWalkInAmount: () => "BBD 25.00",
  resolveWalkInPayment,
  startWalkInPayment,
}));
vi.mock("@/lib/payments/scotiaConnect", () => ({ redirectToScotiaPayment }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it("opens a copied payment link without a code and starts the gateway only after Pay", async () => {
  const writeText = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", Object.create(window.navigator, { clipboard: { value: { writeText } } }));
  const { unmount } = render(
    <PublishedLinkPanel
      token="sample-token"
      claimCode="4K7P2M"
      expiresAt={new Date(Date.now() + 60_000).toISOString()}
      amountLabel="BBD 25.00"
      customerName="Sample Customer"
      onCancel={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Copy payment link" }));
  await screen.findByRole("button", { name: "Payment link copied" });
  expect(writeText).toHaveBeenCalledOnce();
  const link = new URL(writeText.mock.calls[0][0]);
  expect(link.pathname + link.search).toBe("/pay?token=sample-token");
  unmount();

  resolveWalkInPayment.mockResolvedValue({
    customerName: "Sample Customer",
    amount: 25,
    currency: "052",
    reason: null,
    hasEmail: false,
  });
  const prepared = { gatewayUrl: "https://gateway.example", formParams: {} };
  startWalkInPayment.mockResolvedValue(prepared);

  render(
    <MemoryRouter initialEntries={[link.pathname + link.search]}>
      <PayPage />
    </MemoryRouter>,
  );

  const pay = await screen.findByRole("button", { name: "Pay BBD 25.00" });
  expect(resolveWalkInPayment).toHaveBeenCalledWith({ token: "sample-token" });
  expect(screen.queryByRole("button", { name: "I have a code" })).toBeNull();
  expect(startWalkInPayment).not.toHaveBeenCalled();
  fireEvent.click(pay);
  await waitFor(() => expect(redirectToScotiaPayment).toHaveBeenCalledWith(prepared));
  expect(startWalkInPayment).toHaveBeenCalledWith({ token: "sample-token" }, undefined);
});

it("shows the selected expiry and disables copying an expired link", () => {
  const expiresAt = new Date(Date.now() + 2 * 86400000).toISOString();
  const props = {
    token: "sample-token",
    claimCode: "4K7P2M",
    amountLabel: "BBD 25.00",
    customerName: "Sample Customer",
    onCancel: vi.fn(),
  };

  const { container, unmount } = render(<PublishedLinkPanel {...props} expiresAt={expiresAt} />);
  expect(container.querySelector("time")?.dateTime).toBe(expiresAt);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Copy payment link" }).disabled).toBe(false);
  unmount();

  render(<PublishedLinkPanel {...props} expiresAt={new Date(Date.now() - 1000).toISOString()} />);
  expect(screen.getByText("This payment link and code have expired. Publish a new link.")).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Copy payment link" }).disabled).toBe(true);
});
