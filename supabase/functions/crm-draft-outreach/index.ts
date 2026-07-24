// Generates an AI outreach draft for a CRM cadence step and files it into
// outreach_outbox as status 'draft' for human review (see docs/CRM_BUILD_PLAN.md).
// The human always approves/sends — this only prepares the missive.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy();

const CV_CONTEXT = `You write B2B outreach for Classic Visions (CV), a Caribbean ophthalmic lens supplier.
CV is a "virtual lab": it sources from many suppliers so it can fulfil almost any lens request quickly, competitively, and with a modern, caring, local service that overseas labs (Essilor, Rodenstock, Shamir, and regional labs) cannot match.
Positioning is Challenger-sale: do not claim to merely match the incumbent — reframe what good service looks like (fast turnaround, Caribbean-first care, transparent pricing, a modern ordering experience, a partner invested in the optician's growth).
Tone: warm, professional, confident, concise, never pushy or spammy. Short paragraphs. One clear ask. Write as a real salesperson, not marketing copy.`;

const STAGE_INTENT: Record<string, string> = {
  target: "First-ever contact. Introduce CV briefly, lead with one relevant value proposition, and ask one low-friction question to open a conversation.",
  outreach: "A short follow-up nudge to a prior message that had no reply. One line, friendly, no guilt.",
  engaged: "They have shown some interest. Keep the conversation going, surface a likely pain point with their current supplier, and offer to help.",
  qualifying: "Learn about their business and gaps. Ask a couple of specific, useful questions about volume, products, and what frustrates them about their current supplier.",
  presenting: "Make the tailored case for CV based on what is known about them. Focus on the specific gap CV fills for this optician.",
  trial_offer: "Propose a low-risk test shipment on a product they order regularly. Make it easy and irresistible; remove risk.",
  trial_active: "They placed a first order. Warm, proactive care message: confirm handling and invite feedback on quality and turnaround.",
  converting: "They are ordering occasionally. Encourage expanding share: introduce another product line or a volume benefit.",
  customer: "Existing customer. Relationship maintenance or a relevant new-product/service update.",
  nurture: "Not ready now. A light, warm, no-pressure touch that keeps CV top of mind and leaves a lure for when their situation changes.",
};

serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "operator"],
      sourceFunction: "crm-draft-outreach",
    });
    if (auth instanceof Response) return auth;

    const { contact_id, step_id, enrollment_id } = await req.json();
    if (!contact_id || !step_id) return json({ error: "contact_id and step_id are required" }, 400);

    // This client intentionally bypasses RLS to assemble an internal CRM
    // draft, but only after requirePrivilegedAccess has verified staff role.
    const supabase = auth.supabaseAdminClient;

    const { data: contact, error: cErr } = await supabase
      .from("contacts")
      .select("name,business_name,city,country,website,stage,pipeline,notes")
      .eq("id", contact_id)
      .single();
    if (cErr || !contact) return json({ error: `Contact not found: ${cErr?.message ?? ""}` }, 404);

    const { data: step, error: sErr } = await supabase
      .from("cadence_steps")
      .select("channel,subject,body_template,step_order,cadence_id")
      .eq("id", step_id)
      .single();
    if (sErr || !step) return json({ error: `Step not found: ${sErr?.message ?? ""}` }, 404);

    if (step.channel !== "email" && step.channel !== "whatsapp") {
      return json({ error: `Step channel '${step.channel}' is a task, not a draft` }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);

    const intent = STAGE_INTENT[String(contact.stage)] ?? STAGE_INTENT.target;
    const who = contact.business_name || contact.name;
    const channelRule =
      step.channel === "whatsapp"
        ? "Channel: WhatsApp. Keep it very short (2-4 sentences), no subject line, conversational."
        : "Channel: email. Include a short, specific subject line and a body of 2-3 short paragraphs with one clear call to action.";

    const userPrompt = `Write a ${step.channel} outreach message.
Recipient: ${who}${contact.city ? `, ${contact.city}` : ""}${contact.country ? `, ${contact.country}` : ""}.
${contact.website ? `Website: ${contact.website}.` : ""}
${contact.notes ? `What we know: ${contact.notes}.` : ""}
Pipeline stage: ${contact.stage}. Intent for this step: ${intent}
${step.body_template ? `Draft guidance / template to build from: ${step.body_template}` : ""}
${channelRule}
Return ONLY a JSON object: {"subject": string, "body": string}. For WhatsApp use an empty subject.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CV_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status === 429 ? 429 : aiRes.status === 402 ? 402 : 502;
      return json({ error: `AI gateway error (${aiRes.status})` }, status);
    }

    const completion = await aiRes.json();
    const content = completion?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { subject?: string; body?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { subject: "", body: String(content) };
    }

    const subject = step.channel === "email" ? (parsed.subject ?? step.subject ?? "") : null;
    const body = parsed.body ?? "";

    const { data: draft, error: iErr } = await supabase
      .from("outreach_outbox")
      .insert({
        contact_id,
        enrollment_id: enrollment_id ?? null,
        channel: step.channel,
        subject,
        body,
        status: "draft",
        generated_by: "ai",
      })
      .select("id,channel,subject,body,status")
      .single();
    if (iErr) return json({ error: `Could not save draft: ${iErr.message}` }, 500);

    return json({ draft });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
