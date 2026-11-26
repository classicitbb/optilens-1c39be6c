import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Banknote, CreditCard, Link2, Loader2, Mail, Printer, ReceiptText, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "@/features/admin/walk-in-payments/walk-in-payments.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionErrors";
import { isPublicHost } from "@/lib/payments/customerLinkOrigin";
import { prepareScotiaPayment, redirectToScotiaPayment, SCOTIA_RETURN_URL } from "@/lib/payments/scotiaConnect";
import LinkActivityPanel from "@/features/admin/walk-in-payments/LinkActivityPanel";
import PublishedLinkPanel from "@/features/admin/walk-in-payments/PublishedLinkPanel";
import UnmatchedPaymentsQueue from "@/features/admin/walk-in-payments/UnmatchedPaymentsQueue";
import { useLiveWalkInPayment } from "@/features/admin/walk-in-payments/useLiveWalkInPayment";

type WalkInPayment = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  order_reference: string | null;
  reason: string | null;
  amount: number;
  currency: string;
  status: "pending" | "settled" | "failed";
  provider: string | null;
  payment_reference: string;
  gateway_transaction_id: string | null;
  gateway_response_code: string | null;
  gateway_fail_rc: string | null;
  card_brand: string | null;
  card_last4: string | null;
  paid_at: string | null;
  created_at: string;
};

const initialForm = { amount: "", customerName: "", customerEmail: "", orderReference: "", reason: "", contactId: "", expiresAt: "" };

