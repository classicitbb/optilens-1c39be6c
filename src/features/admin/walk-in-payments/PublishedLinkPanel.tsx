import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PAY_PATH = "/pay";

/** 4K7P2M reads far better off a screen as 4K7-P2M. */
const formatCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);

const remaining = (expiresAt: string) => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

interface PublishedLinkPanelProps {
  claimCode: string;
  expiresAt: string;
  amountLabel: string;
  customerName: string;
  onCancel: () => void;
}

/**
 * Shown to staff after "Publish link". The customer scans the counter QR (which
 * points at /pay, not at this payment) and types the code.
 *
 * The QR deliberately carries no payment data — it is the same static URL that
 * is printed on the counter sticker, rendered here only so a customer who can
 * see the screen does not have to find the sticker.
 */
const PublishedLinkPanel = ({
  claimCode,
  expiresAt,
  amountLabel,
  customerName,
  onCancel,
}: PublishedLinkPanelProps) => {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() => remaining(expiresAt));
  const payUrl = `${window.location.origin}${PAY_PATH}`;

  useEffect(() => {
    const tick = window.setInterval(() => setCountdown(remaining(expiresAt)), 1000);
    return () => window.clearInterval(tick);
  }, [expiresAt]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(formatCode(claimCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission is not guaranteed on every device; the code is
      // displayed large enough to read aloud regardless.
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
          Ask them to scan the code on the counter, then read them the code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
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
              <>Expires in <span className="font-medium tabular-nums">{countdown}</span></>
            ) : (
              "This code has expired — publish a new link."
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Start over</Button>
          </div>
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
