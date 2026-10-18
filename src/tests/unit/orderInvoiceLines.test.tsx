import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceLines } from "@/components/account/sections/MyOrdersSection";

const renderInvoice = (amounts: Array<number | null>, invoiceTotal = 999) => render(
  <InvoiceLines invoiceQuery={{
    isLoading: false,
    isError: false,
    error: null,
    data: {
      invoice: { id: 1, total: invoiceTotal },
      lines: amounts.map((amount, index) => ({
        id: index,
        description: `Item ${index + 1}`,
        quantity: index === amounts.length - 1 ? 2 : 1,
        unit_price: amount == null ? null : amount / (index === amounts.length - 1 ? 2 : 1),
        amount,
      })),
    },
  }} />,
);

const totalRow = () => screen.getByRole("rowheader", { name: "Total (BBD)" }).closest("tr")!;

describe("order invoice line totals", () => {
  it.each([
    { amounts: [380, 20, 380, 20, 100], expected: "$900.00" },
    { amounts: [140, 0, 140, 0, 0, 0, 0], expected: "$280.00" },
    { amounts: [0, 0], expected: "$0.00" },
    { amounts: [19.99, -5.5, 0.1, 0.2], expected: "$14.79" },
    { amounts: [2.675, 1.005, -1.125], expected: "$2.54" },
  ])("totals $amounts as $expected without multiplying extended amounts again", ({ amounts, expected }) => {
    renderInvoice(amounts);
    expect(within(totalRow()).getByRole("cell")).toHaveTextContent(expected);
    expect(totalRow().parentElement?.tagName).toBe("TFOOT");
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY])("does not present a partial total when a line amount is %s", (amount) => {
    renderInvoice([380, amount]);
    expect(within(totalRow()).getByRole("cell")).toHaveTextContent("—");
  });

  it("does not show an invented total for an empty invoice", () => {
    renderInvoice([]);
    expect(screen.queryByRole("rowheader", { name: "Total (BBD)" })).not.toBeInTheDocument();
    expect(screen.getByText(/no itemized lines/)).toBeInTheDocument();
  });
});
