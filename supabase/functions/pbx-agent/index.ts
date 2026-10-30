import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { digitsOnly, contactHasPhone, parseRecordingName, phonesMatch } from "../_shared/pbx/calls.ts";
import { recordAiSpend } from "../_shared/aiSpend.ts";

// LAN-agent side of the FreePBX integration. The agent on the office network
// polls this function over HTTPS (outbound only, no ports opened on the PBX):
//   claim        take the next queued click-to-call
//   report       say whether the PBX accepted it
//   sync         report call progress, collect hang up / record buttons
//   upload-url   get a one-time URL to upload a recording the staff chose to make
//   finish       link the uploaded recording to a contact, log it, transcribe it
// Auth is a shared secret (PBX_AGENT_TOKEN), not a user session.

const RECORDING_BUCKET = "call-recordings";
const MAX_TRANSCRIBE_BYTES = 24 * 1024 * 1024;
const STALE_REQUEST_MS = 2 * 60_000;
const SYNC_STATUSES = new Set(["ringing", "calling", "connected", "ended"]);

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const tokenMatches = (given: string, expected: string) => {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
};

const safeName = (filename: string) => (filename.split("/").pop() ?? "").replace(/[^A-Za-z0-9._-]/g, "_");

async function transcribe(bytes: Uint8Array, filename: string): Promise<{ transcript: string | null; summary: string | null }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey || bytes.byteLength > MAX_TRANSCRIBE_BYTES) return { transcript: null, summary: null };

  const form = new FormData();
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("file", new Blob([bytes.buffer as ArrayBuffer]), filename);
  form.append("prompt", "A phone call between an optical wholesaler's staff and a customer in Barbados or the Caribbean. Terms: Classic Visions, pricelist, lens, coating, progressive, Rx.");
  const speech = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  await recordAiSpend({ provider: "lovable-ai", product: "gateway", functionName: "pbx-agent", model: "openai/gpt-4o-mini-transcribe", httpStatus: speech.status });
  if (!speech.ok) {
    console.error("pbx-agent transcription failed", speech.status, (await speech.text()).slice(0, 300));
    return { transcript: null, summary: null };
  }
  const transcript = String((await speech.json().catch(() => null))?.text ?? "").trim();
  if (!transcript) return { transcript: null, summary: null };

  const chat = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Summarise this phone call transcript in at most four short bullet points: what the customer wanted, what was agreed, and any follow-up. Do not invent details that are not in the transcript. Return only the bullets." },
        { role: "user", content: transcript.slice(0, 30_000) },
      ],
    }),
  });
  const payload = chat.ok ? await chat.json().catch(() => null) : null;
  await recordAiSpend({ provider: "lovable-ai", product: "gateway", functionName: "pbx-agent", model: "google/gemini-2.5-flash", httpStatus: chat.status, usage: payload?.usage });
  const summary = String(payload?.choices?.[0]?.message?.content ?? "").trim() || null;
  return { transcript, summary };
}

