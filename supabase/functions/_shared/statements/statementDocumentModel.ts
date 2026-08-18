export const STATEMENT_PDF_TEMPLATE_VERSION = "statement-print-v1";
export const STATEMENT_PAGE_ROWS = { first: 14, continuation: 30, final: 18 } as const;

export type StatementDocumentStatement = {
  id: string | number;
  statement_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  opening_balance?: number | null;
  transactions?: number | null;
  closing_balance?: number | null;
  payments?: number | null;
  finance_charges?: number | null;
  discount?: number | null;
  discounts_allowance?: number | null;
  allowance?: number | null;
  aging_amount_1?: number | null;
  aging_amount_2?: number | null;
  aging_amount_3?: number | null;
  aging_amount_4?: number | null;
  due_date?: string | null;
  void?: boolean | null;
};

export type StatementDocumentLine = {
  id?: string | number | null;
  order_type_name?: string | null;
  invoice_id?: number | null;
  reference?: string | null;
  patient?: string | null;
  post_date?: string | null;
  amount?: number | null;
};

export function paginateStatementLines<T>(lines: T[]): T[][] {
  if (lines.length <= STATEMENT_PAGE_ROWS.first) return [lines];
  const pages = [lines.slice(0, STATEMENT_PAGE_ROWS.first)];
  let remaining = lines.slice(STATEMENT_PAGE_ROWS.first);
  while (remaining.length > STATEMENT_PAGE_ROWS.final) {
    const count = Math.min(STATEMENT_PAGE_ROWS.continuation, remaining.length - STATEMENT_PAGE_ROWS.final);
    pages.push(remaining.slice(0, count));
    remaining = remaining.slice(count);
  }
  pages.push(remaining);
  return pages;
}

export function statementTransactionDetail(line: StatementDocumentLine): string {
  return line.reference?.trim() || line.patient?.trim() || (line.invoice_id ? `Invoice #${line.invoice_id}` : "Statement item");
}

export function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
