import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTACT_RECIPIENT = "russell@classicvisions.net";
const MIN_FORM_FILL_MS = 2500;
const MAX_SUBMISSIONS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const inquirySchema = z.object({
  inquiryType: z.string().trim().min(1).max(50).default("contact"),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).nullable().optional(),
  message: z.string().trim().min(1).max(1000),
  pageSlug: z.string().trim().min(1).max(255).default("/"),
  sourceChannel: z.string().trim().min(1).max(50).default("website"),
  honeypot: z.string().optional().default(""),
  startedAt: z.string().trim().min(1),
});

const maskIp = (rawIp: string | null) => {
  if (!rawIp) return null;
  if (rawIp.includes(":")) {
    const parts = rawIp.split(":").filter(Boolean);
    return `${parts.slice(0, 4).join(":")}:*`;
  }
  const parts = rawIp.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  return rawIp;
};

const getIpHint = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return maskIp(forwardedFor || realIp || null);
};

const getUserAgent = (req: Request) => req.headers.get("user-agent")?.slice(0, 500) ?? "unknown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("CONTACT_FORM_FROM_EMAIL") ?? "Classic Visions <no-reply@classicvisions.net>";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase server configuration");
    }

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY for contact email delivery");
    }

    const payload = inquirySchema.parse(await req.json());

    if (payload.honeypot.trim()) {
      return new Response(JSON.stringify({ error: "Spam rejected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedAtMs = Date.parse(payload.startedAt);
    if (!Number.isFinite(startedAtMs) || Date.now() - startedAtMs < MIN_FORM_FILL_MS) {
      return new Response(JSON.stringify({ error: "Submission blocked by bot protection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ipHint = getIpHint(req);
    if (ipHint) {
      const rateLimitSince = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count, error: rateLimitError } = await supabase
        .from("public_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("ip_hint", ipHint)
        .gte("created_at", rateLimitSince);

      if (rateLimitError) throw rateLimitError;
      if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) {
        return new Response(JSON.stringify({ error: "Too many submissions, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: insertedInquiry, error: insertError } = await supabase
      .from("public_inquiries")
      .insert({
        inquiry_type: payload.inquiryType,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        message: payload.message,
        page_slug: payload.pageSlug,
        source_channel: payload.sourceChannel,
        honeypot: null,
        ip_hint: ipHint,
        notes: JSON.stringify({ userAgent: getUserAgent(req), delivered_to: CONTACT_RECIPIENT }),
      })
      .select("id, created_at")
      .single();

    if (insertError) throw insertError;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [CONTACT_RECIPIENT],
        reply_to: payload.email,
        subject: `Website contact inquiry from ${payload.name}`,
        text: [
          "New contact inquiry received.",
          "",
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          `Phone: ${payload.phone || "Not provided"}`,
          `Page: ${payload.pageSlug}`,
          `Submitted: ${insertedInquiry.created_at}`,
          "",
          "Message:",
          payload.message,
        ].join("
"),
      }),
    });

    if (!emailResponse.ok) {
      const emailErrorText = await emailResponse.text();
      throw new Error(`Failed to send notification email: ${emailErrorText}`);
    }

    return new Response(JSON.stringify({ success: true, inquiryId: insertedInquiry.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("contact-inquiry failed", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
