import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpDown, Printer, X } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  invoiceNum: string;
  rxNum: string;
  orderNum: string;
  poNum: string;
  description: string;
  amount: number;
  status: "open" | "paid";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "2026-06-15",
    invoiceNum: "INV-24601",
    rxNum: "RX-2024-5847",
    orderNum: "ORD-18942",
    poNum: "PO-8734",
    description: "Lens materials & labor",
    amount: 1250.0,
    status: "open",
  },
  {
    id: "2",
    date: "2026-06-10",
    invoiceNum: "INV-24592",
    rxNum: "RX-2024-5821",
    orderNum: "ORD-18933",
    poNum: "PO-8721",
    description: "Frame inventory + mounting",
    amount: 875.5,
    status: "open",
  },
  {
    id: "3",
    date: "2026-06-05",
    invoiceNum: "INV-24588",
    rxNum: "RX-2024-5805",
    orderNum: "ORD-18925",
    poNum: "PO-8712",
    description: "Coatings & treatments",
    amount: 645.0,
    status: "open",
  },
  {
    id: "4",
    date: "2026-05-20",
    invoiceNum: "PAY-24540",
    rxNum: "—",
    orderNum: "—",
    poNum: "—",
    description: "Payment received",
    amount: -550.0,
    status: "paid",
  },
  {
    id: "5",
    date: "2026-05-18",
    invoiceNum: "INV-24530",
    rxNum: "RX-2024-5412",
    orderNum: "ORD-18815",
    poNum: "PO-8691",
    description: "Rush order processing",
    amount: 550.0,
    status: "paid",
  },
];

type SortColumn = keyof Transaction | null;
type SortDirection = "asc" | "desc";

