import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PricelistAdjustmentSaveDialog } from "@/components/admin/PricelistAdjustmentSaveDialog";
import { pricelistAdjustmentSignature } from "@/features/pricelists/pricelistAdjustmentSave";

const version = { markup_percent: 0, discount_percent: 0, master_markup_percent: 0, master_discount_percent: 0 };
const children = [
  { section_type: "RX Lens Prices", child_markup_percent: 0, child_discount_percent: 0 },
  { section_type: "Stock Lens Prices", child_markup_percent: 0, child_discount_percent: 0 },
  { section_type: "Supplies Prices", child_markup_percent: 0, child_discount_percent: 0 },
];

describe("pricelist adjustment saves", () => {
  it("treats metadata-only saves and equivalent zero values as unchanged", () => {
    const original = pricelistAdjustmentSignature({ version, childSections: children });
    const renamed = pricelistAdjustmentSignature({
      version: { ...version, markup_percent: Number("0.00") },
      childSections: [...children].reverse(),
    });
    expect(renamed).toBe(original);
  });

  it("detects a changed child adjustment", () => {
    const original = pricelistAdjustmentSignature({ version, childSections: children });
    const changed = pricelistAdjustmentSignature({
      version,
      childSections: children.map((section) => section.section_type === "Stock Lens Prices"
        ? { ...section, child_markup_percent: 5 }
        : section),
    });
    expect(changed).not.toBe(original);
  });

  it("presents preservation as the primary action and requires a separate replace-all choice", () => {
    const preserve = vi.fn();
    const replace = vi.fn();
    render(
      <PricelistAdjustmentSaveDialog
        open
        isPending={false}
        onOpenChange={vi.fn()}
        onPreserveManual={preserve}
        onReplaceAll={replace}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preserve manual prices" }));
    expect(preserve).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Replace all line prices" }));
    expect(replace).toHaveBeenCalledOnce();
  });
});
