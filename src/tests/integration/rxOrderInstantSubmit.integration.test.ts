// Instant submission for credit-approved accounts.
//
// A credit-approved practice has nothing to settle at checkout, so the cart is
// ceremony: the form already knows the job, the delivery method and the
// account to bill. Those accounts submit straight to the lab; everyone else
// keeps the cart, because for them checkout is where payment actually happens.
//
// The privilege is decided in two places on purpose. The form asks the surface
// (ADAPTER.canSubmitDirect) only to decide what to OFFER; place_rx_order_direct()
// re-checks it in SQL against the credit_approved contact tag, so nothing here
// is load-bearing for security — these tests cover the offer, not the grant.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountRxOrder } from "@/tests/support/rxOrderHarness";

const directAdapter = (over: Record<string, unknown> = {}) => ({
  canSubmitDirect: true,
  onSubmittedDirect: vi.fn().mockResolvedValue(undefined),
  onSubmitted: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe("instant submit for credit-approved accounts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("what the form offers", () => {
    it("keeps the cart wording for an account without credit", () => {
      const h = mountRxOrder({ canSubmitDirect: false, onSubmitted: vi.fn() }).fillValidOrder();

      expect(h.field("#submitBtn")?.textContent).toBe("Submit to cart");
      expect(h.field("#directNote")?.classList.contains("hide")).toBe(true);

      h.destroy();
    });

    it("offers to place the order outright on a credit-approved account", () => {
      const h = mountRxOrder(directAdapter()).fillValidOrder();

      expect(h.field("#submitBtn")?.textContent).toBe("Place order now");
      expect(h.field("#submitBtn2")?.textContent).toBe("Place order now");
      expect(h.field("#directNote")?.classList.contains("hide")).toBe(false);
      expect(h.field("#directNote")?.textContent).toContain("credit-approved");

      h.destroy();
    });

    it("falls back to the cart when the surface cannot actually place orders", () => {
      // canSubmitDirect on its own is not enough — without the handler there is
      // nothing to call, and offering a button that cannot work is worse than
      // not offering it.
      const h = mountRxOrder({ canSubmitDirect: true, onSubmitted: vi.fn() }).fillValidOrder();

      expect(h.field("#submitBtn")?.textContent).toBe("Submit to cart");

      h.destroy();
    });

    it("still refuses to submit an incomplete order", () => {
      const h = mountRxOrder(directAdapter()).fillValidOrder({ patient: { last: "" } });

      expect(h.field("#submitBtn")?.textContent).toBe("Place order now");
      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });

    it("still refuses to submit an unpriced lens", () => {
      const adapter = directAdapter();
      const h = mountRxOrder({ ...adapter, lensPrice: () => null }).fillValidOrder();

      expect(h.submitEnabled()).toBe(false);

      h.destroy();
    });
  });

  describe("which path a submit takes", () => {
    it("places the order and never touches the cart for a credit account", async () => {
      const adapter = directAdapter();
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(adapter.onSubmittedDirect).toHaveBeenCalledTimes(1));

      expect(adapter.onSubmitted).not.toHaveBeenCalled();
      // The payload handed over is the same bundle a cart submit would carry.
      const payload = (adapter.onSubmittedDirect as any).mock.calls[0][0];
      expect(payload.schema).toBe("cv.rxorder/1");
      expect(payload.patient.first).toBe("MARCUS");

      h.destroy();
    });

    it("uses the cart for an account without the privilege", async () => {
      const adapter = directAdapter({ canSubmitDirect: false });
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(adapter.onSubmitted).toHaveBeenCalledTimes(1));

      expect(adapter.onSubmittedDirect).not.toHaveBeenCalled();

      h.destroy();
    });
  });

  describe("confirmation", () => {
    it("tells a credit account the order is placed, not carted", async () => {
      const adapter = directAdapter();
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(h.field("#scrim")?.classList.contains("on")).toBe(true));

      expect(h.host.querySelector("#scrim .mhead h2")?.textContent).toBe("Order placed");
      expect(h.host.querySelector("#scrim .mhead p")?.textContent).toContain("billed to your account");

      h.destroy();
    });

    it("hides checkout and duplicate, which mean nothing once an order is placed", async () => {
      const adapter = directAdapter();
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(h.field("#scrim")?.classList.contains("on")).toBe(true));

      const hidden = (next: string) =>
        h.host.querySelector(`#scrim .choice[data-next="${next}"]`)?.classList.contains("hide");
      expect(hidden("checkout")).toBe(true);
      expect(hidden("duplicate")).toBe(true);
      expect(hidden("another")).toBe(false);

      h.destroy();
    });

    it("keeps checkout available on the cart path", async () => {
      const adapter = directAdapter({ canSubmitDirect: false });
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(h.field("#scrim")?.classList.contains("on")).toBe(true));

      expect(h.host.querySelector("#scrim .mhead h2")?.textContent).toBe("Added to your cart");
      expect(h.host.querySelector('#scrim .choice[data-next="checkout"]')?.classList.contains("hide")).toBe(false);

      h.destroy();
    });
  });

  describe("failure", () => {
    it("does not claim success when the order could not be placed", async () => {
      const adapter = directAdapter({
        onSubmittedDirect: vi.fn().mockRejectedValue(new Error("Instant Rx submission is only available on credit-approved accounts.")),
      });
      const h = mountRxOrder(adapter).fillValidOrder();

      h.field<HTMLButtonElement>("#submitBtn")?.click();
      await vi.waitFor(() => expect(adapter.onSubmittedDirect).toHaveBeenCalled());

      expect(h.field("#scrim")?.classList.contains("on")).toBe(false);

      h.destroy();
    });
  });
});
