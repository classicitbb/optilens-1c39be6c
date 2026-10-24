// Reads one captured photo / document and turns it into a draft Rx order.
//
//   POST { jobId }  (staff, or the customer who made the capture when their
//   account has the Rx order form switched on — at most DAILY_LIMIT reads a day)
//
// The image was already uploaded to the private `rx-captures` bucket and a
// `rx_capture_jobs` row created by the staff page. This function downloads it,
// asks the model to read it (forced tool call, text-only values), maps the result
// to a cv.rxorder/1 draft with `flags`, and stores both on the job. A failure
// leaves the job `failed` with a message; the page lets staff open it blank with
// the image beside it, so a capture never disappears.
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requireAuthenticatedUser } from "../_shared/http/auth.ts";
import { recordAiSpend } from "../_shared/aiSpend.ts";
import { EXTRACTION_INSTRUCTIONS, extractionToolParameters, mapExtractionToDraft } from "../_shared/rx-capture/extraction.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";
const MAX_BYTES = 12 * 1024 * 1024;
const DAILY_LIMIT = 40;

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

const json = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" } });

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const auth = await requireAuthenticatedUser(req, getCorsHeaders(req, corsPolicy));
  if (auth instanceof Response) return auth;
  const db = auth.supabaseAdminClient;

  const body = await req.json().catch(() => ({}));
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) return json(req, 400, { error: "jobId is required" });

  const fail = async (message: string, status = 502) => {
    await db.from("rx_capture_jobs").update({ status: "failed", error: message }).eq("id", jobId);
    return json(req, status, { error: message });
  };

  const { data: job, error: jobError } = await db.from("rx_capture_jobs").select("id, storage_path, mime_type, status, created_by, account_id").eq("id", jobId).maybeSingle();
  if (jobError || !job) return json(req, 404, { error: "Capture not found" });

  // Staff may read any capture. A customer may read only their own, and only while
  // the form is switched on for them and the account is one they belong to.
  const userId = auth.user.id;
  const { data: isStaff } = await db.rpc("has_edit_role", { _user_id: userId });
  if (!isStaff) {
    if (job.created_by !== userId) return json(req, 403, { error: "Not your capture" });
    const { data: formOn } = await db.rpc("can_access_customer_portal_feature", { p_user_id: userId, p_feature_key: "rx-order" });
    const { data: accountOk } = await db.rpc("can_access_portal_account", { p_customer_id: job.account_id, p_user_id: userId });
    if (!formOn || !accountOk) return json(req, 403, { error: "Reading from a photo is not enabled for your account." });
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await db.from("rx_capture_jobs").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", since);
    if ((count ?? 0) > DAILY_LIMIT) return json(req, 429, { error: "Daily limit reached — try again tomorrow." });
  }
  if (job.status === "ready") return json(req, 200, { status: "ready" });

  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey) return fail("Reading is not configured on this environment.", 503);

  await db.from("rx_capture_jobs").update({ status: "processing", error: null }).eq("id", jobId);

  try {
    const file = await db.storage.from("rx-captures").download(job.storage_path);
    if (file.error || !file.data) return await fail("The uploaded file could not be found.", 404);
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return await fail("That file is too large — keep it under 12 MB.", 413);

    const dataUrl = `data:${job.mime_type};base64,${toBase64(bytes)}`;
    const part = job.mime_type === "application/pdf"
      ? { type: "file", file: { filename: "prescription.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: EXTRACTION_INSTRUCTIONS },
          { role: "user", content: [{ type: "text", text: "Extract the prescription / order data from this employee-supplied capture." }, part] },
        ],
        tools: [{ type: "function", function: { name: "record_rx_order", description: "Record what the capture shows.", parameters: extractionToolParameters() } }],
        tool_choice: { type: "function", function: { name: "record_rx_order" } },
      }),
    });
    const metering = response.ok ? await response.clone().json().catch(() => null) : null;
    await recordAiSpend({ provider: "lovable-ai", product: "gateway", functionName: "rx-capture-extract", model: MODEL, httpStatus: response.status, usage: metering?.usage });

    if (response.status === 429) return await fail("Reading is busy — try again in a moment.", 429);
    if (response.status === 402) return await fail("AI credits are exhausted for this workspace.", 402);
    if (!response.ok) {
      console.error("rx-capture-extract gateway error", response.status, (await response.text()).slice(0, 300));
      return await fail(job.mime_type === "application/pdf" ? "That PDF could not be read — try a photo of it." : "The capture could not be read.");
    }

    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return await fail("Nothing could be read from that capture.");
    let raw: unknown;
    try { raw = JSON.parse(args); } catch { return await fail("The reading came back garbled — try again."); }

    const draft = mapExtractionToDraft(raw as never);
    await db.from("rx_capture_jobs").update({ status: "ready", error: null, extraction: raw, draft: draft.payload, model: MODEL }).eq("id", jobId);
    return json(req, 200, { status: "ready", flags: draft.flags.length });
  } catch (error) {
    console.error("rx-capture-extract failure", error);
    return await fail("The capture could not be read.", 500);
  }
});
