import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
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
import { ArrowUpDown, ArrowUpRight, Loader2, Printer, ReceiptText, X } from "lucide-react";
import { COMPANY_CONTACT } from "@/config/companyContact";
import { requestLiveData } from "@/lib/liveDataGateway";

// Live Innovations data is fetched on demand through the private OptiLens
// gateway. Payment routing remains a narrow CV-owned portal configuration.
interface StatementRow {
  id: string; // innovations_statement_id, text
  account_number: string | null;
  statement_date: string | null;
  period_start: string | null;
  period_end: string | null;
  volume_discount: number | null;
  opening_balance: number | null;
  transactions: number | null;
  closing_balance: number | null;
  payments: number | null;
  finance_charges: number | null;
  discount: number | null;
  allowance: number | null;
  discounts_allowance: number | null;
  aging_amount_1: number | null;
  aging_amount_2: number | null;
  aging_amount_3: number | null;
  aging_amount_4: number | null;
  due_date: string | null;
  status: number | null;
  void: boolean | null;
  printed: boolean | null;
}

interface StatementLineRow {
  id: number | null;
  statement_id: string | null;
  account_number: string | null;
  order_type_name: string | null;
  invoice_id: number | null;
  order_id: number | null;
  reference: string | null;
  patient: string | null;
  payment_method: string | null;
  post_date: string | null;
  amount: number | null;
}

interface BalanceRow {
  account_number: string | null;
  credit_limit: number | null;
  current_balance: number | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  last_statement_amount: number | null;
  last_statement_date: string | null;
}

interface PaymentProfile {
  customer_id: number;
  account_number: string | null;
  name: string | null;
  pay_by_card: boolean | null;
  pay_by_eft: boolean | null;
  eft_institution_name: string | null;
}

interface LiveAccountResponse {
  customer: { name: string | null; account_number: string | null };
  balance: BalanceRow | null;
  statements: Array<Omit<StatementRow, "id"> & { id: string | number }>;
  retrieved_at: string;
}

interface LiveStatementResponse {
  statement: StatementRow;
  lines: StatementLineRow[];
  retrieved_at: string;
}

interface BankPortal {
  bank_name: string;
  portal_url: string | null;
}

type SortColumn = "order_type_name" | "post_date" | "invoice_id" | "order_id" | "patient" | "payment_method" | "reference" | "amount" | null;
type SortDirection = "asc" | "desc";

const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (value: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", opts ?? { month: "2-digit", day: "2-digit", year: "numeric" });
};

const periodLabel = (s: StatementRow) =>
  `${fmtDate(s.period_start, { month: "short", day: "numeric" })} – ${fmtDate(s.period_end, { month: "short", day: "numeric", year: "numeric" })}`;

const lineDetail = (l: StatementLineRow) =>
  l.reference?.trim() || l.patient?.trim() || (l.invoice_id ? `Invoice #${l.invoice_id}` : "Statement item");

