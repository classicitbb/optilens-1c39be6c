import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * helpdesk-inbound-email — Webhook receiver for inbound support emails.
 *
 * Accepts POST with either:
 *   1. JSON payload (generic / Cloudflare Workers)
 *   2. multipart/form-data (Mailgun Routes)
 *
 * Creates a helpdesk ticket. Matches sender to existing contacts.
 *
 * Auth: validated via a shared secret (HELPDESK_INBOUND_SECRET)
 *       sent as x-inbound-secret header OR as a "token" form/query param (Mailgun).
 */

const INBOUND_SECRET = Deno.env.get("HELPDESK_INBOUND_SECRET") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Extract email and display name from "Name <email>" or bare "email" */
function parseFrom(raw: string): { email: string; name: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^["']|["']$/g, ""), email: match[2].trim().toLowerCase() };
  const email = raw.trim().toLowerCase();
  return { email, name: email.split("@")[0] };
}

function generateTicketNumber(): string {
  return `TCK-${Date.now().toString().slice(-8)}`;
}

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  body_text: string;
  body_html?: string;
  message_id: string;
  date?: string;
}

/** Parse Mailgun multipart/form-data into our canonical shape */
async function parseMailgunForm(req: Request): Promise<InboundEmail> {
  const form = await req.formData();
  return {
    from: form.get("sender")?.toString() || form.get("from")?.toString() || "",
    to: form.get("recipient")?.toString() || form.get("To")?.toString() || "",
    subject: form.get("subject")?.toString() || form.get("Subject")?.toString() || "(no subject)",
    body_text: form.get("body-plain")?.toString() || form.get("stripped-text")?.toString() || "",
    body_html: form.get("body-html")?.toString() || form.get("stripped-html")?.toString() || undefined,
    message_id: form.get("Message-Id")?.toString() || form.get("message-id")?.toString() || "",
    date: form.get("Date")?.toString() || undefined,
  };
}

/** Parse JSON payload */
async function parseJsonBody(req: Request): Promise<InboundEmail> {
  const payload = await req.json();
  return {
    from: payload.from || "",
    to: payload.to || "",
    subject: payload.subject || "(no subject)",
    body_text: payload.body_text || "",
    body_html: payload.body_html || undefined,
    message_id: payload.message_id || "",
    date: payload.date || undefined,
  };
}

/** Extract auth token from multiple sources (header, query param, form field) */
function extractSecret(req: Request, url: URL, form?: FormData): string {
  // 1. x-inbound-secret header (preferred)
  const headerSecret = req.headers.get("x-inbound-secret");
  if (headerSecret) return headerSecret.trim();

  // 2. Authorization Bearer fallback
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();

  // 3. Query param "token" (Mailgun route can append ?token=xxx)
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken.trim();

  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isFormData = contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded");

  // --- Auth ---
  const secret = extractSecret(req, url);
  const expectedSecret = INBOUND_SECRET.trim();
  if (!expectedSecret || secret !== expectedSecret) {
    // For Mailgun form-data, the token might be in the form body
    // We need to clone the request to read the body twice
    if (isFormData && !secret) {
      // We'll check the token from form data after parsing
    } else {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  let email: InboundEmail;
  let formTokenChecked = false;

  try {
    if (isFormData) {
      const clonedReq = req.clone();
      email = await parseMailgunForm(req);
      
      // Check token from form field if header/query auth failed
      if (!secret) {
        const form = await clonedReq.formData();
        const formToken = form.get("token")?.toString()?.trim() || "";
        if (!formToken || formToken !== expectedSecret) {
          return json({ error: "Unauthorized" }, 401);
        }
        formTokenChecked = true;
      }
    } else {
      // Auth was already checked above for non-form requests
      if (!expectedSecret || secret !== expectedSecret) {
        return json({ error: "Unauthorized" }, 401);
      }
      email = await parseJsonBody(req);
    }
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  const { from, subject, body_text, body_html, message_id } = email;
  if (!from || !subject) {
    return json({ error: "Missing required fields: from, subject" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  // --- Dedup by message_id ---
  if (message_id) {
    const { data: existing } = await db
      .from("helpdesk_inbound_email_log")
      .select("id")
      .eq("message_id", message_id)
      .maybeSingle();

    if (existing) {
      return json({ ok: true, duplicate: true, logId: existing.id });
    }
  }

  const sender = parseFrom(from);
  const bodyContent = body_text || body_html || "(no body)";
  const ticketNumber = generateTicketNumber();
  const now = new Date().toISOString();

  // --- Match sender to a known contact ---
  let contactId: string | null = null;
  if (sender.email) {
    const { data: contact } = await db
      .from("contacts")
      .select("id")
      .ilike("email", sender.email)
      .maybeSingle();
    if (contact) contactId = contact.id;
  }

  // --- Create helpdesk ticket ---
  const { data: ticket, error: ticketErr } = await db
    .from("helpdesk_tickets")
    .insert({
      ticket_number: ticketNumber,
      title: subject.slice(0, 255),
      description: bodyContent.slice(0, 10000),
      priority: 1,
      source_channel: "email",
      customer_email: sender.email,
      partner_contact_id: contactId,
      opened_at: now,
    })
    .select("id")
    .single();

  if (ticketErr) {
    console.error("[helpdesk-inbound-email] Ticket insert error:", ticketErr);
    return json({ error: "Failed to create ticket" }, 500);
  }

  const ticketId = ticket.id;

  // --- Log the inbound email ---
  await db.from("helpdesk_inbound_email_log").insert({
    message_id: message_id || `gen-${Date.now()}`,
    mailbox: "support@classicvisions.net",
    from_address: sender.email,
    subject: subject.slice(0, 500),
    ticket_id: ticketId,
  });

  // --- Create ticket event ---
  await db.from("helpdesk_ticket_events").insert({
    ticket_id: ticketId,
    event_type: "ticket_created",
    payload: {
      source_channel: "email",
      from_address: sender.email,
      from_name: sender.name,
      message_id: message_id || null,
    },
  });

  // --- Send acknowledgment email ---
  try {
    await fetch(`${supabaseUrl}/functions/v1/helpdesk-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "ticket_created", ticketId }),
    });
  } catch (ackErr) {
    console.warn("[helpdesk-inbound-email] Acknowledgment email failed:", ackErr);
  }

  console.log(`[helpdesk-inbound-email] Created ticket ${ticketNumber} from ${sender.email}`);

  return json({
    ok: true,
    ticketId,
    ticketNumber,
    contactMatched: !!contactId,
  });
});