/** What staff get back from publish_walk_in_payment, shown once and never re-readable. */
type PublishedLink = { paymentId: string; token: string; claimCode: string; expiresAt: string; amount: number };
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "BBD" }).format(amount);
const when = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const WalkInPaymentsPage = () => {
  const { realRole, isLoading } = useAdminRole();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entryOpen, setEntryOpen] = useState(Boolean(searchParams.get("payment")));
  const [collectionMethod, setCollectionMethod] = useState<"card" | "link" | "email" | "cash">("card");
  const [matchingOpen, setMatchingOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [payment, setPayment] = useState<WalkInPayment | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [publishedLink, setPublishedLink] = useState<PublishedLink | null>(null);
  const [pendingLinkAction, setPendingLinkAction] = useState<(() => Promise<void>) | null>(null);

  /** Customer links only work from the live site or Vercel; warn before creating one elsewhere. */
  const guardPublicLink = (action: () => Promise<void>) => {
    if (isPublicHost()) void action();
    else setPendingLinkAction(() => action);
  };

  const paymentId = searchParams.get("payment");
  const isStaff = realRole === "admin" || realRole === "operator";
  // Either the payment we came back from the gateway with, or the one a
  // customer is paying on their own device right now.
  const watchedPaymentId = paymentId ?? publishedLink?.paymentId;

  const loadPayment = useCallback(async () => {
    if (!watchedPaymentId || !isStaff) return;
    const { data, error: fetchError } = await (supabase as any)
      .from("walk_in_payments")
      .select("id,provider,customer_name,customer_email,order_reference,reason,amount,currency,status,payment_reference,gateway_transaction_id,gateway_response_code,gateway_fail_rc,card_brand,card_last4,paid_at,created_at")
      .eq("id", watchedPaymentId)
      .maybeSingle();
    const fetchedPayment = fetchError ? null : (data as WalkInPayment | null);
    setPayment(fetchedPayment);
    if (fetchError) setError(fetchError.message);
    if (fetchedPayment?.status === "settled") {
      setShowPrintModal(true);
      // The receipt replaces the waiting panel.
      setPublishedLink(null);
    }
  }, [isStaff, watchedPaymentId]);

  useEffect(() => {
    if (!watchedPaymentId || !isStaff) return;
    let alive = true;
    setLoadingResult(true);
    void loadPayment().finally(() => { if (alive) setLoadingResult(false); });
    return () => { alive = false; };
  }, [isStaff, loadPayment, watchedPaymentId]);

  // Flips this screen to the receipt the moment the customer's payment settles.
  useLiveWalkInPayment(publishedLink?.paymentId, Boolean(publishedLink), loadPayment);

  const newPayment = () => {
    setEntryOpen(true);
    setCollectionMethod("card");
    setForm(initialForm);
    setPayment(null);
    setError(null);
    setShowPrintModal(false);
    setPublishedLink(null);
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

  /**
   * Shared validation for all three ways of taking a payment. Returns the
   * parsed amount, or null after setting the error message.
   */
  const validatedAmount = (options?: { requireEmail?: boolean }): number | null => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.99) {
      setError("Enter a payment amount greater than zero.");
      return null;
    }
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return null;
    }
    const customerEmail = form.customerEmail.trim();
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setError("Please enter a valid customer email address, or leave it blank.");
      return null;
    }
    if (options?.requireEmail && !customerEmail) {
      setError("Enter the customer's email address to send them a payment request.");
      return null;
    }
    setError(null);
    return amount;
  };

  /**
   * Flow A. Mints a one-time link to share and a claim code for the counter QR.
   */
  const publishLink = async () => {
    const amount = validatedAmount();
    if (amount === null) return;

    const expiry = form.expiresAt ? new Date(form.expiresAt) : null;
    if (expiry && !(expiry.getTime() > Date.now())) {
      setError("Choose an expiry date and time in the future.");
      return;
    }

    setSubmitting(true);
    try {
      const paymentDetails = {
        p_amount: amount,
        p_customer_name: form.customerName,
        p_customer_email: form.customerEmail.trim() || null,
        p_order_reference: form.orderReference || null,
        p_reason: form.reason || null,
        p_contact_id: form.contactId || null,
      };
      const { data, error: publishError } = expiry
        ? await (supabase.rpc as any)("publish_walk_in_payment_with_expiry", {
          ...paymentDetails,
          p_expires_at: expiry.toISOString(),
        })
        : await (supabase.rpc as any)("publish_walk_in_payment", {
          ...paymentDetails,
          p_origin: "assisted_link",
        });
      if (publishError || !data) {
        throw new Error(publishError?.message || "Could not publish the payment link.");
      }
      const { id, token, claim_code, expires_at } = data as {
        id: string;
        token: string;
        claim_code: string;
        expires_at: string;
      };
      setPublishedLink({
        paymentId: id,
        token,
        claimCode: claim_code,
        expiresAt: expires_at,
        amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the payment link.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Flow B. The link token is minted and emailed entirely server-side, so it
   * never reaches this browser — the customer's inbox is the only copy.
   */
  const requestByEmail = async () => {
    const amount = validatedAmount({ requireEmail: true });
    if (amount === null) return;

    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("scotia-payment", {
        body: {
          action: "send-walkin-request",
          amount,
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(),
          orderReference: form.orderReference || undefined,
          reason: form.reason || undefined,
          contactId: form.contactId || undefined,
        },
      });
      if (invokeError || (data as { error?: string } | null)?.error) {
        throw new Error(await functionErrorMessage(invokeError, data, "Could not send the payment request."));
      }
      toast({
        title: "Payment request sent",
        description: `${form.customerName.trim()} can pay from the link emailed to ${form.customerEmail.trim()}.`,
      });
      setForm(initialForm);
      setEntryOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the payment request.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Cash already in hand: stored as settled straight away, then the receipt is
   * emailed (to the customer if given, otherwise the staff member).
   */
  const recordCash = async () => {
    const amount = validatedAmount();
    if (amount === null) return;
    setSubmitting(true);
    try {
      const { data: cashId, error: cashError } = await (supabase.rpc as any)("record_walk_in_cash_payment", {
        p_amount: amount,
        p_customer_name: form.customerName,
        p_customer_email: form.customerEmail.trim() || null,
        p_order_reference: form.orderReference || null,
        p_reason: form.reason || null,
        p_contact_id: form.contactId || null,
      });
      if (cashError || !cashId) throw new Error(cashError?.message || "Could not record the cash receipt.");
      const { error: mailError } = await supabase.functions.invoke("scotia-payment", {
        body: { action: "send-walkin-receipt", paymentId: cashId, force: false },
      });
      if (mailError) {
        toast({ variant: "destructive", title: "Cash recorded, email not sent", description: "Use Email receipt to try again." });
      }
      setSearchParams({ payment: String(cashId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the cash receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const takePayment = async () => {
    const amount = validatedAmount();
    if (amount === null) return;
    const customerEmail = form.customerEmail.trim();

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
  // A customer-device payment settles with no `?payment=` in the URL, so the
  // receipt keys off whichever payment this screen is watching.
  const displayedPayment = watchedPaymentId ? payment : null;
  const receiptReady = displayedPayment?.status === "settled";
  const isCash = displayedPayment?.provider === "cash";
  const displayReference = displayedPayment?.gateway_transaction_id || displayedPayment?.payment_reference;

  return (
    <div className="walk-in-payments-page flex min-h-0 flex-1 flex-col gap-3 overflow-hidden print:overflow-visible">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <AdminPageHeader icon={ReceiptText} title="Walk-in payments" />
          <p className="mt-1 text-sm text-muted-foreground">Prepare a payment, collect it, and keep the receipt.</p>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setMatchingOpen(true)}>Match payments</Button><Button onClick={newPayment}><RotateCcw className="mr-2 h-4 w-4" />New payment</Button></div>
      </div>

      <LinkActivityPanel onOpenReceipt={(id) => { setPayment(null); setSearchParams({ payment: id }); setEntryOpen(true); }} />
      <Dialog open={entryOpen} onOpenChange={(open) => { if (!submitting) setEntryOpen(open); }}>
        <DialogContent className="walk-in-payment-dialog max-h-[90dvh] max-w-3xl overflow-y-auto print:max-h-none print:overflow-visible">
          <DialogHeader>
            <DialogTitle>{receiptReady ? "Payment receipt" : publishedLink ? "Payment link" : "New payment"}</DialogTitle>
            <DialogDescription>{receiptReady || publishedLink ? "Card details stay on Scotia’s secure hosted payment page." : "Enter the details, then choose how to collect payment."}</DialogDescription>
          </DialogHeader>
          <Button className="payment-popup-close" variant="ghost" size="icon" aria-label="Close payment" disabled={submitting} onClick={() => setEntryOpen(false)}><X className="h-4 w-4" /></Button>
      {loadingResult ? <div className="py-8 text-center text-sm text-muted-foreground">Checking payment result…</div> : null}
      {returnedOutcome === "success" && !receiptReady && !loadingResult ? (
        <Alert variant="destructive" className="print:hidden"><AlertTitle>Payment is still being confirmed</AlertTitle><AlertDescription>Refresh shortly if the result does not appear. A receipt is shown only after the signed provider result is stored.</AlertDescription></Alert>
      ) : null}
      {returnedOutcome === "declined" && payment?.status === "failed" ? (
        <Alert variant="destructive" className="print:hidden"><AlertTitle>Payment declined</AlertTitle><AlertDescription>No payment was recorded. You can start a new payment if the customer wants to try another card.</AlertDescription></Alert>
      ) : null}
      {returnedOutcome === "cancelled" && payment?.status === "failed" ? (
        <Alert className="print:hidden"><AlertTitle>Payment cancelled</AlertTitle><AlertDescription>The payment was cancelled on the payment page. No payment was recorded. You can start a new payment when the customer is ready.</AlertDescription></Alert>
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
                    Payment of <strong>{money(Number(displayedPayment.amount))} BBD</strong> from{" "}
                    <strong>{displayedPayment.customer_name}</strong> {isCash ? "was recorded." : "was approved."}
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
                  <CardDescription>{isCash ? "Cash received at the counter" : "Verified Scotia/Fiserv card payment"}</CardDescription>
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
              <div><span className="text-muted-foreground">Amount</span><p className="text-xl font-semibold">{money(Number(displayedPayment.amount))} BBD</p></div>
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
              {isCash ? <div><span className="text-muted-foreground">Method</span><p>Cash</p></div> : <div><span className="text-muted-foreground">Card</span><p>{displayedPayment.card_brand || "Card"}{displayedPayment.card_last4 ? ` •••• ${displayedPayment.card_last4}` : ""}</p></div>}
            </CardContent>
          </Card>
        </>
      ) : null}


      {publishedLink && !receiptReady ? (
        <PublishedLinkPanel
          token={publishedLink.token}
          claimCode={publishedLink.claimCode}
          expiresAt={publishedLink.expiresAt}
          amountLabel={money(publishedLink.amount)}
          customerName={form.customerName.trim() || "the customer"}
          onCancel={newPayment}
        />
      ) : null}

      {!receiptReady && !publishedLink ? (
        <form className="payment-entry-form" onSubmit={(event) => {
          event.preventDefault();
          if (collectionMethod === "card") void takePayment();
          else if (collectionMethod === "link") guardPublicLink(publishLink);
          else if (collectionMethod === "email") guardPublicLink(requestByEmail);
          else void recordCash();
        }}>
          <div className="payment-entry-fields">
            <label className="payment-field payment-field-wide">Customer name
              <Input value={form.customerName} onChange={(event) => setForm(current => ({ ...current, customerName: event.target.value }))} placeholder="Customer or company name" autoComplete="name" required />
            </label>
            <label className="payment-field">Amount (BBD)
              <Input className="payment-amount-input" inputMode="decimal" type="number" min="0.01" max="999999.99" step="0.01" value={form.amount} onChange={(event) => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="0.00" autoComplete="off" required />
            </label>
            <label className="payment-field">Order / reference
              <Input value={form.orderReference} onChange={(event) => setForm(current => ({ ...current, orderReference: event.target.value }))} placeholder="Optional" autoComplete="off" />
            </label>
            <label className="payment-field payment-field-wide">Customer email
              <Input type="email" value={form.customerEmail} onChange={(event) => setForm(current => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" autoComplete="email" required={collectionMethod === "email"} />
            </label>
          </div>
          <details className="payment-entry-details">
            <summary>More details <span>Reason, contact and expiry</span></summary>
            <div className="payment-entry-fields">
              <label className="payment-field payment-field-wide">Reason
                <Textarea value={form.reason} onChange={(event) => setForm(current => ({ ...current, reason: event.target.value }))} placeholder="What is this payment for?" className="min-h-16" />
              </label>
              <label className="payment-field payment-field-wide">Link to a contact
                <ContactPickerSelect value={form.contactId} onValueChange={(contactId) => setForm(current => ({ ...current, contactId }))} placeholder="Search contacts" />
              </label>
              {collectionMethod === "link" ? <label className="payment-field payment-field-wide">Published link expiry
                <Input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm(current => ({ ...current, expiresAt: event.target.value }))} aria-describedby="published-link-expiry-help" />
                <span id="published-link-expiry-help" className="text-xs font-normal text-muted-foreground">Local date and time. Leave blank for the default.</span>
              </label> : null}
            </div>
          </details>
          <fieldset className="payment-method-options" disabled={submitting}>
            <legend>How will they pay?</legend>
            {([
              { key: "card", label: "Take card now", Icon: CreditCard },
              { key: "email", label: "Request by email", Icon: Mail },
              { key: "link", label: "Publish link", Icon: Link2 },
              { key: "cash", label: "Record cash", Icon: Banknote },
            ] as const).map(({ key, label, Icon }) => <label key={key} className={collectionMethod === key ? "payment-method-selected" : ""}>
              <input type="radio" name="collection-method" value={key} checked={collectionMethod === key} onChange={() => setCollectionMethod(key)} />
              <Icon className="h-4 w-4" />{label}
            </label>)}
          </fieldset>
          <p className="payment-method-description">{collectionMethod === "card" ? "Open Scotia’s secure card page on this device." : collectionMethod === "email" ? "Email the customer a private link to pay on their own device." : collectionMethod === "link" ? "Create a payment link to share, or a code to read at the counter." : "Record cash you have already received. A receipt will be prepared."}</p>
          <div className="payment-entry-footer">
            <p><ShieldCheck className="h-4 w-4" />Card details stay with Scotia.</p>
            <div><Button type="button" variant="outline" disabled={submitting} onClick={() => setEntryOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {collectionMethod === "card" ? "Continue to card payment" : collectionMethod === "email" ? "Send payment request" : collectionMethod === "link" ? "Create payment link" : "Record cash payment"}
            </Button></div>
          </div>
        </form>
      ) : null}

        </DialogContent>
      </Dialog>
      <Dialog open={matchingOpen} onOpenChange={setMatchingOpen}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Match payments</DialogTitle><DialogDescription>Review self-service payments that need an order or contact.</DialogDescription></DialogHeader>
          <UnmatchedPaymentsQueue />
        </DialogContent>
      </Dialog>



      <AlertDialog open={pendingLinkAction !== null} onOpenChange={(open) => { if (!open) setPendingLinkAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This link won't work for customers</AlertDialogTitle>
            <AlertDialogDescription>
              You are on <strong>{window.location.hostname}</strong>, which is not the live site. A payment link or QR
              code created here can't be opened from a customer's phone. Open this page on classicvisions.net to
              send a link customers can use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = pendingLinkAction;
                setPendingLinkAction(null);
                void action?.();
              }}
            >
              Continue anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WalkInPaymentsPage;
