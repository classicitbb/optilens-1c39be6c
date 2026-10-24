import { escapeHtml, htmlToPlainText, sanitizeEmailHtml, textToHtml } from "./emailHtml";

export function formatEmailDate(value: string | null, now = new Date()): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

export function formatFullDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type Quotable = { from_name: string | null; from_address: string | null; sent_at: string | null; subject: string | null; body_text: string | null; body_html?: string | null };

export function quoteForReply(message: Quotable): string {
  const who = message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address ?? "";
  const quoted = (message.body_html ? htmlToPlainText(sanitizeEmailHtml(message.body_html)) : message.body_text ?? "").split(/\r?\n/).map((line) => `> ${line}`).join("\n");
  return `\n\nOn ${formatFullDate(message.sent_at)}, ${who} wrote:\n${quoted}`;
}

export function quoteHtmlForReply(message: Quotable): string {
  const who = message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address ?? "";
  const original = message.body_html
    ? sanitizeEmailHtml(message.body_html)
    : textToHtml(message.body_text ?? "");
  return `<div style="margin-top:1em">On ${escapeHtml(formatFullDate(message.sent_at))}, ${escapeHtml(who)} wrote:</div>` +
    `<blockquote style="margin:0 0 0 0.8ex;border-left:1px solid #cccccc;padding-left:1ex">${original}</blockquote>`;
}

export function forwardHeader(message: Quotable & { to: { address: string }[] }): string {
  return [
    "",
    "",
    "---------- Forwarded message ----------",
    `From: ${message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address ?? ""}`,
    `Date: ${formatFullDate(message.sent_at)}`,
    `Subject: ${message.subject ?? ""}`,
    `To: ${message.to.map((item) => item.address).join(", ")}`,
    "",
    message.body_text ?? "",
  ].join("\n");
}

export function prefixSubject(prefix: "RE" | "FW", subject: string | null): string {
  const value = subject ?? "";
  return new RegExp(`^${prefix}:`, "i").test(value) ? value : `${prefix}: ${value}`;
}

export type ComposeDraft = {
  account: string;
  to: string;
  cc: string;
  subject: string;
  /** Opening body text (plain); the editor turns it into paragraphs. */
  text: string;
  /** Reply/forward original, kept below the signature and sent as a quote. */
  quoted: string;
  /** Preserved HTML original for replies; plain quoted remains the text part. */
  quotedHtml?: string;
  replyToMessageId?: number;
  attachments: File[];
};

export const EMPTY_DRAFT: ComposeDraft = { account: "", to: "", cc: "", subject: "", text: "", quoted: "", attachments: [] };

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hasRemoteImages(html: string | null): boolean {
  return Boolean(html && /<img[^>]+src=["']?https?:/i.test(html));
}
