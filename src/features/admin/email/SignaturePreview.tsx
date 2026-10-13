import { useMemo } from "react";
import { sanitizeEmailHtml } from "./emailHtml";

/** Rendering boundary for saved signature HTML (tables, images and inline styles from Doc Studio or Outlook). */
export function SignaturePreview({ html }: { html: string }) {
  const clean = useMemo(() => sanitizeEmailHtml(html), [html]);
  if (!clean.trim()) return null;
  return (
    <div
      aria-label="Signature preview"
      className="max-h-40 overflow-auto rounded-md border border-dashed border-[hsl(var(--admin-border))] bg-white px-3 py-2 font-[Calibri,'Segoe_UI',sans-serif] text-[14px] text-[#1f1f1f]"
      // eslint-disable-next-line no-restricted-syntax -- sanitizeEmailHtml drops scripts, embeds, event handlers and unsafe URLs at this boundary.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
