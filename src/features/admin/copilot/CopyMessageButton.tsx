import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Copies a message's text. Shows a brief confirmation; stays silent if the clipboard is blocked. */
export function CopyMessageButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("h-7 w-7 text-foreground/50 hover:text-foreground", className)}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy"}
      onClick={() => void copy()}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default CopyMessageButton;
