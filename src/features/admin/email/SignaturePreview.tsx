import { useMemo } from "react";
import { sanitizeEmailHtml } from "./emailHtml";

const VARIANTS = {
  // Managing signatures: a framed preview.
  box: "max-h-40 overflow-auto rounded-md border border-dashed border-[hsl(var(--admin-border))] px-3 py-2",
  // Compose: under the message text, as recipients see it.
  inline: "overflow-x-auto rounded-sm px-2 py-1",
} as const;

/** Rendering boundary for saved signature HTML (tables, images and inline styles from Doc Studio or Outlook). */
export function SignaturePreview({ html, variant = "box" }: { html: string; variant?: keyof typeof VARIANTS }) {
  const clean = useMemo(() => sanitizeEmailHtml(html), [html]);
  if (!clean.trim()) return null;
  return (
    <div
      aria-label={variant === "inline" ? "Signature" : "Signature preview"}
      // White like the sent email, so signature colours designed for it stay readable in dark mode.
      className={`${VARIANTS[variant]} bg-white font-[Calibri,'Segoe_UI',sans-serif] text-[14px] text-[#1f1f1f]`}
      // eslint-disable-next-line no-restricted-syntax -- sanitizeEmailHtml drops scripts, embeds, event handlers and unsafe URLs at this boundary.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
