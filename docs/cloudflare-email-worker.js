/**
 * Cloudflare Email Routing Worker
 *
 * Catches emails sent to support@classicvisions.net and POSTs them
 * as JSON to the helpdesk-inbound-email webhook.
 *
 * Setup:
 * 1. In Cloudflare Dashboard → Email Routing → Email Workers, create a worker
 *    with this code.
 * 2. Add environment variable HELPDESK_INBOUND_SECRET (Settings → Variables)
 *    with your webhook secret.
 * 3. Under Email Routing → Routing Rules, create a rule:
 *    - Match: support@classicvisions.net
 *    - Action: Send to Worker → (this worker)
 */

const WEBHOOK_URL =
  "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/helpdesk-inbound-email";

export default {
  async email(message, env, ctx) {
    try {
      // Read the raw MIME message
      const rawEmail = await new Response(message.raw).text();

      // Extract fields from headers
      const subject = message.headers.get("subject") || "(no subject)";
      const messageId = message.headers.get("message-id") || "";
      const date = message.headers.get("date") || new Date().toISOString();

      // Extract plain text body from MIME
      const bodyText = extractPlainText(rawEmail);

      const payload = {
        from: message.from,
        to: message.to,
        subject,
        body_text: bodyText,
        message_id: messageId,
        date,
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-inbound-secret": env.HELPDESK_INBOUND_SECRET || "",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Webhook returned ${response.status}: ${text}`);
        // Still forward to fallback so we don't lose the email
        await message.forward("support@classicvisions.net");
      } else {
        const result = await response.json();
        console.log("Ticket created:", result.ticketNumber || "duplicate");
      }
    } catch (err) {
      console.error("Email worker error:", err);
      // Forward on failure so the email isn't lost
      await message.forward("support@classicvisions.net");
    }
  },
};

/**
 * Basic MIME plain-text extractor.
 * Looks for text/plain parts in a multipart message, or returns
 * the full body if not multipart (stripping HTML tags as fallback).
 */
function extractPlainText(raw) {
  // Check for multipart boundary
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split(`--${boundary}`);
    for (const part of parts) {
      if (/content-type:\s*text\/plain/i.test(part)) {
        // Find the blank line separating headers from body
        const bodyStart = part.indexOf("\r\n\r\n");
        if (bodyStart !== -1) {
          let body = part.slice(bodyStart + 4);
          // Remove trailing boundary marker
          const endBoundary = body.indexOf(`--${boundary}`);
          if (endBoundary !== -1) body = body.slice(0, endBoundary);
          return decodeQuotedPrintable(body.trim());
        }
      }
    }
    // Fallback: try text/html part and strip tags
    for (const part of parts) {
      if (/content-type:\s*text\/html/i.test(part)) {
        const bodyStart = part.indexOf("\r\n\r\n");
        if (bodyStart !== -1) {
          let body = part.slice(bodyStart + 4);
          const endBoundary = body.indexOf(`--${boundary}`);
          if (endBoundary !== -1) body = body.slice(0, endBoundary);
          return stripHtml(decodeQuotedPrintable(body.trim()));
        }
      }
    }
  }

  // Non-multipart: find body after headers
  const headerEnd = raw.indexOf("\r\n\r\n");
  if (headerEnd !== -1) {
    const body = raw.slice(headerEnd + 4);
    if (/<html/i.test(body)) return stripHtml(body);
    return body.trim().slice(0, 10000);
  }

  return raw.slice(0, 10000);
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
    .slice(0, 10000);
}

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}
