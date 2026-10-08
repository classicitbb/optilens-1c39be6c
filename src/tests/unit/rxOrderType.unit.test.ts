import { describe, expect, it } from "vitest";
import { ORDER_TYPES, SERVICE_REQUEST_TAG, stageFor } from "@/features/rx-order/form/orderType";
import type { StageOrderItem } from "@/hooks/useStockOrderBuilder";

const item = (customer_ref: string): StageOrderItem => ({
  product_type: "lens", product_id: "p1", variant_id: "v1", side: "right", quantity: 2, customer_ref,
});

describe("order types", () => {
  it("offers Rx first, then stock/supplies, then service request", () => {
    expect(ORDER_TYPES.map((t) => t.id)).toEqual(["rx", "stock", "service"]);
  });

  it("leaves a stock order untouched", () => {
    const input = { instructions: "Deliver Monday", items: [item("")] };
    expect(stageFor("stock", input)).toEqual(input);
  });

  it("marks a service request on the order and on every item", () => {
    const out = stageFor("service", { instructions: "Frame to be collected", items: [item(""), item("Left arm")] });
    expect(out.instructions).toBe(`${SERVICE_REQUEST_TAG} - Frame to be collected`);
    expect(out.items.map((i) => i.customer_ref)).toEqual([SERVICE_REQUEST_TAG, `${SERVICE_REQUEST_TAG} - Left arm`]);
    expect(out.items[0]).toMatchObject({ product_id: "p1", variant_id: "v1", side: "right", quantity: 2 });
  });

  it("does not stack the marker when staged again", () => {
    const once = stageFor("service", { instructions: "", items: [item("")] });
    const twice = stageFor("service", once);
    expect(twice).toEqual(once);
    expect(once.instructions).toBe(SERVICE_REQUEST_TAG);
  });

  it("never puts a colon in the marker (the lab file writer strips them)", () => {
    expect(SERVICE_REQUEST_TAG).not.toContain(":");
  });
});