const StatementTemplate = ({ data }: { data: Transaction[] }) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const totalInvoiced = data
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = Math.abs(
    data
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#ffffff",
        padding: "0",
        fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
        fontSize: "8.5pt",
        color: "#0B1E35",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#0B1E35",
          padding: "18px 24px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "20pt",
              fontWeight: "800",
              color: "#F4F2ED",
              letterSpacing: "-0.03em",
            }}
          >
            CLASSIC VISIONS
          </div>
          <div
            style={{
              color: "rgba(244,242,237,0.75)",
              fontSize: "6.5pt",
              lineHeight: "1.65",
              letterSpacing: "0.01em",
            }}
          >
            Uplands, St. John · Barbados · BB20031
            <br />
            TIN# 1000006494000
            <br />
            Tel: 246-433-4928 · Fax: 246-433-4927
            <br />
            www.classicvisions.net
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
          }}
        >
          <div
            style={{
              fontSize: "6pt",
              fontWeight: "700",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#1A8A9C",
            }}
          >
            Account Statement
          </div>
          <div
            style={{
              fontSize: "28pt",
              fontWeight: "800",
              letterSpacing: "-0.03em",
              color: "rgba(244,242,237,0.15)",
              lineHeight: "1",
              textTransform: "uppercase",
            }}
          >
            Statement
          </div>
        </div>
      </div>

      <div
        style={{
          height: "3px",
          background:
            "linear-gradient(90deg, #C89130 0%, rgba(200,145,48,0.2) 100%)",
        }}
      ></div>

      {/* Body */}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Meta fields */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div
            style={{
              flex: 1,
              border: "1.5px solid #c9d4de",
              borderLeft: "3px solid #C89130",
              borderRadius: "4px",
              padding: "10px 12px",
              background: "#F4F2ED",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr",
                gap: "4px",
                paddingBottom: "2.5px",
                borderBottom: "1px solid #c9d4de",
              }}
            >
              <span
                style={{
                  fontSize: "6.5pt",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#5a7490",
                }}
              >
                Period
              </span>
              <span style={{ fontSize: "7.5pt", fontWeight: "600" }}>
                June 2026
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr",
                gap: "4px",
                paddingBottom: "2.5px",
                paddingTop: "2.5px",
              }}
            >
              <span
                style={{
                  fontSize: "6.5pt",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#5a7490",
                }}
              >
                Generated
              </span>
              <span style={{ fontSize: "7.5pt", fontWeight: "600" }}>
                {currentDate}
              </span>
            </div>
          </div>

          <div
            style={{
              width: "210px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ border: "1.5px solid #c9d4de", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  background: "#0B1E35",
                  color: "#F4F2ED",
                  fontSize: "6pt",
                  fontWeight: "700",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                }}
              >
                Account Summary
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: "7pt", borderBottom: "1px solid #c9d4de" }}>
                <span>Total Invoiced</span>
                <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>
                  ${totalInvoiced.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: "7pt", borderBottom: "1px solid #c9d4de" }}>
                <span>Total Paid</span>
                <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>
                  ${totalPaid.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 10px",
                  background: "#0B1E35",
                  color: "#F4F2ED",
                  fontWeight: "700",
                  fontSize: "7pt",
                }}
              >
                <span>Current Balance</span>
                <span style={{ color: "#C89130", fontSize: "8pt", fontVariantNumeric: "tabular-nums" }}>
                  ${(totalInvoiced - totalPaid).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction table */}
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              fontSize: "6.5pt",
              fontWeight: "700",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#1A8A9C",
              marginBottom: "8px",
            }}
          >
            Transaction Detail
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "7pt",
            }}
          >
            <thead>
              <tr style={{ background: "#0B1E35", color: "#F4F2ED" }}>
                <th
                  style={{
                    padding: "6px 8px",
                    fontSize: "6.5pt",
                    fontWeight: "700",
                    textAlign: "left",
                    borderRight: "1px solid rgba(244,242,237,0.1)",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontSize: "6.5pt",
                    fontWeight: "700",
                    textAlign: "left",
                    borderRight: "1px solid rgba(244,242,237,0.1)",
                  }}
                >
                  Invoice
                </th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontSize: "6.5pt",
                    fontWeight: "700",
                    textAlign: "left",
                    borderRight: "1px solid rgba(244,242,237,0.1)",
                  }}
                >
                  Rx #
                </th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontSize: "6.5pt",
                    fontWeight: "700",
                    textAlign: "left",
                    borderRight: "1px solid rgba(244,242,237,0.1)",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontSize: "6.5pt",
                    fontWeight: "700",
                    textAlign: "right",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#F4F2ED",
                    borderBottom: "1px solid #c9d4de",
                  }}
                >
                  <td style={{ padding: "4px 8px" }}>
                    {new Date(row.date).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: "4px 8px", fontWeight: "600" }}>
                    {row.invoiceNum}
                  </td>
                  <td style={{ padding: "4px 8px" }}>{row.rxNum}</td>
                  <td style={{ padding: "4px 8px" }}>{row.description}</td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "right",
                      fontWeight: "600",
                      fontVariantNumeric: "tabular-nums",
                      color: row.amount < 0 ? "#c0392b" : "#0B1E35",
                    }}
                  >
                    ${Math.abs(row.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          padding: "16px 24px",
          background: "#0B1E35",
          color: "rgba(244,242,237,0.8)",
          fontSize: "6.5pt",
          lineHeight: "1.6",
          borderTop: "2px solid #C89130",
        }}
      >
        <strong style={{ color: "#F4F2ED" }}>Payment Due:</strong> 30 days from
        invoice date
        <br />
        <strong style={{ color: "#F4F2ED" }}>Bank:</strong> Bank of Nova Scotia ·{" "}
        <strong style={{ color: "#F4F2ED" }}>Account No.:</strong> 448873
      </div>
    </div>
  );
};

