import { describe, expect, it } from "vitest";
import { resolveStockOrderAnnotationTarget } from "@/pages/admin/stock-order-annotations";

describe("resolveStockOrderAnnotationTarget", () => {
  it("identifies an individual field instead of its annotatable card", () => {
    document.body.innerHTML = `
      <section data-annotatable>
        <div class="field"><label>Order reference</label><input placeholder="e.g. counter sale, phone order" /></div>
      </section>
    `;

    const input = document.querySelector("input")!;
    const target = resolveStockOrderAnnotationTarget(input);

    expect(target.element).toBe(input.closest(".field"));
    expect(target.label).toBe("Order reference");
  });
});
