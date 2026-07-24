import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatementPrintDocument } from "@/components/account/sections/StatementPrintDocument";

const statement = {
  id: "4250",
  statement_date: "2026-06-30",
  period_start: "2026-06-01",
  period_end: "2026-06-30",
  opening_balance: 680.04,
  transactions: 1254.92,
  closing_balance: 1734.96,
  payments: 325,
  finance_charges: 0,
  discounts_allowance: 0,
  aging_amount_1: 0,
  aging_amount_2: 499.53,
  aging_amount_3: 0,
  aging_amount_4: 865.25,
  due_date: "2026-07-30",
};

describe("StatementPrintDocument", () => {
  it("renders a real multi-page statement with repeated headers and numbered footers", () => {
    const lines = Array.from({ length: 65 }, (_, index) => ({
      id: index + 1,
      order_type_name: "Rx",
      invoice_id: index + 1000,
      reference: `Reference ${index + 1}`,
      patient: `Patient ${index + 1}`,
      post_date: "2026-06-30",
      amount: index % 3 === 0 ? -25 : 50,
    }));

    const { container } = render(<StatementPrintDocument statement={statement} lines={lines} customerName="Retail" accountNumber="RETAIL" />);

    expect(container.querySelectorAll(".statement-document-page")).toHaveLength(4);
    expect(container.querySelectorAll(".statement-transactions tbody tr")).toHaveLength(66);
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
    expect(screen.getByText("Bank Transfer Information")).toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeNull();
  });
});