const StatementTemplate = ({
  statement,
  lines,
  customerName,
  accountNumber,
}: {
  statement: StatementRow;
  lines: StatementLineRow[];
  customerName: string | null;
  accountNumber: string | null;
}) => {
  const currentDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const currentDue = (statement.closing_balance ?? 0)
    - [statement.aging_amount_1, statement.aging_amount_2, statement.aging_amount_3, statement.aging_amount_4]
      .reduce((total, amount) => total + (amount ?? 0), 0);
  const aging = [
    ["Current", currentDue, "#0B1E35", "700"],
    ["30 Days", statement.aging_amount_1, "#3b5268", "400"],
    ["60 Days", statement.aging_amount_2, "#3b5268", "400"],
    ["90 Days", statement.aging_amount_3, "#3b5268", "400"],
    ["Overdue (120+ Days)", statement.aging_amount_4, "#a83220", "700"],
  ] as const;

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
          background: "#ffffff",
          padding: "18px 24px 14px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: "1px solid #e4e9ee",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "20pt", fontWeight: "800", color: "#0B1E35", letterSpacing: "-0.03em" }}>
            CLASSIC VISIONS
          </div>
          <div style={{ color: "#1A8A9C", fontSize: "6pt", fontWeight: "700", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: "-4px" }}>
            Optical · Barbados
          </div>
          <div style={{ color: "#8a9aaa", fontSize: "6.5pt", lineHeight: "1.65", letterSpacing: "0.01em" }}>
            {COMPANY_CONTACT.addressLine}
            <br />
            TIN# 1000006494000
            <br />
            Tel: {COMPANY_CONTACT.phoneDisplay}
            <br />
            www.classicvisions.net
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ fontSize: "6pt", fontWeight: "700", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1A8A9C" }}>
            Account Statement
          </div>
          <div style={{ fontSize: "36pt", fontWeight: "800", letterSpacing: "-0.03em", color: "rgba(11,30,53,0.07)", lineHeight: "0.9", textTransform: "uppercase", userSelect: "none" }}>
            Statement
          </div>
        </div>
      </div>

      <div style={{ height: "2px", background: "linear-gradient(90deg, #C89130 0%, rgba(200,145,48,0.15) 100%)" }}></div>

      {/* Body */}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Meta fields */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1, border: "1px solid #dde3ea", borderLeft: "3px solid #C89130", borderRadius: "4px", padding: "10px 12px", background: "#fafaf8" }}>
            {[
              ["Customer", customerName || "—"],
              ["Account #", accountNumber || "—"],
              ["Statement ID", statement.id],
              ["Volume Discount", money(statement.volume_discount)],
              ["Period", periodLabel(statement)],
              ["Due Date", fmtDate(statement.due_date)],
              ["Generated", currentDate],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr",
                  gap: "4px",
                  paddingBottom: "2.5px",
                  paddingTop: i === 0 ? 0 : "2.5px",
                  borderBottom: i < arr.length - 1 ? "1px solid #c9d4de" : "none",
                }}
              >
                <span style={{ fontSize: "6.5pt", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a7490" }}>
                  {label}
                </span>
                <span style={{ fontSize: "7.5pt", fontWeight: "600" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ width: "220px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ border: "1px solid #dde3ea", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ background: "#f2f6f8", color: "#1A8A9C", fontSize: "6pt", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", padding: "5px 10px", borderBottom: "1px solid #dde3ea" }}>
                Account Summary
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: "7pt", borderBottom: "1px solid #c9d4de" }}>
                <span>Opening Balance</span>
                <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>${money(statement.opening_balance)}</span>
              </div>
              {[
                ["Transactions for Period", statement.transactions],
                ["Finance Charges", statement.finance_charges],
                ["Payments Received", statement.payments],
                ["Discounts / Allowance", statement.discounts_allowance],
              ].map(([label, amount]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: "7pt", borderBottom: "1px solid #c9d4de" }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>${money(amount as number | null)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", background: "#0B1E35", color: "#F4F2ED", fontWeight: "700", fontSize: "7pt" }}>
                <span>New Balance</span>
                <span style={{ color: "#C89130", fontSize: "8pt", fontVariantNumeric: "tabular-nums" }}>${money(statement.closing_balance)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "6.5pt", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1A8A9C", marginBottom: "8px" }}>
            Ageing <div style={{ flex: 1, height: "1px", background: "#c9d4de", marginLeft: "4px" }}></div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #dde3ea", borderRadius: "4px", overflow: "hidden" }}>
            <thead><tr style={{ background: "#f2f6f8" }}>
              {aging.map(([label], index) => <th key={label} style={{ padding: "6px 10px", fontSize: "6.5pt", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", color: index === 4 ? "#a83220" : "#0B1E35", borderRight: index < 4 ? "1px solid #dde3ea" : undefined, borderBottom: "1px solid #dde3ea" }}>{label}</th>)}
            </tr></thead>
            <tbody><tr>
              {aging.map(([label, amount, color, weight], index) => <td key={label} style={{ padding: "7px 10px", fontSize: index === 0 ? "8pt" : "7.5pt", fontWeight: weight, textAlign: "center", fontVariantNumeric: "tabular-nums", color, borderRight: index < 4 ? "1px solid #dde3ea" : undefined }}>{money(amount)}</td>)}
            </tr></tbody>
          </table>
        </div>

        {/* Transaction table */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "6.5pt", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1A8A9C", marginBottom: "8px" }}>
            Transaction Detail <div style={{ flex: 1, height: "1px", background: "#c9d4de", marginLeft: "4px" }}></div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7pt", border: "1px solid #dde3ea" }}>
            <thead>
              <tr style={{ background: "#f2f6f8", color: "#3b5268" }}>
                {["Date", "Patient", "Description", "Debit", "Credit"].map((h, index) => (
                  <th key={h} style={{ padding: "6px 8px", fontSize: "6.5pt", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: index > 2 ? "right" : "left", color: h === "Debit" ? "#c0392b" : h === "Credit" ? "#1A8A9C" : "#3b5268", borderRight: index < 4 ? "1px solid #dde3ea" : undefined, borderBottom: "1px solid #dde3ea" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((row, idx) => (
                <tr key={row.id ?? idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#F4F2ED", borderBottom: "1px solid #c9d4de" }}>
                  <td style={{ padding: "4px 8px" }}>{fmtDate(row.post_date, { month: "2-digit", day: "2-digit", year: "2-digit" })}</td>
                  <td style={{ padding: "4px 8px" }}>{row.patient || "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{[row.order_type_name, lineDetail(row)].filter(Boolean).join(" · ") || "—"}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "600", fontVariantNumeric: "tabular-nums", color: "#c0392b" }}>{(row.amount ?? 0) >= 0 ? money(row.amount) : ""}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "600", fontVariantNumeric: "tabular-nums", color: "#1c7a52" }}>{(row.amount ?? 0) < 0 ? money(Math.abs(row.amount ?? 0)) : ""}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "16px 8px", textAlign: "center", color: "#5a7490" }}>
                    No transactions on this statement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared document footer treatment: use the same rules and palette as Doc Studio. */}
      <div style={{ padding: "0 24px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ border: "1px solid #cfe2e7", borderLeft: "3px solid #1A8A9C", borderRadius: "4px", padding: "9px 12px", background: "#f6fbfc", fontSize: "6.5pt", lineHeight: "1.65", color: "#5a7490" }}>
          Payment due: <strong style={{ color: "#0B1E35" }}>{fmtDate(statement.due_date)}</strong>. Questions about this statement? Contact <strong style={{ color: "#0B1E35" }}>{COMPANY_CONTACT.email}</strong> or {COMPANY_CONTACT.phoneDisplay}.
          <div style={{ color: "#1A8A9C", fontStyle: "italic", fontWeight: "600", marginTop: "4px" }}>Thank you for your business.</div>
        </div>
        <div style={{ border: "1px solid #dde3ea", borderTop: "2px solid #C89130", borderRadius: "4px", padding: "8px 14px", background: "#fdf6e3", fontSize: "6.5pt", lineHeight: "1.7", color: "#3b5268" }}>
          <div style={{ color: "#C89130", fontSize: "5.5pt", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "5px" }}>Bank Transfer Information</div>
          <strong style={{ color: "#0B1E35" }}>Payment due:</strong> 30 days from date of statement
        </div>
      </div>
    </div>
  );
};

const StatementsSection = () => {
  const { identity, emulation } = usePortalIdentity();
  const crmCustomerId = identity?.crmCustomerId ?? null;
  // Under admin emulation the gateway must serve the emulated customer's data.
  const websiteCustomerId = emulation && typeof crmCustomerId === "number" ? crmCustomerId : undefined;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statementPreviewOpen, setStatementPreviewOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const liveAccountQuery = useQuery({
    queryKey: ["live-innovations-customer-account", crmCustomerId],
    enabled: typeof crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveAccountResponse>("innovations.customer_account", {}, { signal, websiteCustomerId }),
    staleTime: 30_000,
    retry: 1,
  });

  const statements = useMemo(() => (liveAccountQuery.data?.statements ?? []).map((statement) => ({
    ...statement,
    id: String(statement.id),
  })) as StatementRow[], [liveAccountQuery.data?.statements]);

  const balance = liveAccountQuery.data?.balance ?? null;

  const activeStatementId = selectedStatementId ?? statements[0]?.id ?? null;
  const activeStatement = statements.find((s) => s.id === activeStatementId) ?? null;

  const linesQuery = useQuery({
    queryKey: ["live-innovations-statement", activeStatementId],
    enabled: !!activeStatementId,
    queryFn: ({ signal }) => requestLiveData<LiveStatementResponse>(
      "innovations.customer_statement",
      { statement_id: Number(activeStatementId) },
      { signal, websiteCustomerId },
    ),
    staleTime: 30_000,
    retry: 1,
  });
  const rawLines = useMemo(() => linesQuery.data?.lines ?? [], [linesQuery.data?.lines]);


  const paymentProfileQuery = useQuery({
    queryKey: ["customer-payment-profile", crmCustomerId],
    enabled: typeof crmCustomerId === "number",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_payment_profile_public")
        .select("*")
        .eq("customer_id", crmCustomerId)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentProfile | null;
    },
  });
  const paymentProfile = paymentProfileQuery.data ?? null;

  const bankPortalQuery = useQuery({
    queryKey: ["bank-payment-portal", paymentProfile?.eft_institution_name],
    enabled: !!paymentProfile?.pay_by_eft && !!paymentProfile?.eft_institution_name,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bank_payment_portals")
        .select("bank_name,portal_url")
        .eq("bank_name", paymentProfile!.eft_institution_name)
        .maybeSingle();
      if (error) throw error;
      return data as BankPortal | null;
    },
  });
  const bankPortal = bankPortalQuery.data ?? null;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const lines = rawLines;

  const sortedLines = useMemo(() => {
    if (!sortColumn) return [...lines].sort((a, b) => String(a.post_date ?? "").localeCompare(String(b.post_date ?? "")));
    const sorted = [...lines];
    sorted.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortColumn === "post_date") {
        const aTime = aVal ? new Date(aVal as string).getTime() : 0;
        const bTime = bVal ? new Date(bVal as string).getTime() : 0;
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [lines, sortColumn, sortDirection]);

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <button onClick={() => handleSort(column)} className="flex items-center gap-2 font-semibold hover:text-primary">
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    </button>
  );

  const isLoading = liveAccountQuery.isLoading;
  const currentBalance = liveAccountQuery.data?.balance?.current_balance ?? 0;

  if (!crmCustomerId) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Statements & Billing</h2>
          <p className="text-sm text-muted-foreground">View your account balance, transaction history, and statements.</p>
        </header>
        <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ReceiptText className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Your account isn't linked to a billing record yet. Once your customer account is approved, statements will appear here.
            </p>
          </div>
        </Card>
      </section>
    );
  }

  if (liveAccountQuery.isError) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Statements & Billing</h2>
          <p className="text-sm text-muted-foreground">Your balance and statements, fetched only when you open this page.</p>
        </header>
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{liveAccountQuery.error instanceof Error ? liveAccountQuery.error.message : "Live account data is temporarily unavailable."}</span>
            <Button variant="outline" size="sm" onClick={() => liveAccountQuery.refetch()}>
              Try live source again
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Statements & Billing</h2>
        <p className="text-sm text-muted-foreground">Live Innovations balance and statements, fetched only when you open this page.</p>
      </header>

      {/* Balance and Controls */}
      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
              {[
                ["Opening Balance", activeStatement?.opening_balance],
                ["Transactions for Period", activeStatement?.transactions],
                ["Finance Charges", activeStatement?.finance_charges],
                ["Payments Received", activeStatement?.payments],
                ["Discounts / Allowance", activeStatement?.discounts_allowance],
                ["Statement Closing", activeStatement?.closing_balance],
                ["Current Balance (live)", currentBalance],
              ].map(([label, amount]) => (
                <div key={String(label)} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">{label}</p>
                  <p className="text-lg font-semibold text-foreground dark:text-slate-50 sm:text-xl">${money(amount as number | null)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="w-full sm:w-auto sm:min-w-xs">
              <Select
                value={activeStatementId ?? ""}
                onValueChange={setSelectedStatementId}
                disabled={statements.length === 0}
              >
                <SelectTrigger className="h-10 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50">
                  <SelectValue placeholder={statements.length === 0 ? "No statements yet" : "Select a statement"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                  {statements.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Statement #{s.id} · {periodLabel(s)} · ${money(s.closing_balance)}
                    </SelectItem>
                  ))}
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
                onClick={() => setStatementPreviewOpen(true)}
                disabled={!activeStatement}
                title="Preview and print statement"
              >
                <Printer className="h-4 w-4" />
              </Button>

            </div>
          </div>
          {activeStatement ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <span><strong>Statement ID:</strong> {activeStatement.id}</span>
                <span><strong>Volume Discount:</strong> {money(activeStatement.volume_discount)}</span>
                <span><strong>Due Date:</strong> {fmtDate(activeStatement.due_date)}</span>
              </div>
              <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="px-3 py-2 text-left">30 Days</th><th className="px-3 py-2 text-left">60 Days</th><th className="px-3 py-2 text-left">90 Days</th><th className="px-3 py-2 text-left">Over 120</th></tr></thead>
                <tbody><tr><td className="px-3 py-2">${money(activeStatement.aging_amount_1)}</td><td className="px-3 py-2">${money(activeStatement.aging_amount_2)}</td><td className="px-3 py-2">${money(activeStatement.aging_amount_3)}</td><td className="px-3 py-2">${money(activeStatement.aging_amount_4)}</td></tr></tbody>
              </table>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Transaction Table */}
      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border overflow-hidden">
        {linesQuery.isError ? (
          <Alert variant="destructive" className="m-4" role="alert">
            <AlertDescription>
              {linesQuery.error instanceof Error ? linesQuery.error.message : "The selected live statement could not be loaded."}
            </AlertDescription>
          </Alert>
        ) : linesQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ReceiptText className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No statements have been posted to your account yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 dark:bg-slate-900/50 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="order_type_name" label="Order Type" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="post_date" label="Posting Date" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="invoice_id" label="Invoice ID" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="order_id" label="Order ID" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="patient" label="Patient" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="payment_method" label="Payment Method" /></th>
                  <th className="px-4 py-3 text-left text-foreground dark:text-slate-50"><SortHeader column="reference" label="Reference" /></th>
                  <th className="px-4 py-3 text-right text-foreground dark:text-slate-50"><SortHeader column="amount" label="Amount" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedLines.map((line) => {
                  return (
                    <tr key={line.id ?? lineDetail(line)} className="border-b transition-colors hover:bg-muted/30 dark:border-slate-700 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.order_type_name || "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{fmtDate(line.post_date)}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.invoice_id ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.order_id ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.patient || "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.payment_method || "—"}</td>
                      <td className="px-4 py-3 font-medium text-foreground dark:text-slate-50">{lineDetail(line)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground dark:text-slate-50">${money(line.amount)}</td>
                    </tr>
                  );
                })}
                {sortedLines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No line-item detail has been synced for this statement yet.</td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-950 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">Pay your balance</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Current balance: ${money(currentBalance)}
            </DialogDescription>
          </DialogHeader>

          {paymentProfile?.pay_by_eft && bankPortal?.portal_url ? (
            <>
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20">
                <AlertDescription className="text-blue-900 dark:text-blue-300">
                  Your account is set up to pay via {bankPortal.bank_name}. You'll be taken to your bank's online
                  banking to complete the payment.
                </AlertDescription>
              </Alert>
              <Button
                className="w-full h-10 gap-2"
                onClick={() => window.open(bankPortal.portal_url, "_blank", "noopener,noreferrer")}
              >
                Go to {bankPortal.bank_name} Online Banking <ArrowUpRight className="h-4 w-4" />
              </Button>
            </>
          ) : paymentProfile?.pay_by_eft && paymentProfile?.eft_institution_name ? (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                Your bank ({paymentProfile.eft_institution_name}) hasn't been connected for online payment routing
                yet. Please contact us at{" "}
                <a href="tel:+12464334928" className="underline">246-433-4928</a> or{" "}
                <a href="mailto:accounts@classicvisions.net" className="underline">accounts@classicvisions.net</a> to
                arrange payment.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                {paymentProfile?.pay_by_card
                  ? "Online card payments are coming soon. "
                  : "We're still connecting this portal to live billing, so we can't take payments here yet. "}
                To pay your balance of ${money(currentBalance)}, please contact us at{" "}
                <a href="tel:+12464334928" className="underline">246-433-4928</a> or{" "}
                <a href="mailto:accounts@classicvisions.net" className="underline">accounts@classicvisions.net</a>.
              </AlertDescription>
            </Alert>
          )}

          <Button variant="outline" className="w-full h-10" onClick={() => setPaymentModalOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Statement Preview Modal */}
      <Dialog open={statementPreviewOpen} onOpenChange={setStatementPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-950 p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white p-4 dark:bg-slate-950 dark:border-slate-700">
            <DialogTitle className="dark:text-slate-50">Statement Preview</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <button onClick={() => setStatementPreviewOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4" style={{ background: "#d0d5dc", minHeight: "600px" }}>
            {activeStatement && (
              <StatementTemplate
                statement={activeStatement}
                lines={sortedLines}
                customerName={identity?.customerName ?? paymentProfile?.name ?? null}
                accountNumber={activeStatement.account_number ?? paymentProfile?.account_number ?? null}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatementsSection;
