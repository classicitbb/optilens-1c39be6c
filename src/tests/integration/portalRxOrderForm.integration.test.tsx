// The portal Rx order form's own wiring and its two refusals.
//
// PortalRxOrderForm is what a customer reaches from My Account and the
// standalone order route, and it is the second of the two live Rx paths (the
// other is /admin/orders/rx/new). Nothing mounted it before this file, so the
// decisions it makes on the customer's behalf — which account the order is
// locked to, whether prices are visible, whether it may go straight onto the
// account instead of the cart, and when it must refuse to open at all — were
// uncovered.
//
// The form itself is already covered (rxFormReact / rxFormKeyboard /
// rxFormShape / rxFormPersist / rxFormHashrefFidelity), so RxForm is stubbed to
// capture the props it is handed. That keeps this test about the portal's
// wiring, which is the part nothing else exercises.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const state = vi.hoisted(() => ({
  identity: { crmCustomerId: 776, paymentTerms: "credit" } as Record<string, unknown> | null,
  identityLoading: false,
  isStaff: false,
  features: new Set<string>(["order-prices"]),
  draft: undefined as unknown,
  order: undefined as any,
  orderFetched: true,
  canEdit: true,
  props: null as any,
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    identity: state.identity,
    isLoading: state.identityLoading,
    isStaff: state.isStaff,
    canAccessFeature: (f: string) => state.features.has(f),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock("@/features/lens-assistant/api", () => ({
  useRxDraft: () => ({ data: state.draft, isFetched: true, isError: false }),
  isEmbeddedRxOrderPayload: () => false,
  resolveResumedRxDraftId: (id?: string) => id ?? null,
}));

vi.mock("@/features/rx-order/orders/api", () => ({
  useMyRxOrder: () => ({ data: state.order, isFetched: state.orderFetched, isError: false }),
}));

vi.mock("@/features/rx-order/orders/lifecycle", () => ({
  rxActions: () => ({ edit: state.canEdit }),
  reorderPayload: (payload: any, kind: string) => ({ ...payload, reorderedAs: kind }),
}));

vi.mock("@/features/rx-order/prefill/rxOrderPrefill", () => ({
  buildPrefillBanner: () => "banner",
  buildRxPrefillPayload: () => ({ fromDraft: true }),
}));

// Capture what the portal hands the form instead of rendering the real one.
vi.mock("@/features/rx-order/form/RxForm", () => ({
  default: (props: any) => {
    state.props = props;
    return <div data-testid="rx-form" />;
  },
}));

import PortalRxOrderForm from "@/features/rx-order/PortalRxOrderForm";

const open = (path = "/profile/orders/rx/new") => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PortalRxOrderForm />
    </MemoryRouter>,
  );
};

const released = () => ({
  rx_order_number: 80000123,
  payload: { schema: "cv.rxorder/1" },
});

beforeEach(() => {
  state.identity = { crmCustomerId: 776, paymentTerms: "credit" };
  state.identityLoading = false;
  state.isStaff = false;
  state.features = new Set(["order-prices"]);
  state.draft = undefined;
  state.order = undefined;
  state.orderFetched = true;
  state.canEdit = true;
  state.props = null;
});

describe("the portal Rx order form", () => {
  it("locks the order to the customer's own trading account", () => {
    open();
    expect(screen.getByTestId("rx-form")).toBeTruthy();
    expect(state.props.lockedAccountId).toBe(776);
    expect(state.props.surface).toBe("portal");
    // no quote exists until the first real save, so opening the form leaves nothing behind
    expect(state.props.quoteId).toBeNull();
  });

  it("will not let an unlinked customer order at all", () => {
    state.identity = { crmCustomerId: null, paymentTerms: "prepaid" };
    open();
    expect(screen.queryByTestId("rx-form")).toBeNull();
    expect(screen.getByText(/isn't linked to a trading account/i)).toBeTruthy();
  });

  it("sends a credit customer's order straight to their account, but never a staff member's", () => {
    open();
    expect(state.props.allowDirectSubmit).toBe(true);

    state.identity = { crmCustomerId: 776, paymentTerms: "prepaid" };
    open();
    expect(state.props.allowDirectSubmit).toBe(false);

    // Staff ordering from the portal surface still go through the cart, where the
    // account being billed is an explicit choice.
    state.identity = { crmCustomerId: 776, paymentTerms: "credit" };
    state.isStaff = true;
    open();
    expect(state.props.allowDirectSubmit).toBe(false);
  });

  it("hides prices from an account that is not allowed to see them", () => {
    state.features = new Set();
    open();
    expect(state.props.pricesVisible).toBe(false);

    state.features = new Set(["order-prices"]);
    open();
    expect(state.props.pricesVisible).toBe(true);
  });

  it("refuses to reopen an order that has already gone to the lab", () => {
    state.order = released();
    state.canEdit = false;
    open("/profile/orders/rx/new?edit=quote-9");
    expect(screen.queryByTestId("rx-form")).toBeNull();
    expect(screen.getByText(/already been released to the lab/i)).toBeTruthy();
  });

  it("reopens an order that is still editable, against its existing quote", () => {
    state.order = released();
    state.canEdit = true;
    open("/profile/orders/rx/new?edit=quote-9");
    expect(screen.getByTestId("rx-form")).toBeTruthy();
    expect(state.props.quoteId).toBe("quote-9");
    expect(state.props.prefill).toMatchObject({ schema: "cv.rxorder/1" });
  });

  it("starts a reorder from a past order without reusing its quote", () => {
    state.order = released();
    open("/profile/orders/rx/new?from=quote-9&as=reorder");
    expect(state.props.prefill).toMatchObject({ reorderedAs: "reorder" });
    // a reorder is a NEW order; reusing the old quote would overwrite history
    expect(state.props.quoteId).toBeNull();
    expect(String(state.props.prefillBanner)).toMatch(/Reorder of Rx order/i);
  });

  it("marks a remake as a remake, not a plain reorder", () => {
    state.order = released();
    open("/profile/orders/rx/new?from=quote-9&as=remake");
    expect(state.props.prefill).toMatchObject({ reorderedAs: "remake" });
    expect(String(state.props.prefillBanner)).toMatch(/Remake \/ warranty/i);
  });

  it("waits rather than rendering an empty form while identity is still loading", () => {
    state.identityLoading = true;
    open();
    expect(screen.queryByTestId("rx-form")).toBeNull();
    expect(screen.getByText(/Preparing your Rx order/i)).toBeTruthy();
  });
});
