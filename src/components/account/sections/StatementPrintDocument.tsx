import { COMPANY_CONTACT } from "@/config/companyContact";
import { paginateStatementLines } from "./statementPrintLayout";

export interface PrintableStatement {
  id: string;
  statement_date: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  transactions: number | null;
  closing_balance: number | null;
  payments: number | null;
  finance_charges: number | null;
  discounts_allowance: number | null;
  aging_amount_1: number | null;
  aging_amount_2: number | null;
  aging_amount_3: number | null;
  aging_amount_4: number | null;
  due_date: string | null;
}

export interface PrintableStatementLine {
  id: number | null;
  order_type_name: string | null;
  invoice_id: number | null;
  reference: string | null;
  patient: string | null;
  post_date: string | null;
  amount: number | null;
}

const formatMoney = (amount: number | null | undefined) =>
  `BBD ${Number(amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", options ?? { month: "2-digit", day: "2-digit", year: "numeric" });
};

const transactionDetail = (line: PrintableStatementLine) =>
  line.reference?.trim() || line.patient?.trim() || (line.invoice_id ? `Invoice #${line.invoice_id}` : "Statement item");

export const statementPrintStyles = `
  @page { size: auto; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .statement-print-document {
    color: #0B1E35;
    font-family: "Plus Jakarta Sans", Arial, sans-serif;
  }
  .statement-document-page {
    position: relative;
    width: 198mm;
    min-height: 267mm;
    margin: 0 auto 8mm;
    padding: 0 0 13mm;
    overflow: hidden;
    background: #fff;
    break-after: page;
    page-break-after: always;
  }
  .statement-document-page:last-child { break-after: auto; page-break-after: auto; }
  .statement-document-page-content { padding: 0 6mm; }
  .statement-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 18px 14px;
    margin: 0 -6mm;
    border-bottom: 1px solid #e4e9ee;
  }
  .statement-brand { display: flex; flex-direction: column; gap: 6px; }
  .statement-lockup { display: flex; align-items: center; gap: 10px; }
  .statement-logo { width: 38px; height: 38px; flex: none; }
  .statement-brand-name { font-size: 15pt; font-weight: 800; letter-spacing: .04em; }
  .statement-brand-subtitle { margin-top: 3px; color: #1A8A9C; font-size: 6pt; font-weight: 700; letter-spacing: .28em; }
  .statement-company-details { color: #8a9aaa; font-size: 6.5pt; line-height: 1.65; }
  .statement-title { text-align: right; }
  .statement-title-kicker { color: #1A8A9C; font-size: 6pt; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
  .statement-title-word { color: rgba(11,30,53,.07); font-size: 36pt; font-weight: 800; letter-spacing: -.03em; line-height: .9; text-transform: uppercase; }
  .statement-gold-rule { height: 2px; margin: 0 -6mm; background: linear-gradient(90deg, #C89130 0%, rgba(200,145,48,.15) 100%); }
  .statement-section { margin-top: 14px; }
  .statement-section-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #1A8A9C; font-size: 6.5pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
  .statement-section-heading::after { content: ""; height: 1px; flex: 1; margin-left: 4px; background: #c9d4de; }
  .statement-meta-summary { display: grid; grid-template-columns: minmax(0, 1fr) 57mm; gap: 16px; margin-top: 16px; }
  .statement-meta { border: 1px solid #dde3ea; border-left: 3px solid #C89130; border-radius: 4px; padding: 8px 10px; background: #fafaf8; }
  .statement-meta-row { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 4px; padding: 2.5px 0; border-bottom: 1px solid #c9d4de; }
  .statement-meta-row:last-child { border-bottom: 0; }
  .statement-meta-label { color: #5a7490; font-size: 6.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .statement-meta-value { font-size: 7.5pt; font-weight: 600; overflow-wrap: anywhere; }
  .statement-summary { overflow: hidden; border: 1px solid #dde3ea; border-radius: 4px; }
  .statement-summary-heading { padding: 5px 10px; border-bottom: 1px solid #dde3ea; background: #f2f6f8; color: #1A8A9C; font-size: 6pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
  .statement-summary-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 10px; border-bottom: 1px solid #c9d4de; font-size: 7pt; }
  .statement-summary-row span:last-child { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .statement-summary-row--balance { border-bottom: 0; background: #0B1E35; color: #F4F2ED; font-weight: 700; }
  .statement-summary-row--balance span:last-child { color: #C89130; font-size: 8pt; }
  .statement-aging, .statement-transactions { width: 100%; border-collapse: collapse; border: 1px solid #dde3ea; table-layout: fixed; }
  .statement-aging th, .statement-transactions th { border-right: 1px solid #dde3ea; border-bottom: 1px solid #dde3ea; background: #f2f6f8; color: #3b5268; }
  .statement-aging th:last-child, .statement-transactions th:last-child { border-right: 0; }
  .statement-aging th { padding: 6px 5px; font-size: 6.5pt; font-weight: 700; letter-spacing: .1em; text-align: center; text-transform: uppercase; }
  .statement-aging td { padding: 7px 5px; border-right: 1px solid #dde3ea; text-align: center; font-size: 7.5pt; font-variant-numeric: tabular-nums; }
  .statement-aging td:last-child { border-right: 0; }
  .statement-aging th:last-child, .statement-aging td:last-child { color: #a83220; }
  .statement-aging td:first-child { color: #0B1E35; font-size: 8pt; font-weight: 700; }
  .statement-transactions th { padding: 6px 8px; font-size: 6.5pt; font-weight: 700; letter-spacing: .1em; text-align: left; text-transform: uppercase; }
  .statement-transactions th:nth-child(1) { width: 68px; }
  .statement-transactions th:nth-child(2) { width: 100px; }
  .statement-transactions th:nth-child(4), .statement-transactions th:nth-child(5) { width: 86px; text-align: right; }
  .statement-transactions th:nth-child(4) { color: #a83220; }
  .statement-transactions th:nth-child(5) { color: #1A8A9C; }
  .statement-transactions td { padding: 4px 8px; border-bottom: 1px solid #c9d4de; color: #0B1E35; font-size: 7pt; line-height: 1.3; overflow-wrap: anywhere; vertical-align: top; }
  .statement-transactions tr { break-inside: avoid; page-break-inside: avoid; }
  .statement-transactions tbody tr:nth-child(even) { background: #F4F2ED; }
  .statement-transactions td:first-child { color: #5a7490; white-space: nowrap; }
  .statement-transactions td:nth-child(4), .statement-transactions td:nth-child(5) { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .statement-debit { color: #c0392b !important; }
  .statement-credit { color: #1c7a52 !important; }
  .statement-new-balance td { padding: 6px 8px; border-top: 1.5px solid #dde3ea; background: #fafaf8; font-size: 7pt; font-weight: 700; }
  .statement-new-balance td:last-child { color: #C89130; font-size: 9pt; text-align: right; }
  .statement-totals { display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid #dde3ea; border-radius: 4px; }
  .statement-total-column { padding: 8px 10px; border-right: 1px solid #c9d4de; }
  .statement-total-column:last-child { border-right: 0; }
  .statement-total-row { display: flex; justify-content: space-between; gap: 4px; margin-bottom: 3px; font-size: 7pt; font-weight: 700; }
  .statement-total-row:last-child { margin-bottom: 0; }
  .statement-total-row span:first-child { color: #5a7490; font-size: 6.5pt; letter-spacing: .06em; text-transform: uppercase; }
  .statement-total-row span:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .statement-please-deduct { grid-column: 1 / -1; padding: 5px 12px; border-top: 1.5px solid #C89130; background: #fdf6e3; color: #C89130; font-size: 6.5pt; font-weight: 700; letter-spacing: .08em; text-align: right; text-transform: uppercase; }
  .statement-note { border: 1px solid #dde3ea; border-left: 3px solid #1A8A9C; border-radius: 4px; padding: 10px 14px; background: #fafaf8; color: #6b7f93; font-size: 6.5pt; line-height: 1.6; }
  .statement-note-thanks { margin-top: 6px; color: #1A8A9C; font-size: 7pt; font-style: italic; font-weight: 600; }
  .statement-bank { border: 1px solid #dde3ea; border-top: 2px solid #C89130; border-radius: 4px; padding: 8px 14px; background: #fdf6e3; color: #3b5268; font-size: 6.5pt; line-height: 1.7; }
  .statement-bank-heading { margin-bottom: 5px; color: #C89130; font-size: 5.5pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
  .statement-page-footer { position: absolute; right: 0; bottom: 0; left: 0; padding: 4px 6mm; }
  .statement-page-footer-rule { height: 1px; background: linear-gradient(90deg, transparent, #c9d4de 25%, #c9d4de 75%, transparent); }
  .statement-page-footer-content { display: flex; justify-content: space-between; gap: 8px; padding-top: 4px; color: #9aabb8; font-size: 6pt; }
  .statement-continuation { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0 8px; border-bottom: 1px solid #dde3ea; }
  .statement-continuation-title { font-size: 10pt; font-weight: 800; letter-spacing: .04em; }
  .statement-continuation-context { margin-top: 2px; color: #5a7490; font-size: 6.5pt; }
  .statement-continuation-number { color: #1A8A9C; font-size: 7pt; font-weight: 700; text-align: right; }
  @media print {
    .statement-document-page { width: 198mm; margin: 0 auto; box-shadow: none; }
  }
`;

