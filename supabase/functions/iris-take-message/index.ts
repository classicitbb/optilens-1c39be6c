import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@^4.4.3";
import { timingSafeEqual } from "../_shared/scotia/ipgConnect.ts";
import { sendManagedEmail } from "../_shared/email/managed-send.ts";

/**
 * iris-take-message edge function
 *
 * Called by the Telnyx voice assistant (Iris) "take-message" webhook tool when
 * a caller leaves a message. Creates a phone-channel helpdesk ticket and emails
 * the staff feedback address so the message is followed up.
 *
 * Auth: X-Iris-Secret header matching IRIS_WEBHOOK_SECRET. Server-to-server
 * only: no browser caller, so no CORS contract.
 */

const FEEDBACK_EMAIL_FALLBACK = "russell@classicvisions.net";

const messageSchema = z.object({
  caller_name: z.string().trim().min(1).max(100),
  business_name: z.string().trim().max(200).nullable().optional(),
  callback_number: z.string().trim().min(1).max(40),
  reason: z.string().trim().min(1).max(4000),
  caller_number: z.string().trim().max(40).nullable().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("IRIS_WEBHOOK_SECRET");
  const provided = req.headers.get("x-iris-secret") ?? "";
  if (!secret || !timingSafeEqual(provided, secret)) return json({ error: "Unauthorized" }, 401);

  const raw = await req.text();
  if (raw.length > 20_000) return json({ error: "Payload too large" }, 413);

  let payload: z.infer<typeof messageSchema>;
  try {
    payload = messageSchema.parse(JSON.parse(raw));
  } catch {
    return json({ error: "Name, callback number and reason are required." }, 400);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const openedAt = new Date().toISOString();
    const ticketNumber = `TCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const who = payload.business_name ? `${payload.caller_name} (${payload.business_name})` : payload.caller_name;
    const descParts = [
      payload.reason,
      "",
      `Caller: ${payload.caller_name}`,
      ...(payload.business_name ? [`Business: ${payload.business_name}`] : []),
      `Callback number: ${payload.callback_number}`,
      ...(payload.caller_number ? [`Called from: ${payload.caller_number}`] : []),
      "Taken by Iris (phone assistant).",
    ];

    const { data: ticket, error: ticketErr } = await supabase
      .from("helpdesk_tickets")
      .insert({
        ticket_number: ticketNumber,
        title: `Phone message: ${who}`.slice(0, 255),
        description: descParts.join("\n").slice(0, 10000),
        priority: 1,
        source_channel: "phone",
        source_metadata: { taken_by: "iris", callback_number: payload.callback_number, caller_number: payload.caller_number ?? null },
        opened_at: openedAt,
      })
      .select("id")
      .single();
    if (ticketErr) throw ticketErr;

    await supabase.from("helpdesk_ticket_events").insert({
      ticket_id: ticket.id,
      event_type: "ticket_created",
      payload: { source_channel: "phone", from_name: payload.caller_name, taken_by: "iris" },
    });

    // A failed alert must not fail the call: the ticket is already saved.
    try {
      const { data: settings } = await supabase.from("company_settings").select("feedback_email").limit(1).maybeSingle();
      const recipient = settings?.feedback_email?.trim() || FEEDBACK_EMAIL_FALLBACK;
      const text = [`New phone message taken by Iris (${ticketNumber}).`, "", ...descParts].join("\n");
      await sendManagedEmail(supabase, {
        messageId: `iris-message-${ticket.id}`,
        idempotencyKey: `iris-message-${ticket.id}`,
        to: recipient,
        subject: `Phone message from ${who} (${ticketNumber})`,
        html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
        text,
        label: "iris-take-message",
      });
    } catch (emailErr) {
      console.error("iris-take-message alert email failed (non-fatal)", emailErr);
    }

    return json({ success: true, ticket_number: ticketNumber, result: "Message saved. The team will follow up." });
  } catch (error) {
    console.error("iris-take-message failed", error);
    return json({ error: "The message could not be saved." }, 500);
  }
});
