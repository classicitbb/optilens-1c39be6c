import { Link, useSearchParams } from "react-router";
import { CircleAlert, ShieldCheck } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Where scotia-return sends a customer who paid on their own device.
 *
 * This page deliberately shows no payment detail. An anonymous browser cannot
 * read walk_in_payments, and the customer has already spent their link, so
 * there is nothing left to look up — the receipt arrives by email and the
 * cashier's screen has already updated.
 */
const PayResultPage = () => {
  const [searchParams] = useSearchParams();
  const outcome = searchParams.get("scotia");
  const approved = outcome === "success";
  const cancelled = outcome === "cancelled";

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <Seo
        title="Payment result | Classic Visions"
        description="Your Classic Visions payment result."
        canonicalPath="/pay/result"
        noindex
      />
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            {approved ? (
              <>
                <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
                <CardTitle className="mt-2 text-emerald-700">Payment received</CardTitle>
                <CardDescription>
                  Thank you. A member of staff has been notified and your receipt is on its way
                  by email if you gave us an address.
                </CardDescription>
              </>
            ) : (
              <>
                <CircleAlert className="mx-auto h-10 w-10 text-destructive" />
                <CardTitle className="mt-2">{cancelled ? "Payment cancelled" : "Payment not completed"}</CardTitle>
                <CardDescription>
                  No payment was taken. Please speak to a member of staff, who can set up a new
                  payment for you, or try again with a different card.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            {!approved ? (
              <Button asChild>
                <Link to="/pay">Try again</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link to="/">Visit Classic Visions</Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Payments are reflected on your account once they are reconciled with the bank, which
          takes 3&ndash;5 business days.
        </p>
      </div>
    </div>
  );
};

export default PayResultPage;