const StatementHeader = () => (
  <>
    <header className="statement-header">
      <div className="statement-brand">
        <div className="statement-lockup">
          <img className="statement-logo" src="/ds/assets/cv_logo_navy.svg" alt="Classic Visions" />
          <div>
            <div className="statement-brand-name">CLASSIC VISIONS</div>
            <div className="statement-brand-subtitle">OPTICAL · BARBADOS</div>
          </div>
        </div>
        <div className="statement-company-details">
          {COMPANY_CONTACT.addressLine}<br />
          {COMPANY_CONTACT.phoneDisplay} · {COMPANY_CONTACT.email}<br />
          www.classicvisions.net
        </div>
      </div>
      <div className="statement-title">
        <div className="statement-title-kicker">Account Statement</div>
        <div className="statement-title-word">Statement</div>
      </div>
    </header>
    <div className="statement-gold-rule" />
  </>
);

const StatementPageFooter = ({ page, total, printedOn }: { page: number; total: number; printedOn: string }) => (
  <footer className="statement-page-footer">
    <div className="statement-page-footer-rule" />
    <div className="statement-page-footer-content">
      <span>Classic Visions · Barbados</span>
      <span>Page {page} of {total}</span>
      <span>Printed: {printedOn}</span>
    </div>
  </footer>
);