// Outbound calls made from the website: the click already knows the contact.
// Otherwise fall back to the phone number, but only when exactly one contact has it.
async function findContactId(admin: SupabaseClient, remoteNumber: string | null, extension: string | null, recordedAt: Date): Promise<string | null> {
  if (!remoteNumber) return null;

  const since = new Date(recordedAt.getTime() - 2 * 60 * 60_000).toISOString();
  const { data: requests } = await admin
    .from("call_requests")
    .select("contact_id,destination,extension")
    .gte("created_at", since)
    .lte("created_at", recordedAt.toISOString())
    .not("contact_id", "is", null)
    .order("created_at", { ascending: false });
  const fromClick = (requests ?? []).find((row) => phonesMatch(row.destination, remoteNumber) && (!extension || row.extension === extension));
  if (fromClick?.contact_id) return fromClick.contact_id;

  const digits = digitsOnly(remoteNumber);
  if (digits.length < 7) return null;
  const { data: ids } = await admin.rpc("contact_ids_by_phone", { p_last7: digits.slice(-7) });
  if (!ids?.length) return null;
  const { data: contacts } = await admin.from("contacts").select("id,phone").in("id", ids);
  const matches = (contacts ?? []).filter((row) => contactHasPhone(row.phone, remoteNumber));
  return matches.length === 1 ? matches[0].id : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const expected = Deno.env.get("PBX_AGENT_TOKEN")?.trim();
  if (!expected) return json(503, { error: "PBX agent is not configured." });
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!tokenMatches(given, expected)) return json(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase environment variables");
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const body = await req.json().catch(() => ({}));

  if (body?.action === "claim") {
    // Never dial a click that has been sitting for minutes; the user has moved on.
    await admin
      .from("call_requests")
      .update({ status: "failed", error: "Expired before the PBX agent picked it up." })
      .eq("status", "requested")
      .lt("created_at", new Date(Date.now() - STALE_REQUEST_MS).toISOString());

    const { data: next } = await admin
      .from("call_requests")
      .select("id")
      .eq("status", "requested")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!next) return json(200, { request: null });

    // The status guard makes the claim atomic if two agents ever poll at once.
    const { data: claimed } = await admin
      .from("call_requests")
      .update({ status: "dialing", claimed_at: new Date().toISOString() })
      .eq("id", next.id)
      .eq("status", "requested")
      .select("id,extension,destination")
      .maybeSingle();
    return json(200, { request: claimed ?? null });
  }

  if (body?.action === "report") {
    if (typeof body.id !== "string") return json(400, { error: "id is required." });
    if (body.ok === false) {
      await admin
        .from("call_requests")
        .update({ status: "failed", error: String(body.error ?? "PBX refused the call.").slice(0, 500) })
        .eq("id", body.id);
    }
    return json(200, { ok: true });
  }

  if (body?.action === "sync") {
    // Progress of calls the agent started; the reply carries any button the staff
    // member pressed since (hang up, record, stop recording), each handed out once.
    const calls = Array.isArray(body.calls) ? body.calls.slice(0, 20) : [];
    const controls: Record<string, string> = {};
    for (const call of calls) {
      if (typeof call?.id !== "string" || !SYNC_STATUSES.has(call.status)) continue;
      const now = new Date().toISOString();
      const { data: row } = await admin
        .from("call_requests")
        .update({
          status: call.status,
          recording: call.recording === true,
          updated_at: now,
          ...(call.status === "ended" ? { ended_at: now, control: null } : {}),
          ...(call.error ? { error: String(call.error).slice(0, 500) } : {}),
        })
        .eq("id", call.id)
        .select("control,connected_at")
        .maybeSingle();
      if (call.status === "connected" && row && !row.connected_at) {
        await admin.from("call_requests").update({ connected_at: now }).eq("id", call.id);
      }
      if (row?.control) {
        await admin.from("call_requests").update({ control: null }).eq("id", call.id).eq("control", row.control);
        controls[call.id] = row.control;
      }
    }
    return json(200, { controls });
  }

  if (body?.action === "upload-url") {
    const name = safeName(String(body.filename ?? ""));
    if (!name) return json(400, { error: "filename is required." });

    const { data: existing } = await admin.from("call_recordings").select("id").eq("source_filename", name).maybeSingle();
    if (existing) return json(200, { exists: true });

    const now = new Date();
    const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${name}`;
    const { data, error } = await admin.storage.from(RECORDING_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return json(500, { error: "Could not prepare the upload." });
    return json(200, { exists: false, path, uploadUrl: data.signedUrl });
  }

  if (body?.action === "finish") {
    const name = safeName(String(body.filename ?? ""));
    const path = typeof body.path === "string" ? body.path : "";
    const recordedAt = new Date(body.recordedAt);
    if (!name || !path.endsWith(`/${name}`) || Number.isNaN(recordedAt.getTime())) {
      return json(400, { error: "filename, path and recordedAt are required." });
    }

    const { data: file, error: downloadError } = await admin.storage.from(RECORDING_BUCKET).download(path);
    if (downloadError || !file) return json(409, { error: "The recording has not been uploaded." });
    const bytes = new Uint8Array(await file.arrayBuffer());

    const parsed = parseRecordingName(name);
    const { data: existing } = await admin.from("call_recordings").select("id,transcript").eq("source_filename", name).maybeSingle();
    const { transcript, summary } = existing?.transcript ? { transcript: null, summary: null } : await transcribe(bytes, name);

    if (existing) {
      // A retried finish only fills in a transcript that failed the first time.
      if (transcript) await admin.from("call_recordings").update({ transcript, summary }).eq("id", existing.id);
      return json(200, { id: existing.id, transcribed: Boolean(existing.transcript || transcript) });
    }

    const contactId = await findContactId(admin, parsed.remoteNumber, parsed.extension, recordedAt);
    const { data: staff } = parsed.extension
      ? await admin.from("staff_extensions").select("user_id").eq("extension", parsed.extension).maybeSingle()
      : { data: null };

    const { data: recording, error } = await admin
      .from("call_recordings")
      .insert({
        source_filename: name,
        storage_path: path,
        contact_id: contactId,
        direction: parsed.direction,
        extension: parsed.extension,
        remote_number: parsed.remoteNumber,
        recorded_at: recordedAt.toISOString(),
        duration_seconds: Number.isFinite(body.durationSeconds) ? Math.round(body.durationSeconds) : null,
        transcript,
        summary,
      })
      .select("id")
      .single();
    if (error) return json(500, { error: "Could not save the recording." });

    // Only recordings we can tie to a customer go into the CRM timeline.
    if (contactId) {
      const { data: activity } = await admin
        .from("activities")
        .insert({
          contact_id: contactId,
          activity_type: "Call",
          type: "call",
          status: "completed",
          call_outcome: "reached",
          owner_id: staff?.user_id ?? null,
          created_by: staff?.user_id ?? null,
          content: summary ?? "Recorded call. Transcript not available.",
        })
        .select("id")
        .single();
      if (activity) await admin.from("call_recordings").update({ activity_id: activity.id }).eq("id", recording.id);
    }
    return json(200, { id: recording.id, matched: Boolean(contactId), transcribed: Boolean(transcript) });
  }

  return json(400, { error: "Unknown action." });
});
