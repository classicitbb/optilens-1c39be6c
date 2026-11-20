import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customerLinkOrigin } from "@/lib/payments/customerLinkOrigin";

const PAY_PATH = "/pay";

/** 4K7P2M reads far better off a screen as 4K7-P2M. */
const formatCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);

const expiryFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const remaining = (expiresAt: string) => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days}d ${Math.floor((ms % 86400000) / 3600000)}h`;
  const hours = Math.floor(ms / 3600000);
  if (hours > 0) return `${hours}h ${Math.floor((ms % 3600000) / 60000)}m`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

interface PublishedLinkPanelProps {
  token: string;
  claimCode: string;
  expiresAt: string;
  amountLabel: string;
  customerName: string;
  onCancel: () => void;
}

/**
 * Shown after "Publish link". Staff can share the one-time link or use the
 * static counter QR with the claim code.
 */
const PublishedLinkPanel = ({
  token,
  claimCode,
  expiresAt,
  amountLabel,
  customerName,
  onCancel,
}: PublishedLinkPanelProps) => {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [countdown, setCountdown] = useState(() => remaining(expiresAt));
  const payUrl = `${customerLinkOrigin()}${PAY_PATH}`;
  const paymentUrl = `${payUrl}?${new URLSearchParams({ token })}`;

  useEffect(() => {
    const tick = window.setInterval(() => setCountdown(remaining(expiresAt)), 1000);
    return () => window.clearInterval(tick);
  }, [expiresAt]);

  const copy = async (target: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(target === "link" ? paymentUrl : formatCode(claimCode));
      setCopied(target);
    } catch {
      if (target === "link") setShowLink(true);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Waiting for {customerName} to pay
        </CardTitle>
        <CardDescription>
          Share the payment link so they can pay directly, or ask them to scan the counter QR and enter the code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto rounded-lg bg-white p-3">
          <QRCodeSVG value={payUrl} size={150} includeMargin />
        </div>
        <div className="grid gap-3 text-center sm:text-left">
          <div>
            <p className="text-sm text-muted-foreground">Their code</p>
            <p className="font-mono text-4xl font-bold tracking-[0.2em]">{formatCode(claimCode)}</p>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">Amount </span>
            <span className="font-semibold">{amountLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {countdown ? (
              <>
                Expires <time dateTime={expiresAt}>{expiryFormat.format(new Date(expiresAt))}</time>
                {" "}({countdown} remaining)
              </>
            ) : (
              "This payment link and code have expired. Publish a new link."
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button size="sm" disabled={!countdown} onClick={() => void copy("link")}>
              {copied === "link" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === "link" ? "Payment link copied" : "Copy payment link"}
            </Button>
            <Button variant="outline" size="sm" disabled={!countdown} onClick={() => void copy("code")}>
              {copied === "code" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === "code" ? "Code copied" : "Copy code"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Start over</Button>
          </div>
          {showLink && countdown ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Copy this payment link manually
              <Input readOnly value={paymentUrl} onFocus={(event) => event.currentTarget.select()} />
            </label>
          ) : null}
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <Loader2 className="h-4 w-4 animate-spin" />
            This updates by itself when they pay.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublishedLinkPanel;
