import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LensVariantGrid from "@/components/lenses/LensVariantGrid";

describe("LensVariantGrid", () => {
  it("renders configurable labels and chiral helper text", async () => {
    const onAddSelected = vi.fn().mockResolvedValue(undefined);

    render(
      <LensVariantGrid
        rowLabel="Base"
        columnLabel="Add"
        isChiral
        variants={[
          {
            id: "v1",
            product_type: "lens",
            product_id: "p1",
            title: "Variant",
            variant_key: "k1",
            sku: null,
            opc_code: null,
            attributes: { sphere: 4, cylinder: 1 },
            metadata: {},
            price: 10,
            stock_qty: 4,
            reserved_qty: 0,
            low_stock_threshold: 1,
            allow_backorder: false,
            is_active: true,
            sort_order: 0,
          },
        ]}
        onAddSelected={onAddSelected}
      />,
    );

    expect(screen.getByText("Base \\ Add")).toBeInTheDocument();
    expect(screen.getByText(/cart will split into Left \+ Right lines/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("4.00 1.00 quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /add selected to cart/i }));

    expect(onAddSelected).toHaveBeenCalledWith([{ variantId: "v1", quantity: 2 }]);
  });
});
