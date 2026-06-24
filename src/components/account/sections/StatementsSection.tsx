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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpDown, Check, Printer } from "lucide-react";

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

const StatementsSection = () => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [statementFilter, setStatementFilter] = useState("June 2026");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [paymentAmount, setPaymentAmount] = useState("4320.50");

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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentModalOpen(false);
      setPaymentSuccess(false);
    }, 2500);
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

            <div className="min-w-max space-y-1">
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

            <div className="min-w-max space-y-1">
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
                onClick={() => alert("Printing statement...")}
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

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-950 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">Make a Payment</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Enter your payment details below
            </DialogDescription>
          </DialogHeader>

          {paymentSuccess ? (
            <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                Thank you for your payment. Your records will be updated as soon
                as the money is received in our bank.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold dark:text-slate-50">
                  Payment Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-slate-400">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-7 h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardholder" className="text-sm font-semibold dark:text-slate-50">
                  Cardholder Name
                </Label>
                <Input
                  id="cardholder"
                  placeholder="Full name"
                  className="h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardnum" className="text-sm font-semibold dark:text-slate-50">
                  Card Number
                </Label>
                <Input
                  id="cardnum"
                  placeholder="•••• •••• •••• ••••"
                  className="h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-400"
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="text-sm font-semibold dark:text-slate-50">
                    Expiry
                  </Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    className="h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv" className="text-sm font-semibold dark:text-slate-50">
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    placeholder="•••"
                    className="h-10 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-400"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                Process Payment
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatementsSection;