export const StatementPrintDocument = ({
  statement,
  lines,
  customerName,
  accountNumber,
}: {
  statement: PrintableStatement;
  lines: PrintableStatementLine[];
  customerName: string | null;
  accountNumber: string | null;
}) => {
  const pages = paginateStatementLines(lines);
  const printedOn = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const currentDue = (statement.closing_balance ?? 0)
    - [statement.aging_amount_1, statement.aging_amount_2, statement.aging_amount_3, statement.aging_amount_4]
      .reduce((sum, amount) => sum + (amount ?? 0), 0);
  const invoiceTotal = lines.reduce((sum, line) => sum + Math.max(0, line.amount ?? 0), 0);
  const creditTotal = lines.reduce((sum, line) => sum + Math.abs(Math.min(0, line.amount ?? 0)), 0);
  const transactionTotal = statement.transactions ?? invoiceTotal - creditTotal;

  return (
    <div className="statement-print-document">
      <style>{statementPrintStyles}</style>
      {pages.map((pageLines, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;
        return (
          <article className="statement-document-page" key={`statement-page-${pageIndex + 1}`}>
            <div className="statement-document-page-content">
              {isFirstPage ? (
                <>
                  <StatementHeader />
                  <div className="statement-meta-summary">
                    <div className="statement-meta">
                      {[
                        ["Statement ID", statement.id],
                        ["Date as of", formatDate(statement.statement_date)],
                        ["Period", `${formatDate(statement.period_start, { month: "short", day: "numeric" })} — ${formatDate(statement.period_end, { month: "short", day: "numeric", year: "numeric" })}`],
                        ["Due Date", formatDate(statement.due_date)],
                        ["Customer", customerName || "—"],
                        ["Account #", accountNumber || "—"],
                      ].map(([label, value]) => (
                        <div className="statement-meta-row" key={label}>
                          <span className="statement-meta-label">{label}</span>
                          <span className="statement-meta-value">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="statement-summary">
                      <div className="statement-summary-heading">Account Summary</div>
                      {[
                        ["Opening Balance", statement.opening_balance],
                        ["Invoices / Credits", transactionTotal],
                        ["Finance Charges", statement.finance_charges],
                        ["Payments Received", statement.payments],
                        ["Discounts / Allowance", statement.discounts_allowance],
                      ].map(([label, amount]) => (
                        <div className="statement-summary-row" key={String(label)}><span>{label}</span><span>{formatMoney(amount as number | null)}</span></div>
                      ))}
                      <div className="statement-summary-row statement-summary-row--balance"><span>New Balance</span><span>{formatMoney(statement.closing_balance)}</span></div>
                    </div>
                  </div>
                  <section className="statement-section">
                    <div className="statement-section-heading">Ageing</div>
                    <table className="statement-aging">
                      <thead><tr><th>Current</th><th>30 Days</th><th>60 Days</th><th>90 Days</th><th>Overdue (120+ Days)</th></tr></thead>
                      <tbody><tr><td>{formatMoney(currentDue)}</td><td>{formatMoney(statement.aging_amount_1)}</td><td>{formatMoney(statement.aging_amount_2)}</td><td>{formatMoney(statement.aging_amount_3)}</td><td>{formatMoney(statement.aging_amount_4)}</td></tr></tbody>
                    </table>
                  </section>
                </>
              ) : (
                <header className="statement-continuation">
                  <div><div className="statement-continuation-title">CLASSIC VISIONS</div><div className="statement-continuation-context">Account Statement · {customerName || accountNumber || "Customer"}</div></div>
                  <div className="statement-continuation-number">Statement #{statement.id}<br />Transaction Detail</div>
                </header>
              )}

              <section className="statement-section">
                <div className="statement-section-heading">Transaction Detail</div>
                <table className="statement-transactions">
                  <thead><tr><th>Date</th><th>Patient</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                  <tbody>
                    {pageLines.map((line, index) => {
                      const amount = line.amount ?? 0;
                      return <tr key={line.id ?? `${pageIndex}-${index}`}><td>{formatDate(line.post_date, { month: "2-digit", day: "2-digit", year: "2-digit" })}</td><td>{line.patient || "—"}</td><td>{[line.order_type_name, transactionDetail(line)].filter(Boolean).join(" · ") || "—"}</td><td className="statement-debit">{amount >= 0 ? formatMoney(amount) : ""}</td><td className="statement-credit">{amount < 0 ? formatMoney(Math.abs(amount)) : ""}</td></tr>;
                    })}
                    {pageLines.length === 0 && <tr><td colSpan={5} style={{ padding: "16px 8px", textAlign: "center", color: "#5a7490" }}>No transactions on this statement.</td></tr>}
                    {isLastPage && <tr className="statement-new-balance"><td colSpan={4} style={{ textAlign: "right", textTransform: "uppercase", letterSpacing: ".06em" }}>New Balance</td><td>{formatMoney(statement.closing_balance)}</td></tr>}
                  </tbody>
                </table>
              </section>

              {isLastPage && <>
                <section className="statement-section statement-totals">
                  <div className="statement-total-column"><div className="statement-total-row"><span>Invoices</span><span>{formatMoney(invoiceTotal)}</span></div><div className="statement-total-row"><span>Credits</span><span>{formatMoney(creditTotal)}</span></div><div className="statement-total-row"><span>Debits</span><span className="statement-debit">{formatMoney(invoiceTotal)}</span></div></div>
                  <div className="statement-total-column"><div className="statement-total-row"><span>Regular</span><span>{formatMoney(statement.closing_balance)}</span></div><div className="statement-total-row"><span>Net</span><span>{formatMoney(invoiceTotal - creditTotal)}</span></div><div className="statement-total-row"><span>Supernet</span><span>{formatMoney(0)}</span></div></div>
                  <div className="statement-total-column"><div className="statement-total-row"><span>Rx</span><span>{formatMoney(0)}</span></div><div className="statement-total-row"><span>Stock</span><span>{formatMoney(0)}</span></div><div className="statement-total-row"><span>Tax Amount</span><span>{formatMoney(0)}</span></div></div>
                  <div className="statement-please-deduct">Please Deduct</div>
                </section>
                <section className="statement-section statement-note">Account due when rendered. 1.5% Finance Charge per month will be made on accounts not cleared within terms stated above. In the event of non-payment of this account, the Account Holder becomes liable for all collection fees &amp; expenses.<div className="statement-note-thanks">Thank you for your business!</div></section>
                <section className="statement-section statement-bank"><div className="statement-bank-heading">Bank Transfer Information</div><strong>Bank:</strong> Bank of Nova Scotia &nbsp;·&nbsp; <strong>SWIFT/BIC:</strong> NOSCBBBB &nbsp;·&nbsp; <strong>Account No.:</strong> 448873<br /><strong>Account Type:</strong> Chequing &nbsp;·&nbsp; <strong>Account Name:</strong> Classic Visions &nbsp;·&nbsp; <strong>Payment due:</strong> 30 days from date of statement</section>
              </>}
            </div>
            <StatementPageFooter page={pageIndex + 1} total={pages.length} printedOn={printedOn} />
          </article>
        );
      })}
    </div>
  );
};
