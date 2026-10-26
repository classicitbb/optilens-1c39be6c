import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { getIpHintFromRequest, getUserAgentFromRequest, logSecurityAuditEvent } from "../_shared/security/auditLogger.ts";
import { contactHasPhone, toDialDigits } from "../_shared/pbx/calls.ts";

// Staff-facing side of the FreePBX integration: queue a click-to-call and hand
// out short-lived playback links for recordings. The LAN agent (pbx-agent)
// does the actual dialling.

const corsPolicy = createCorsPolicy({ allowMethods: "POST, OPTIONS" });
const RECORDING_BUCKET = "call-recordings";
const PLAYBACK_SECONDS = 300;

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ["admin", "operator"],
    sourceFunction: "pbx-calls",
  });
  if (auth instanceof Response) return auth;
  const { user, supabaseAdminClient: admin } = auth;

  const body = await req.json().catch(() => ({}));

  if (body?.action === "request-call") {
    const contactId = typeof body.contactId === "string" ? body.contactId : "";
    if (!contactId) return json(400, { error: "contactId is required." });

    const { data: contact } = await admin.from("contacts").select("id,phone").eq("id", contactId).maybeSingle();
    if (!contact) return json(404, { error: "Contact not found." });

    // Dial the number the user picked if it really belongs to the contact, else the first one.
    const numbers = (contact.phone ?? "").split(/[,;/\n]+/).map((part: string) => part.trim()).filter(Boolean);
    const requested = typeof body.phone === "string" ? body.phone : "";
    const chosen = requested && contactHasPhone(contact.phone, requested) ? requested : numbers[0];
    const destination = toDialDigits(chosen);
    if (!destination) return json(422, { error: "This contact has no phone number that can be dialled." });

    const { data: mapping } = await admin.from("staff_extensions").select("extension").eq("user_id", user.id).maybeSingle();
    if (!mapping) return json(422, { error: "You don't have a phone extension assigned yet. Ask an admin to add one." });

    const { count } = await admin
      .from("call_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .eq("status", "requested");
    if ((count ?? 0) > 0) return json(429, { error: "Your previous call is still being connected." });

    const { data: row, error } = await admin
      .from("call_requests")
      .insert({ contact_id: contact.id, requested_by: user.id, extension: mapping.extension, destination })
      .select("id")
      .single();
    if (error) return json(500, { error: "Could not queue the call." });
    return json(200, { id: row.id, extension: mapping.extension });
  }

  if (body?.action === "recording-url") {
    const recordingId = typeof body.recordingId === "string" ? body.recordingId : "";
    const { data: recording } = await admin
      .from("call_recordings")
      .select("id,storage_path,contact_id")
      .eq("id", recordingId)
      .maybeSingle();
    if (!recording) return json(404, { error: "Recording not found." });

    const { data: signed, error } = await admin.storage.from(RECORDING_BUCKET).createSignedUrl(recording.storage_path, PLAYBACK_SECONDS);
    if (error || !signed) return json(500, { error: "Could not open the recording." });

    // Training playback is a disclosure of customer audio, so every one is logged.
    await logSecurityAuditEvent({
      category: "privileged_action",
      eventType: "pbx.recording_played",
      severity: "info",
      actorUserId: user.id,
      sourceFunction: "pbx-calls",
      sourcePath: new URL(req.url).pathname,
      ipHint: getIpHintFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
      payload: { recordingId: recording.id, contactId: recording.contact_id },
    });
    return json(200, { url: signed.signedUrl, expiresInSeconds: PLAYBACK_SECONDS });
  }

  return json(400, { error: "Unknown action." });
});
