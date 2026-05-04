import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * helpdesk-inbound-email — Webhook receiver for inbound support emails.
 *
 * Accepts POST with a JSON payload representing a forwarded email and
 * creates a helpdesk ticket. Matches sender to existing contacts.
 *
 * Auth: validated via a shared secret (HELPDESK_INBOUND_SECRET).
 *
 * Payload (application/json):
 *   {
 *     from:      "Jane Doe <jane@example.com>" | "jane@example.com",
 *     to:        "support@classicvisions.net",
 *     subject:   "Order issue",
 *     body_text: "Plain text body…",
 *     body_html: "<p>HTML body…</p>",        // optional
 *     message_id: "<abc123@mail.example.com>", // RFC Message-ID for dedup
 *     date:      "2026-05-04T12:00:00Z"       // optional
 *   }
 *
 * Compatible with mail-forwarding services like Cloudflare Email Routing
 * (Workers → fetch), Mailgun Routes, SendGrid Inbound Parse (with a
 * lightweight adapter), or any service that can POST JSON.
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

Deno.serve(async (req) => {
  console.log("[helpdesk-inbound-email] Request received:", req.method, req.url);
  console.log("[helpdesk-inbound-email] Has x-inbound-secret:", !!req.headers.get("x-inbound-secret"));
  console.log("[helpdesk-inbound-email] INBOUND_SECRET set:", !!INBOUND_SECRET);
  // Only accept POST
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Auth via shared secret — use x-inbound-secret header (Authorization is
  // intercepted by the Supabase gateway). Also accept Authorization Bearer
  // as fallback for direct callers.
  const secret =
    req.headers.get("x-inbound-secret") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  console.log("[helpdesk-inbound-email] Secret length:", secret.length, "Expected length:", INBOUND_SECRET.length);
  console.log("[helpdesk-inbound-email] First 8 chars match:", secret.slice(0,8) === INBOUND_SECRET.slice(0,8));
  if (!INBOUND_SECRET || secret !== INBOUND_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, string>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { from, subject, body_text, body_html, message_id } = payload;
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

  // --- Send acknowledgment email if we have the helpdesk-email function ---
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
