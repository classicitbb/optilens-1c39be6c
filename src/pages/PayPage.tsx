import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import Seo from "@/components/seo/Seo";
import TurnstileWidget from "@/components/payments/TurnstileWidget";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { redirectToScotiaPayment } from "@/lib/payments/scotiaConnect";
import {
  fetchWalkInPaySettings,
  formatWalkInAmount,
  resolveWalkInPayment,
  startSelfServePayment,
  startWalkInPayment,
  type WalkInLinkRef,
  type WalkInPaySettings,
  type WalkInPaymentSummary,
} from "@/lib/payments/walkInPay";

type Step = "choose" | "code" | "confirm" | "self-serve";

/**
 * Public payment page. The counter QR points here, and the emailed pay link
 * arrives here with ?token=.
 *
 * One page with steps rather than several routes: the customer is completing a
 * single task on a phone and never needs to navigate or use the back button.
 *
 * Nothing on this page reads the database. Every lookup goes through the
 * `walkin-pay` Edge Function, which returns only the name, amount and reason
 * for the one payment whose token or code the customer holds.
 */
const PayPage = () => {
  const [searchParams] = useSearchParams();
  const emailedToken = searchParams.get("token");

  const [step, setStep] = useState<Step>(emailedToken ? "confirm" : "choose");
  const [linkRef, setLinkRef] = useState<WalkInLinkRef | null>(
    emailedToken ? { token: emailedToken } : null,
  );
  const [payment, setPayment] = useState<WalkInPaymentSummary | null>(null);
  const [settings, setSettings] = useState<WalkInPaySettings | null>(null);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfServe, setSelfServe] = useState({ name: "", email: "", amount: "", reason: "" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    fetchWalkInPaySettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  // An emailed link resolves itself on arrival.
  useEffect(() => {
    if (!emailedToken) return;
    setBusy(true);
    resolveWalkInPayment({ token: emailedToken })
      .then(setPayment)
      .catch((err: Error) => {
        setError(err.message);
        setStep("choose");
      })
      .finally(() => setBusy(false));
  }, [emailedToken]);

  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const submitCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const ref: WalkInLinkRef = { code };
      const found = await resolveWalkInPayment(ref);
      setPayment(found);
      setLinkRef(ref);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that payment.");
    } finally {
      setBusy(false);
    }
  };

  const payNow = async () => {
    if (!linkRef) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await startWalkInPayment(linkRef, email.trim() || undefined);
      redirectToScotiaPayment(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  const paySelfServe = async () => {
    setError(null);
    const amount = Number(selfServe.amount);
    if (!selfServe.name.trim()) return setError("Please enter your name.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter the amount you want to pay.");
    if (settings && (amount < settings.minAmount || amount > settings.maxAmount)) {
      return setError(
        `Enter an amount between ${formatWalkInAmount(settings.minAmount, "052")} and ${formatWalkInAmount(settings.maxAmount, "052")}.`,
      );
    }
    setBusy(true);
    try {
      const prepared = await startSelfServePayment({
        customerName: selfServe.name.trim(),
        customerEmail: selfServe.email.trim() || undefined,
        amount,
        reason: selfServe.reason.trim() || undefined,
        turnstileToken: turnstileToken ?? undefined,
      });
      redirectToScotiaPayment(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  const amountLabel = useMemo(
    () => (payment ? formatWalkInAmount(payment.amount, payment.currency) : ""),
    [payment],
  );

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <Seo
        title="Pay Classic Visions"
        description="Pay Classic Visions securely from your own device."
        canonicalPath="/pay"
        noindex
      />
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Pay Classic Visions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your card details are entered on Scotiabank&rsquo;s secure page, never on ours.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {step === "choose" ? (
          <Card>
            <CardHeader>
              <CardTitle>How would you like to pay?</CardTitle>
              <CardDescription>
                If a member of staff has already set up your payment, they will have given you a
                short code.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button size="lg" onClick={() => { setError(null); setStep("code"); }}>
                I have a code
              </Button>
              {settings?.selfServeEnabled ? (
                <Button size="lg" variant="outline" onClick={() => { setError(null); setStep("self-serve"); }}>
                  Pay without a code
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  To pay without a code, please see a member of staff.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {step === "code" ? (
          <Card>
            <CardHeader>
              <CardTitle>Enter your code</CardTitle>
              <CardDescription>The six-character code shown by the cashier.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="4K7-P2M"
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
                maxLength={9}
                className="text-center font-mono text-2xl tracking-[0.3em]"
              />
              <Button onClick={submitCode} disabled={busy || code.trim().length < 6}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Find my payment
              </Button>
              <Button variant="ghost" onClick={() => { setError(null); setStep("choose"); }}>
                Back
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {step === "confirm" ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirm your payment</CardTitle>
              <CardDescription>Check these details before you continue.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {busy && !payment ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              {payment ? (
                <>
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{payment.customerName}</p>
                    <p className="mt-3 text-sm text-muted-foreground">Amount</p>
                    <p className="text-3xl font-bold">{amountLabel}</p>
                    {payment.reason ? (
                      <>
                        <p className="mt-3 text-sm text-muted-foreground">For</p>
                        <p>{payment.reason}</p>
                      </>
                    ) : null}
                  </div>
                  {!payment.hasEmail ? (
                    <label className="grid gap-1.5 text-sm font-medium">
                      Email for your receipt <span className="font-normal text-muted-foreground">(optional)</span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    If this is not your payment, stop and speak to a member of staff.
                  </p>
                  <Button size="lg" onClick={payNow} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Pay {amountLabel}
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {step === "self-serve" ? (
          <Card>
            <CardHeader>
              <CardTitle>Pay without a code</CardTitle>
              <CardDescription>
                {settings
                  ? `Enter an amount between ${formatWalkInAmount(settings.minAmount, "052")} and ${formatWalkInAmount(settings.maxAmount, "052")}.`
                  : "Enter the amount you have agreed to pay."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Your name
                <Input
                  value={selfServe.name}
                  onChange={(event) => setSelfServe((c) => ({ ...c, name: event.target.value }))}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email for your receipt <span className="font-normal text-muted-foreground">(optional)</span>
                <Input
                  type="email"
                  value={selfServe.email}
                  onChange={(event) => setSelfServe((c) => ({ ...c, email: event.target.value }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Amount (BBD)
                <Input
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min={settings?.minAmount ?? 0.01}
                  max={settings?.maxAmount ?? 999999.99}
                  value={selfServe.amount}
                  onChange={(event) => setSelfServe((c) => ({ ...c, amount: event.target.value }))}
                  placeholder="0.00"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                What is this for?
                <Textarea
                  value={selfServe.reason}
                  onChange={(event) => setSelfServe((c) => ({ ...c, reason: event.target.value }))}
                  placeholder="For example: deposit on frames"
                  className="min-h-16"
                />
              </label>
              <TurnstileWidget onVerify={setTurnstileToken} onExpire={handleTurnstileExpire} />
              <Button size="lg" onClick={paySelfServe} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Continue to payment
              </Button>
              <Button variant="ghost" onClick={() => { setError(null); setStep("choose"); }}>
                Back
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Card details are never collected or stored by Classic Visions.
        </p>
      </div>
    </div>
  );
};

export default PayPage;
