import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ShipmentCostingCoverSheet from "@/pages/admin/costings/ShipmentCostingCoverSheet";

const props = {
  shipmentNumber: "INV-101",
  supplier: "Example Supplier",
  reference: "PO-101",
  receivedOn: "2026-09-15",
  currency: "USD",
  invoiceBbd: 240,
  freightBbd: 100,
  charityAllocationBbd: 10,
  invoicePlusFreightBbd: 340,
  fxfBbd: 4.8,
  otherChargesBbd: 20,
  totalLandedBbd: 374.8,
  multiplier: 1.68,
  status: "draft",
} as const;

describe("ShipmentCostingCoverSheet", () => {
  it("shows the invoice basis, fee and landed total on the printable sheet", () => {
    render(<ShipmentCostingCoverSheet {...props} freightProvider="dhl" />);
    expect(screen.getByText("Supplier invoice total").parentElement).toHaveTextContent("BBD 240.00");
    expect(screen.getByText("Invoice + insurance & freight").parentElement).toHaveTextContent("BBD 340.00");
    expect(screen.getByText("Foreign exchange fee").parentElement).toHaveTextContent("BBD 4.80");
    expect(screen.getByText("Current total landed").parentElement).toHaveTextContent("BBD 374.80");
  });

  it("shows the existing DHL charity contribution immediately after freight", () => {
    render(<ShipmentCostingCoverSheet {...props} freightProvider="dhl" />);

    const freight = screen.getByText("Insurance & freight");
    const charity = screen.getByText("DHL charity contribution (10% of insurance & freight)");
    expect(freight.compareDocumentPosition(charity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(charity.parentElement).toHaveTextContent("BBD 10.00");
  });

  it("does not show a charity contribution for non-DHL freight", () => {
    render(<ShipmentCostingCoverSheet {...props} freightProvider="non-dhl" charityAllocationBbd={0} />);

    expect(screen.queryByText("DHL charity contribution (10% of insurance & freight)")).not.toBeInTheDocument();
  });
});
