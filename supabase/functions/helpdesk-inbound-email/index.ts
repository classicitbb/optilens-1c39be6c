import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * helpdesk-inbound-email — Webhook receiver for inbound support emails.
 *
 * Accepts POST with either:
 *   1. JSON payload (generic / Cloudflare Workers)
 *   2. multipart/form-data (Mailgun Routes)
 *   3. application/x-www-form-urlencoded
 *
 * Auth: shared secret via x-inbound-secret header, Authorization Bearer,
 *       ?token= query param, or "token" form field.
 */

const INBOUND_SECRET = (Deno.env.get("HELPDESK_INBOUND_SECRET") ?? "").trim();
const TAG = "[helpdesk-inbound-email]";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseFrom(raw: string): { email: string; name: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ""),
      email: match[2].trim().toLowerCase(),
    };
  }
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

/** Build canonical email from a FormData instance */
function emailFromForm(form: FormData): InboundEmail {
  // Log every field Mailgun sent so we can diagnose mapping issues
  const fieldNames: string[] = [];
  form.forEach((_v, k) => fieldNames.push(k));
  console.log(`${TAG} Form fields received: ${fieldNames.join(", ")}`);

  return {
    from: str(form, "sender") || str(form, "from") || "",
    to: str(form, "recipient") || str(form, "To") || str(form, "to") || "",
    subject: str(form, "subject") || str(form, "Subject") || "(no subject)",
    body_text: str(form, "body-plain") || str(form, "stripped-text") || "",
    body_html: str(form, "body-html") || str(form, "stripped-html") || undefined,
    message_id: str(form, "Message-Id") || str(form, "message-id") || str(form, "Message-ID") || "",
    date: str(form, "Date") || str(form, "date") || undefined,
  };
}

/** Safe form.get as trimmed string */
function str(form: FormData, key: string): string {
  return form.get(key)?.toString().trim() ?? "";
}

Deno.serve(async (req) => {
  // --- Preflight ---
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isFormData =
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded");

  console.log(`${TAG} ── Incoming request ──`);
  console.log(`${TAG} Content-Type: ${contentType}`);
  console.log(`${TAG} isFormData: ${isFormData}`);
  console.log(`${TAG} URL path: ${url.pathname}${url.search}`);
  console.log(`${TAG} Has x-inbound-secret header: ${!!req.headers.get("x-inbound-secret")}`);
  console.log(`${TAG} Has Authorization header: ${!!req.headers.get("authorization")}`);
  console.log(`${TAG} Has ?token query param: ${url.searchParams.has("token")}`);

  // ── Parse body first (for form-data we need the form to check the token field) ──
  let email: InboundEmail;
  let formTokenValue = "";

  try {
    if (isFormData) {
      const form = await req.formData();
      email = emailFromForm(form);
      formTokenValue = str(form, "token");
      console.log(`${TAG} Has "token" form field: ${!!formTokenValue}`);
    } else {
      const payload = await req.json();
      email = {
        from: payload.from || "",
        to: payload.to || "",
        subject: payload.subject || "(no subject)",
        body_text: payload.body_text || "",
        body_html: payload.body_html || undefined,
        message_id: payload.message_id || "",
        date: payload.date || undefined,
      };
      console.log(`${TAG} JSON fields: from=${!!email.from}, subject=${!!email.subject}, message_id=${!!email.message_id}`);
    }
  } catch (parseErr) {
    console.error(`${TAG} Body parse error:`, parseErr);
    return jsonResponse({ error: "Invalid payload" }, 400);
  }

  // ── Auth: try every source in priority order ──
  let tokenSource = "none";
  let providedSecret = "";

  const headerSecret = req.headers.get("x-inbound-secret")?.trim();
  if (headerSecret) {
    providedSecret = headerSecret;
    tokenSource = "x-inbound-secret header";
  }

  if (!providedSecret) {
    const authHeader = (req.headers.get("authorization") || "").trim();
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      providedSecret = authHeader.slice(7).trim();
      tokenSource = "Authorization Bearer";
    }
  }

  if (!providedSecret) {
    const queryToken = url.searchParams.get("token")?.trim();
    if (queryToken) {
      providedSecret = queryToken;
      tokenSource = "?token query param";
    }
  }

  if (!providedSecret && formTokenValue) {
    providedSecret = formTokenValue;
    tokenSource = "token form field";
  }

  console.log(`${TAG} Token source: ${tokenSource}`);
  console.log(`${TAG} Token length: ${providedSecret.length}, expected length: ${INBOUND_SECRET.length}`);

  if (!INBOUND_SECRET) {
    console.error(`${TAG} HELPDESK_INBOUND_SECRET env var is empty!`);
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  if (providedSecret !== INBOUND_SECRET) {
    console.warn(`${TAG} AUTH FAILED — provided[0..8]="${providedSecret.slice(0, 8)}…" expected[0..8]="${INBOUND_SECRET.slice(0, 8)}…"`);
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  console.log(`${TAG} Auth OK via ${tokenSource}`);

  // ── Validate required fields ──
  const { from, subject, body_text, body_html, message_id } = email;
  if (!from || !subject) {
    console.warn(`${TAG} Missing fields — from="${from}", subject="${subject}"`);
    return jsonResponse({ error: "Missing required fields: from, subject" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  // ── Dedup by message_id ──
  if (message_id) {
    const { data: existing } = await db
      .from("helpdesk_inbound_email_log")
      .select("id")
      .eq("message_id", message_id)
      .maybeSingle();

    if (existing) {
      console.log(`${TAG} Duplicate message_id: ${message_id}`);
      return jsonResponse({ ok: true, duplicate: true, logId: existing.id });
    }
  }

  const sender = parseFrom(from);
  const bodyContent = body_text || body_html || "(no body)";
  const ticketNumber = generateTicketNumber();
  const now = new Date().toISOString();

  // ── Match sender to contact ──
  let contactId: string | null = null;
  if (sender.email) {
    const { data: contact } = await db
      .from("contacts")
      .select("id")
      .ilike("email", sender.email)
      .maybeSingle();
    if (contact) contactId = contact.id;
  }

  // ── Create ticket ──
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
    console.error(`${TAG} Ticket insert error:`, ticketErr);
    return jsonResponse({ error: "Failed to create ticket" }, 500);
  }

  const ticketId = ticket.id;

  // ── Log inbound email ──
  await db.from("helpdesk_inbound_email_log").insert({
    message_id: message_id || `gen-${Date.now()}`,
    mailbox: "support@classicvisions.net",
    from_address: sender.email,
    subject: subject.slice(0, 500),
    ticket_id: ticketId,
  });

  // ── Ticket event ──
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

  // ── Acknowledgment email ──
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
    console.warn(`${TAG} Acknowledgment email failed:`, ackErr);
  }

  console.log(`${TAG} ✅ Created ticket ${ticketNumber} from ${sender.email} (contact: ${contactId ?? "none"})`);

  return jsonResponse({
    ok: true,
    ticketId,
    ticketNumber,
    contactMatched: !!contactId,
  });
});