const StatementsSection = () => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statementPreviewOpen, setStatementPreviewOpen] = useState(false);
  const [statementFilter, setStatementFilter] = useState("June 2026");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const totalInvoiced = 8120.0;
  const totalPaid = 3799.5;
  const currentBalance = 4320.5;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedTransactions = useMemo(() => {
    let sorted = [...mockTransactions];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          if (sortColumn === "date") {
            const aDate = new Date(aVal);
            const bDate = new Date(bVal);
            return sortDirection === "asc"
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    return sorted;
  }, [sortColumn, sortDirection]);

  const handlePrintStatement = () => {
    setStatementPreviewOpen(true);
  };

  const SortHeader = ({
    column,
    label,
  }: {
    column: SortColumn;
    label: string;
  }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-2 font-semibold hover:text-primary"
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    </button>
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Statements & Billing
        </h2>
        <p className="text-sm text-muted-foreground">
          View your account balance, transaction history, and statements.
        </p>
      </header>

      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          This page is still being connected to live billing records. The balance and transactions shown below are sample data, not your real account activity.
        </AlertDescription>
      </Alert>

      {/* Balance and Controls - Responsive Header */}
      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
          {/* Balance Summary - Auto-fit grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:gap-8">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                Total Invoiced
              </p>
              <p className="text-lg font-semibold text-foreground dark:text-slate-50 sm:text-xl">
                ${totalInvoiced.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                Total Paid
              </p>
              <p className="text-lg font-semibold text-foreground dark:text-slate-50 sm:text-xl">
                ${totalPaid.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                Balance Due
              </p>
              <p className="text-lg font-semibold text-primary dark:text-emerald-400 sm:text-xl">
                ${currentBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Controls - Wraps and centers on mobile */}
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="w-full sm:w-auto sm:min-w-xs">
              <Select value={statementFilter} onValueChange={setStatementFilter}>
                <SelectTrigger className="h-10 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectItem value="June 2026">June 2026</SelectItem>
                  <SelectItem value="May 2026">May 2026</SelectItem>
                  <SelectItem value="April 2026">April 2026</SelectItem>
                  <SelectItem value="March 2026">March 2026</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="unpaid">All Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className="flex-1 h-10 sm:flex-none bg-primary hover:bg-primary/90 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                Pay Balance
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
                onClick={handlePrintStatement}
                title="Preview and print statement"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Table - Scrollable Container */}
      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 dark:bg-slate-900/50 dark:border-slate-700">
                <th className="px-4 py-3 text-left md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="date" label="Date" />
                </th>
                <th className="px-4 py-3 text-left md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="invoiceNum" label="Invoice #" />
                </th>
                <th className="hidden px-4 py-3 text-left md:table-cell md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="rxNum" label="Rx #" />
                </th>
                <th className="hidden px-4 py-3 text-left lg:table-cell lg:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="orderNum" label="Order #" />
                </th>
                <th className="hidden px-4 py-3 text-left 2xl:table-cell 2xl:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="poNum" label="PO #" />
                </th>
                <th className="hidden px-4 py-3 text-left sm:table-cell md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="description" label="Description" />
                </th>
                <th className="px-4 py-3 text-right md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="amount" label="Amount" />
                </th>
                <th className="px-4 py-3 text-right md:px-6 text-foreground dark:text-slate-50">
                  <SortHeader column="status" label="Status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b transition-colors hover:bg-muted/30 dark:border-slate-700 dark:hover:bg-slate-900/30"
                >
                  <td className="px-4 py-3 md:px-6 text-foreground dark:text-slate-50">
                    {new Date(transaction.date).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 md:px-6 font-medium text-foreground dark:text-slate-50">
                    {transaction.invoiceNum}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell md:px-6 text-foreground dark:text-slate-50">
                    {transaction.rxNum}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell lg:px-6 text-foreground dark:text-slate-50">
                    {transaction.orderNum}
                  </td>
                  <td className="hidden px-4 py-3 2xl:table-cell 2xl:px-6 text-foreground dark:text-slate-50">
                    {transaction.poNum}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell md:px-6 text-foreground dark:text-slate-50">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3 md:px-6 text-right font-medium text-foreground dark:text-slate-50">
                    {transaction.amount < 0 ? "-" : ""}$
                    {Math.abs(transaction.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 md:px-6 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                        transaction.status === "open"
                          ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {transaction.status === "open" ? "Open" : "Paid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Modal — online payments are not wired up yet; do not collect card data here. */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-950 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">Pay your balance</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Online payments aren't available yet.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              We're still connecting this portal to live billing, so we can't take
              card payments here yet. To pay your balance of $
              {currentBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              , please contact us at{" "}
              <a href="tel:+12464334928" className="underline">246-433-4928</a> or{" "}
              <a href="mailto:accounts@classicvisions.net" className="underline">
                accounts@classicvisions.net
              </a>.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full h-10"
            onClick={() => setPaymentModalOpen(false)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Statement Preview Modal */}
      <Dialog open={statementPreviewOpen} onOpenChange={setStatementPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-950 p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white p-4 dark:bg-slate-950 dark:border-slate-700">
            <DialogTitle className="dark:text-slate-50">
              Statement Preview
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <button
                onClick={() => setStatementPreviewOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="p-4"
            style={{
              background: "#d0d5dc",
              minHeight: "600px",
            }}
          >
            <StatementTemplate data={sortedTransactions} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatementsSection;
