import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useUserRole } from "@/hooks/useUserRole";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { isScotiaEnabled, prepareScotiaPayment, redirectToScotiaPayment, SCOTIA_RETURN_URL } from "@/lib/payments/scotiaConnect";
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
import { AlertCircle, ArrowUpDown, ArrowUpRight, CheckCircle2, CreditCard, Loader2, Printer, ReceiptText, X } from "lucide-react";
import { COMPANY_CONTACT } from "@/config/companyContact";
import { requestLiveData } from "@/lib/liveDataGateway";
import InquireButton from "@/components/account/InquireButton";
import { StatementPrintDocument } from "@/components/account/sections/StatementPrintDocument";

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

// Statement/ledger figures come from the Innovations ERP in Barbados dollars —
// always label them explicitly so they're never mistaken for the USD amount a
// card payment actually charges.
const bbd = (n: number | null | undefined) => `BBD $${money(n)}`;

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
          <div style={{ fontSize: "6pt", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a9aaa" }}>
            All amounts in Barbados Dollars (BBD)
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
                <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{bbd(statement.opening_balance)}</span>
              </div>
              {[
                ["Transactions for Period", statement.transactions],
                ["Finance Charges", statement.finance_charges],
                ["Payments Received", statement.payments],
                ["Discounts / Allowance", statement.discounts_allowance],
              ].map(([label, amount]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", fontSize: "7pt", borderBottom: "1px solid #c9d4de" }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{bbd(amount as number | null)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px", background: "#0B1E35", color: "#F4F2ED", fontWeight: "700", fontSize: "7pt" }}>
                <span>New Balance</span>
                <span style={{ color: "#C89130", fontSize: "8pt", fontVariantNumeric: "tabular-nums" }}>{bbd(statement.closing_balance)}</span>
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
  const websiteCustomerId = typeof crmCustomerId === "number" ? crmCustomerId : undefined;
  const localFallbackTarget = {
    accountNumber: identity?.accountNumber ?? null,
  };

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // The same modal handles both "adjust the amount and pay" and the
  // thank-you state the buyer lands back on after Scotia redirects home.
  const [dialogMode, setDialogMode] = useState<"pay" | "result">("pay");
  // Card payment (Scotia eCom+, redirect mode): "paying" only covers the
  // brief create-intent + prepare round trip before the browser leaves this
  // page entirely for Scotia's hosted page.
  const [cardStep, setCardStep] = useState<"idle" | "paying">("idle");
  const [payAmount, setPayAmount] = useState("");
  // Buyer choices inside the Pay dialog.
  const [payMethod, setPayMethod] = useState<"card" | "bank">("card");
  const [amountSource, setAmountSource] = useState<"current" | "statement" | "custom">("current");
  const [saveCardForFuturePayments, setSaveCardForFuturePayments] = useState(false);

  const [scotiaError, setScotiaError] = useState<string | null>(null);
  const [statementPreviewOpen, setStatementPreviewOpen] = useState(false);
  const statementPrintRef = useRef<HTMLDivElement>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const liveAccountQuery = useQuery({
    queryKey: ["live-innovations-customer-account", crmCustomerId],
    enabled: typeof crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveAccountResponse>("innovations.customer_account", {}, { signal, websiteCustomerId, localFallbackTarget }),
    staleTime: 30_000,
    retry: 1,
  });

  // DB fallback: when the live Innovations connector is unreachable, serve the
  // last synced statement snapshot instead of a dead error page.
  const fallbackAccountQuery = useQuery({
    queryKey: ["synced-statements-fallback", crmCustomerId],
    enabled: typeof crmCustomerId === "number" && liveAccountQuery.isError,
    retry: 1,
    queryFn: async () => {
      const [{ data: rows, error: rowsError }, { data: bal, error: balError }] = await Promise.all([
        (supabase as any).from("statements_public").select("*").eq("customer_id", crmCustomerId).order("period_end", { ascending: false }),
        (supabase as any).from("balances_public").select("*").eq("customer_id", crmCustomerId).maybeSingle(),
      ]);
      if (rowsError) throw rowsError;
      if (balError) throw balError;
      return {
        statements: (rows ?? []) as Record<string, unknown>[],
        balance: (bal ?? null) as BalanceRow | null,
      };
    },
  });

  const usingFallback = liveAccountQuery.isError && fallbackAccountQuery.isSuccess;

  const statements = useMemo(() => {
    if (usingFallback) {
      return (fallbackAccountQuery.data?.statements ?? []).map((row) => ({
        id: String(row.id),
        account_number: (row.account_number as string | null) ?? null,
        statement_date: null,
        period_start: (row.period_start as string | null) ?? null,
        period_end: (row.period_end as string | null) ?? null,
        volume_discount: null,
        opening_balance: (row.opening_balance as number | null) ?? null,
        transactions: null,
        closing_balance: (row.closing_balance as number | null) ?? null,
        payments: (row.payments as number | null) ?? null,
        finance_charges: (row.finance_charges as number | null) ?? null,
        discount: (row.discount as number | null) ?? null,
        allowance: null,
        discounts_allowance: (row.discount as number | null) ?? null,
        aging_amount_1: null,
        aging_amount_2: null,
        aging_amount_3: null,
        aging_amount_4: null,
        due_date: (row.due_date as string | null) ?? null,
        status: (row.status as number | null) ?? null,
        void: (row.void as boolean | null) ?? null,
        printed: (row.printed as boolean | null) ?? null,
      })) as StatementRow[];
    }
    return (liveAccountQuery.data?.statements ?? []).map((statement) => ({
      ...statement,
      id: String(statement.id),
    })) as StatementRow[];
  }, [usingFallback, fallbackAccountQuery.data?.statements, liveAccountQuery.data?.statements]);

  const balance = usingFallback
    ? fallbackAccountQuery.data?.balance ?? null
    : liveAccountQuery.data?.balance ?? null;

  const activeStatementId = selectedStatementId ?? statements[0]?.id ?? null;
  const activeStatement = statements.find((s) => s.id === activeStatementId) ?? null;

  const linesQuery = useQuery({
    queryKey: ["live-innovations-statement", activeStatementId],
    enabled: !!activeStatementId && !liveAccountQuery.isError,
    queryFn: ({ signal }) => requestLiveData<LiveStatementResponse>(
      "innovations.customer_statement",
      { statement_id: Number(activeStatementId) },
      { signal, websiteCustomerId, localFallbackTarget },
    ),
    staleTime: 30_000,
    retry: 1,
  });

  // Fallback line items: the synced view keys lines by innovations_statement_id
  // (not the statements_public id), so match them to the active statement by
  // posting date within its period.
  const fallbackLinesQuery = useQuery({
    queryKey: ["synced-statement-lines-fallback", crmCustomerId],
    enabled: usingFallback && typeof crmCustomerId === "number",
    retry: 1,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("statement_lines_public")
        .select("*")
        .eq("customer_id", crmCustomerId)
        .order("post_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });

  const rawLines = useMemo<StatementLineRow[]>(() => {
    if (usingFallback) {
      if (!activeStatement) return [];
      return (fallbackLinesQuery.data ?? [])
        .filter((row) => {
          const d = String(row.post_date ?? "");
          if (activeStatement.period_start && d < activeStatement.period_start) return false;
          if (activeStatement.period_end && d > activeStatement.period_end) return false;
          return true;
        })
        .map((row) => ({
          id: (row.id as number | null) ?? null,
          statement_id: row.statement_id != null ? String(row.statement_id) : null,
          account_number: (row.account_number as string | null) ?? null,
          order_type_name: (row.order_type as string | null) ?? null,
          invoice_id: (row.invoice_id as number | null) ?? null,
          order_id: null,
          reference: (row.reference as string | null) ?? null,
          patient: (row.patient as string | null) ?? null,
          payment_method: null,
          post_date: (row.post_date as string | null) ?? null,
          amount: (row.amount as number | null) ?? null,
        }));
    }
    return linesQuery.data?.lines ?? [];
  }, [usingFallback, fallbackLinesQuery.data, activeStatement, linesQuery.data?.lines]);

  const linesLoading = usingFallback ? fallbackLinesQuery.isLoading : linesQuery.isLoading;
  const linesError = usingFallback ? fallbackLinesQuery.error : linesQuery.error;
  const linesIsError = usingFallback ? fallbackLinesQuery.isError : linesQuery.isError;

  useEffect(() => {
    if (searchParams.get("download") !== "1" || !activeStatementId) return;
    let cancelled = false;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/statement-document?statement_id=${encodeURIComponent(activeStatementId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok || cancelled) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Statement-${activeStatementId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      const next = new URLSearchParams(searchParams);
      next.delete("download");
      setSearchParams(next, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [activeStatementId, searchParams, setSearchParams]);

  const printStatement = () => {
    const statementDocument = statementPrintRef.current;
    if (!statementDocument) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Statement ${activeStatementId ?? ""}</title></head><body>${statementDocument.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };


  const paymentProfileQuery = useQuery({
    queryKey: ["customer-payment-profile", crmCustomerId],
    enabled: typeof crmCustomerId === "number",
    queryFn: async () => {
      // Security-definer RPC: the customers table is staff-only, so a customer
      // session cannot read the payment view directly. The RPC enforces the
      // same statements-access + account-membership rules and returns only
      // non-financial fields.
      const { data, error } = await (supabase.rpc as any)("get_customer_payment_profile", {
        p_customer_id: crmCustomerId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as PaymentProfile | null;
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

  // Admin master switch: Website features -> "Pay statements by card".
  const cardFeatureQuery = useQuery({
    queryKey: ["website-feature", "card_payments_on_statements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("website_features")
        .select("enabled")
        .eq("key", "card_payments_on_statements")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.enabled);
    },
  });
  const cardFeatureEnabled = cardFeatureQuery.data ?? false;

  // Testing bypass for the per-customer `pay_by_card` CRM flag, set from the
  // Feature Board so QA doesn't depend on a CRM edit landing on a specific
  // customer. "Public" bypasses it for every customer; "Admin" bypasses it
  // for staff/admin accounts only, so it can be validated before going public.
  const { isAdmin } = useUserRole();
  const cardBypassAdmin = useWebsiteFeature("card_payments_bypass_admin", false);
  const cardBypassPublic = useWebsiteFeature("card_payments_bypass_public", false);
  const cardApprovalBypassed = cardBypassPublic.enabled || (isAdmin && cardBypassAdmin.enabled);

  // Statements and card payments are both in Barbados dollars — the Scotia
  // store is provisioned in BBD, so no currency conversion happens anywhere.


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

  const isLoading = liveAccountQuery.isLoading || (liveAccountQuery.isError && fallbackAccountQuery.isLoading);
  const currentBalance = (usingFallback ? balance?.current_balance : liveAccountQuery.data?.balance?.current_balance) ?? 0;

  // Card payments require the gateway build flag, the admin website feature
  // switch, and (unless a Feature Board testing bypass is active) the
  // per-customer CRM flag. Bank transfer is always offered.
  const cardPaymentsEnabled = isScotiaEnabled() && cardFeatureEnabled && (!!paymentProfile?.pay_by_card || cardApprovalBypassed);

  const statementBalance = Number(activeStatement?.closing_balance ?? 0);
  const parsedPayAmount = Number(payAmount);
  const payAmountValid = Number.isFinite(parsedPayAmount) && parsedPayAmount > 0;

  const applyAmountSource = (source: "current" | "statement" | "custom") => {
    setAmountSource(source);
    if (source === "current") setPayAmount(currentBalance > 0 ? currentBalance.toFixed(2) : "");
    if (source === "statement") setPayAmount(statementBalance > 0 ? statementBalance.toFixed(2) : "");
  };

  const openPaymentModal = () => {
    setCardStep("idle");
    setScotiaError(null);
    setDialogMode("pay");
    setPayMethod(cardPaymentsEnabled ? "card" : "bank");
    setAmountSource("current");
    setSaveCardForFuturePayments(false);
    setPayAmount(currentBalance > 0 ? currentBalance.toFixed(2) : "");
    setPaymentModalOpen(true);
  };


  // Redirect-mode statement payment: create a pending intent (while we still
  // have an authenticated session), then send the whole browser to Scotia's
  // hosted page. Scotia's own hosted page won't embed cross-origin, so this
  // can't stay inline in the modal — the buyer leaves /profile/statements and
  // comes back via scotia-return with a ?scotia= result flag (handled by the
  // returning-from-Scotia effect below).
  const handleStatementCheckout = async () => {
    setScotiaError(null);
    setCardStep("paying");
    try {
      // Statement balances are BBD and the Scotia store is provisioned in BBD,
      // so the gateway is charged the same Barbados-dollar figure the customer
      // sees. The RPC persists the payable amount and is the authority on it.
      const { data, error } = await (supabase.rpc as any)("create_pending_statement_payment", {
        p_amount: parsedPayAmount,
        p_statement_id: activeStatementId,
        p_crm_customer_id: typeof crmCustomerId === "number" ? crmCustomerId : null,
        p_account_number: paymentProfile?.account_number ?? balance?.account_number ?? null,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.payment_id) throw new Error(error?.message || "Could not start payment.");

      const prepared = await prepareScotiaPayment({
        chargetotal: Number(row.amount_bbd ?? row.amount_usd),
        responseSuccessURL: SCOTIA_RETURN_URL,
        responseFailURL: SCOTIA_RETURN_URL,
        orderId: `STMT-${row.payment_id}`,
        assignToken: saveCardForFuturePayments,
      });
      redirectToScotiaPayment(prepared);
      // No further code runs — the page is navigating away.
    } catch (err) {
      setScotiaError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
      setCardStep("idle");
    }
  };

  // ── Returning from Scotia (full-page redirect back via scotia-return) ──
  const scotiaReturn = searchParams.get("scotia") as "success" | "declined" | "error" | null;
  const returnedAmount = Number(searchParams.get("amt") ?? "");
  const returnedAmountValid = Number.isFinite(returnedAmount) && returnedAmount > 0;
  const cardSaved = searchParams.get("card_saved") === "true";

  useEffect(() => {
    if (!scotiaReturn) return;
    // Land the buyer back in the same popup they left from, now showing the
    // thank-you / verification notice instead of the amount field.
    setDialogMode("result");
    setCardStep("idle");
    setPaymentModalOpen(true);
    if (scotiaReturn === "success") {
      queryClient.invalidateQueries({ queryKey: ["live-innovations-customer-account"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scotiaReturn]);

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

  // Hard error only when the synced snapshot is unavailable too — otherwise the
  // page renders the last synced data with an offline notice below.
  if (liveAccountQuery.isError && (fallbackAccountQuery.isError || (!fallbackAccountQuery.isLoading && !usingFallback))) {
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
        <p className="text-sm text-muted-foreground">Live account balance and statements, fetched only when you open this page.</p>
      </header>

      {usingFallback && (
        <Alert role="status" className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
          <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-300">
            <span>Live billing data is temporarily unavailable — showing your last synced statement snapshot.</span>
            <Button variant="outline" size="sm" onClick={() => liveAccountQuery.refetch()}>
              Try live source again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Returning from Scotia (redirect mode) */}
      {scotiaReturn === "success" && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <AlertDescription className="text-emerald-900 dark:text-emerald-300">
            Payment received — thank you. It will appear on your account shortly.
          </AlertDescription>
        </Alert>
      )}
      {(scotiaReturn === "declined" || scotiaReturn === "error") && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {scotiaReturn === "declined"
                ? "Your card was declined. No payment was made."
                : "We couldn't confirm your payment. No payment was made."}
            </span>
            <Button variant="outline" size="sm" onClick={openPaymentModal}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                  <p className="text-lg font-semibold text-foreground dark:text-slate-50 sm:text-xl">{bbd(amount as number | null)}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground dark:text-slate-400">
            Statement and account balances are in Barbados Dollars (BBD). Card payments are charged in BBD.
          </p>

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
                      Statement #{s.id} · {periodLabel(s)} · {bbd(s.closing_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={openPaymentModal}
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
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span><strong>Statement ID:</strong> {activeStatement.id}</span>
                  <span><strong>Volume Discount:</strong> {bbd(activeStatement.volume_discount)}</span>
                  <span><strong>Due Date:</strong> {fmtDate(activeStatement.due_date)}</span>
                </div>
                <InquireButton
                  label="Ask about this statement"
                  title={`Inquiry about Statement ${activeStatement.id}`}
                  description={[
                    `Statement ID: ${activeStatement.id}`,
                    `Account #: ${activeStatement.account_number ?? paymentProfile?.account_number ?? "—"}`,
                    `Statement date: ${fmtDate(activeStatement.statement_date)}`,
                    `Period: ${periodLabel(activeStatement)}`,
                    `Due date: ${fmtDate(activeStatement.due_date)}`,
                    `Closing balance: ${bbd(activeStatement.closing_balance)}`,
                    "",
                    "Question: ",
                  ].join("\n")}
                />
              </div>
              <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="px-3 py-2 text-left">30 Days</th><th className="px-3 py-2 text-left">60 Days</th><th className="px-3 py-2 text-left">90 Days</th><th className="px-3 py-2 text-left">Over 120</th></tr></thead>
                <tbody><tr><td className="px-3 py-2">{bbd(activeStatement.aging_amount_1)}</td><td className="px-3 py-2">{bbd(activeStatement.aging_amount_2)}</td><td className="px-3 py-2">{bbd(activeStatement.aging_amount_3)}</td><td className="px-3 py-2">{bbd(activeStatement.aging_amount_4)}</td></tr></tbody>
              </table>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Transaction Table */}
      <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border overflow-hidden">
        {linesIsError ? (
          <Alert variant="destructive" className="m-4" role="alert">
            <AlertDescription>
              {linesError instanceof Error ? linesError.message : "The selected statement could not be loaded."}
            </AlertDescription>
          </Alert>
        ) : linesLoading ? (
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
                  <th className="min-w-32 whitespace-nowrap px-4 py-3 text-right text-foreground dark:text-slate-50"><SortHeader column="amount" label="Amount" /></th>
                  <th className="px-4 py-3 text-right text-foreground dark:text-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLines.map((line) => {
                  const patientLabel = line.patient?.trim() || "patient";
                  return (
                    <tr key={line.id ?? lineDetail(line)} className="border-b transition-colors hover:bg-muted/30 dark:border-slate-700 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.order_type_name || "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{fmtDate(line.post_date)}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.invoice_id ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.order_id ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.patient || "—"}</td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-50">{line.payment_method || "—"}</td>
                      <td className="px-4 py-3 font-medium text-foreground dark:text-slate-50">{lineDetail(line)}</td>
                      <td className="min-w-32 whitespace-nowrap px-4 py-3 text-right font-medium text-foreground dark:text-slate-50">{bbd(line.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <InquireButton
                          label="Ask about this line"
                          title={`Inquiry about ${patientLabel} on Statement ${activeStatement?.id ?? line.statement_id ?? "—"}`}
                          description={[
                            `Statement ID: ${activeStatement?.id ?? line.statement_id ?? "—"}`,
                            `Order type: ${line.order_type_name || "—"}`,
                            `Posting date: ${fmtDate(line.post_date)}`,
                            `Invoice ID: ${line.invoice_id ?? "—"}`,
                            `Order ID: ${line.order_id ?? "—"}`,
                            `Patient: ${line.patient || "—"}`,
                            `Payment method: ${line.payment_method || "—"}`,
                            `Reference: ${lineDetail(line)}`,
                            `Amount: ${bbd(line.amount)}`,
                            "",
                            "Question: ",
                          ].join("\n")}
                        />
                      </td>
                    </tr>
                  );
                })}
                {sortedLines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No line-item detail has been synced for this statement yet.</td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <Dialog
        open={paymentModalOpen}
        onOpenChange={(open) => {
          setPaymentModalOpen(open);
          if (!open) {
            setCardStep("idle");
            setScotiaError(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-950 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">
              {dialogMode === "result"
                ? scotiaReturn === "success"
                  ? "Thank you for your payment"
                  : "Payment not completed"
                : "Pay your balance"}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {dialogMode === "result" && scotiaReturn === "success"
                ? `Payment received${returnedAmountValid ? `: ${bbd(returnedAmount)}` : ""}`
                : `Current balance: ${bbd(currentBalance)}`}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "result" ? (
            <div className="space-y-3">
              {scotiaReturn === "success" ? (
                <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <AlertDescription className="text-emerald-900 dark:text-emerald-300">
                    Thank you for your payment{returnedAmountValid ? ` of ${bbd(returnedAmount)}` : ""}. A receipt has
                    been emailed to you. Your payment will appear on your account once it has been verified with the
                    bank, and we'll send a confirmation as soon as that happens.
                    {cardSaved ? " Your card was saved securely for future payments." : ""}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    {scotiaReturn === "declined"
                      ? "Your card was declined. No payment was taken."
                      : "We couldn't confirm your payment. No payment was taken."}
                  </AlertDescription>
                </Alert>
              )}
              {scotiaReturn !== "success" && (
                <Button className="w-full h-10" onClick={openPaymentModal}>
                  Try again
                </Button>
              )}
            </div>
          ) : (
            <>
          {scotiaError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{scotiaError}</AlertDescription>
            </Alert>
          )}

          {/* ── 1. What to pay ── */}
          {cardStep !== "paying" && (
            <div className="space-y-2">
              <p className="text-sm font-medium dark:text-slate-50">What would you like to pay?</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => applyAmountSource("current")}
                  className={`flex items-center justify-between border px-3 py-2 text-left text-sm ${amountSource === "current" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span>Current balance</span>
                  <span className="font-medium">{bbd(currentBalance)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyAmountSource("statement")}
                  className={`flex items-center justify-between border px-3 py-2 text-left text-sm ${amountSource === "statement" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span>Statement balance{activeStatement?.statement_date ? ` (${fmtDate(activeStatement.statement_date)})` : ""}</span>
                  <span className="font-medium">{bbd(statementBalance)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyAmountSource("custom")}
                  className={`border px-3 py-2 text-left text-sm ${amountSource === "custom" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  Another amount
                </button>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="statement-pay-amount" className="text-sm font-medium dark:text-slate-50">
                  Amount to pay
                </label>
                <Input
                  id="statement-pay-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => {
                    setAmountSource("custom");
                    setPayAmount(e.target.value);
                  }}
                  className="h-10"
                />
                {payAmountValid && (
                  <p className="text-[11px] text-muted-foreground">
                    {bbd(parsedPayAmount)} — charged in Barbados dollars, by card or bank transfer
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── 2. How to pay ── */}
          {cardStep !== "paying" && (
            <div className="space-y-2">
              <p className="text-sm font-medium dark:text-slate-50">How would you like to pay?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!cardPaymentsEnabled}
                  onClick={() => setPayMethod("card")}
                  className={`border px-3 py-2 text-sm disabled:opacity-50 ${payMethod === "card" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("bank")}
                  className={`border px-3 py-2 text-sm ${payMethod === "bank" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  Bank transfer
                </button>
              </div>
              {!cardPaymentsEnabled && (
                <p className="text-[11px] text-muted-foreground">
                  {!cardFeatureEnabled
                    ? "Card payments are temporarily unavailable — please use bank transfer."
                    : "Card payments aren't enabled on your account yet — contact us to turn them on."}
                </p>
              )}

            </div>
          )}

          {/* ── Card payment (Scotia eCom+, redirect mode) ── */}
          {payMethod === "card" && cardPaymentsEnabled ? (
            <div className="space-y-3">
              <label htmlFor="statement-save-card" className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
                <Checkbox
                  id="statement-save-card"
                  checked={saveCardForFuturePayments}
                  onCheckedChange={(checked) => setSaveCardForFuturePayments(checked === true)}
                />
                <span>
                  <span className="block font-medium">Save this card securely for future payments</span>
                  <span className="block text-xs text-muted-foreground">Your card details stay with Scotiabank. We never store your full card number or CVV.</span>
                </span>
              </label>
              <Button
                className="w-full h-10 gap-2"
                disabled={!payAmountValid || cardStep === "paying"}
                onClick={handleStatementCheckout}
              >
                {cardStep === "paying" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {cardStep === "paying"
                  ? "Redirecting to Scotiabank…"
                  : payAmountValid
                    ? `Pay ${bbd(parsedPayAmount)} by card`
                    : "Pay by card"}
              </Button>
              {cardStep !== "paying" && payAmountValid && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Charged in BBD · pays off {bbd(parsedPayAmount)} of your balance
                </p>
              )}
              {cardStep !== "paying" && (
                <p className="text-center text-[11px] text-muted-foreground">
                  You'll enter your card on Scotiabank's secure page, then return here automatically.
                </p>
              )}
            </div>
          ) : null}

          {/* ── Bank transfer ── */}
          {payMethod === "bank" && cardStep !== "paying" ? (
            bankPortal?.portal_url ? (
              <div className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20">
                  <AlertDescription className="text-blue-900 dark:text-blue-300">
                    You'll be taken to {bankPortal.bank_name} online banking to transfer{" "}
                    {bbd(parsedPayAmount || 0)}. Please quote your account number
                    {paymentProfile?.account_number ? ` (${paymentProfile.account_number})` : ""} as the reference.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full h-10 gap-2"
                  onClick={() => window.open(bankPortal.portal_url!, "_blank", "noopener,noreferrer")}
                >
                  Go to {bankPortal.bank_name} Online Banking <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  To pay {bbd(parsedPayAmount || 0)} by bank transfer
                  {paymentProfile?.eft_institution_name ? ` from ${paymentProfile.eft_institution_name}` : ""}, contact
                  us at <a href="tel:+12464334928" className="underline">246-433-4928</a> or{" "}
                  <a href="mailto:accounts@classicvisions.net" className="underline">accounts@classicvisions.net</a> for
                  our bank details. Quote your account number
                  {paymentProfile?.account_number ? ` (${paymentProfile.account_number})` : ""} as the reference.
                </AlertDescription>
              </Alert>
            )
          ) : null}

            </>
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
              <Button variant="outline" size="sm" onClick={printStatement} className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <button onClick={() => setStatementPreviewOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4" style={{ background: "#d0d5dc", minHeight: "600px" }}>
            {activeStatement && <div ref={statementPrintRef}>
              <StatementPrintDocument
                statement={activeStatement}
                lines={sortedLines}
                customerName={identity?.customerName ?? paymentProfile?.name ?? null}
                accountNumber={activeStatement.account_number ?? paymentProfile?.account_number ?? null}
              />
            </div>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatementsSection;
