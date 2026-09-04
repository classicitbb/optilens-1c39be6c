import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { CreditCard, Loader2, Mail, Printer, ReceiptText, RotateCcw, ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { prepareScotiaPayment, redirectToScotiaPayment, SCOTIA_RETURN_URL } from "@/lib/payments/scotiaConnect";

type WalkInPayment = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  order_reference: string | null;
  reason: string | null;
  amount: number;
  currency: string;
  status: "pending" | "settled" | "failed";
  payment_reference: string;
  gateway_transaction_id: string | null;
  gateway_response_code: string | null;
  gateway_fail_rc: string | null;
  card_brand: string | null;
  card_last4: string | null;
  paid_at: string | null;
  created_at: string;
};

const initialForm = { amount: "", customerName: "", customerEmail: "", orderReference: "", reason: "" };
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
const when = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const WalkInPaymentsPage = () => {
  const { realRole, isLoading } = useAdminRole();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [payment, setPayment] = useState<WalkInPayment | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const paymentId = searchParams.get("payment");
  const isStaff = realRole === "admin" || realRole === "operator";

  useEffect(() => {
    if (!paymentId || !isStaff) {
      return;
    }
    let alive = true;
    setLoadingResult(true);
    (async () => {
      const { data, error: fetchError } = await (supabase as any)
        .from("walk_in_payments")
        .select("id,customer_name,customer_email,order_reference,reason,amount,currency,status,payment_reference,gateway_transaction_id,gateway_response_code,gateway_fail_rc,card_brand,card_last4,paid_at,created_at")
        .eq("id", paymentId)
        .maybeSingle();
      if (!alive) return;
      const fetchedPayment = fetchError ? null : (data as WalkInPayment | null);
      setPayment(fetchedPayment);
      if (fetchError) setError(fetchError.message);
      if (fetchedPayment?.status === "settled") {
        setShowPrintModal(true);
      }
      setLoadingResult(false);
    })();
    return () => { alive = false; };
  }, [isStaff, paymentId]);

  const newPayment = () => {
    setForm(initialForm);
    setPayment(null);
    setError(null);
    setShowPrintModal(false);
    setSearchParams({});
  };

  const handleResendEmail = async () => {
    if (!displayedPayment?.id) return;
    setResendingEmail(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke("scotia-payment", {
        body: {
          action: "send-walkin-receipt",
          paymentId: displayedPayment.id,
          force: true,
        },
      });
      if (invokeError) throw invokeError;
      toast({
        title: "Receipt email sent",
        description: displayedPayment.customer_email
          ? `Receipt email resent to ${displayedPayment.customer_email}.`
          : "Receipt email sent to staff account.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: err instanceof Error ? err.message : "Could not send receipt email.",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const takePayment = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.99) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    const customerEmail = form.customerEmail.trim();
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setError("Please enter a valid customer email address, or leave it blank.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // The intent is created first. The signed provider form can only use the
      // exact server-stored amount for this payment reference.
      const { data: paymentId, error: createError } = await (supabase.rpc as any)("create_walk_in_payment", {
        p_amount: amount,
        p_customer_name: form.customerName,
        p_customer_email: customerEmail || null,
        p_order_reference: form.orderReference || null,
        p_reason: form.reason || null,
      });
      if (createError || !paymentId) throw new Error(createError?.message || "Could not start the payment.");

      const prepared = await prepareScotiaPayment({
        chargetotal: amount,
        responseSuccessURL: SCOTIA_RETURN_URL,
        responseFailURL: SCOTIA_RETURN_URL,
        orderId: `WALKIN-${paymentId}`,
      });
      redirectToScotiaPayment(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!isStaff) return <Navigate to="/admin/dashboard" replace />;

  const returnedOutcome = searchParams.get("scotia");
  const displayedPayment = paymentId ? payment : null;
  const receiptReady = displayedPayment?.status === "settled";
  const displayReference = displayedPayment?.gateway_transaction_id || displayedPayment?.payment_reference;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <AdminPageHeader icon={ReceiptText} title="Walk-in payments" />
          <p className="mt-1 text-sm text-muted-foreground">Create a card payment in a few steps. Card details stay on Scotia’s secure hosted payment page.</p>
        </div>
        <Button variant="outline" onClick={newPayment}><RotateCcw className="mr-2 h-4 w-4" />New payment</Button>
      </div>

      {loadingResult ? <div className="py-8 text-center text-sm text-muted-foreground">Checking payment result…</div> : null}
      {returnedOutcome === "success" && !receiptReady && !loadingResult ? (
        <Alert variant="destructive" className="print:hidden"><AlertTitle>Payment is still being confirmed</AlertTitle><AlertDescription>Refresh shortly if the result does not appear. A receipt is shown only after the signed provider result is stored.</AlertDescription></Alert>
      ) : null}
      {returnedOutcome === "declined" && payment?.status === "failed" ? (
        <Alert variant="destructive" className="print:hidden"><AlertTitle>Payment declined</AlertTitle><AlertDescription>No payment was recorded. You can start a new payment if the customer wants to try another card.</AlertDescription></Alert>
      ) : null}
      {error ? <Alert variant="destructive" className="print:hidden"><AlertTitle>Payment could not be started</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {receiptReady && displayedPayment ? (
        <>
          <AlertDialog open={showPrintModal} onOpenChange={setShowPrintModal}>
            <AlertDialogContent className="print:hidden">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />Payment received
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 pt-1 text-sm text-foreground">
                  <p>
                    Payment of <strong>{money(Number(displayedPayment.amount))} USD</strong> from{" "}
                    <strong>{displayedPayment.customer_name}</strong> was approved.
                  </p>
                  {displayedPayment.customer_email ? (
                    <p className="text-xs text-muted-foreground">
                      A receipt email has been sent to <strong>{displayedPayment.customer_email}</strong>.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No customer email was provided for this payment.</p>
                  )}
                  <p className="pt-1 font-medium">Would you like to print a physical receipt?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowPrintModal(false)}>Not now</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowPrintModal(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />Print receipt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Card className="border-emerald-200 print:border-0 print:shadow-none">
            <CardHeader className="print:pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="h-5 w-5" />Payment received</CardTitle>
                  <CardDescription>Verified Scotia/Fiserv card payment</CardDescription>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                  >
                    {resendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    {displayedPayment.customer_email ? "Resend email" : "Email receipt"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print receipt</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Amount</span><p className="text-xl font-semibold">{money(Number(displayedPayment.amount))} USD</p></div>
              <div><span className="text-muted-foreground">Date and time</span><p className="font-medium">{when(displayedPayment.paid_at || displayedPayment.created_at)}</p></div>
              <div><span className="text-muted-foreground">Payment reference</span><p className="font-mono text-xs">{displayReference}</p></div>
              <div><span className="text-muted-foreground">Customer</span><p className="font-medium">{displayedPayment.customer_name}</p></div>
              {displayedPayment.customer_email ? (
                <div>
                  <span className="text-muted-foreground">Customer email</span>
                  <p className="font-medium">{displayedPayment.customer_email}</p>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Receipt emailed</span>
                </div>
              ) : (
                <div>
                  <span className="text-muted-foreground">Customer email</span>
                  <p className="text-muted-foreground italic">None provided</p>
                </div>
              )}
              {displayedPayment.order_reference ? <div><span className="text-muted-foreground">Order / reference</span><p>{displayedPayment.order_reference}</p></div> : null}
              {displayedPayment.reason ? <div><span className="text-muted-foreground">Reason</span><p>{displayedPayment.reason}</p></div> : null}
              <div><span className="text-muted-foreground">Card</span><p>{displayedPayment.card_brand || "Card"}{displayedPayment.card_last4 ? ` •••• ${displayedPayment.card_last4}` : ""}</p></div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {!receiptReady ? (
        <Card className="print:hidden">
          <CardHeader><CardTitle>Take a payment</CardTitle><CardDescription>Enter the exact amount agreed with the customer. After selecting Take payment, hand over the provider page or key the card there.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Amount (USD)<Input inputMode="decimal" type="number" min="0.01" max="999999.99" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" autoComplete="off" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Customer name<Input value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Customer name" autoComplete="name" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Customer email <span className="font-normal text-muted-foreground">(for receipt)</span><Input type="email" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" autoComplete="email" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Order / reference <span className="font-normal text-muted-foreground">(optional)</span><Input value={form.orderReference} onChange={(event) => setForm((current) => ({ ...current, orderReference: event.target.value }))} placeholder="Order number or reference" autoComplete="off" /></label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Reason <span className="font-normal text-muted-foreground">(optional)</span><Textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="What is this payment for?" className="min-h-20" /></label>
            <div className="sm:col-span-2 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">This page never collects or displays raw card details.</p>
              <Button onClick={takePayment} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Take payment</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default WalkInPaymentsPage;
