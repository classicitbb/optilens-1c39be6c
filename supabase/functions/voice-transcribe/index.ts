import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

const json = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const auth = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ["admin"],
    sourceFunction: "voice-transcribe",
  });
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const audio = typeof body?.audio === "string" ? body.audio : "";
    const mimeType = typeof body?.mimeType === "string" && body.mimeType ? body.mimeType : "audio/webm";
    const vocabulary = typeof body?.vocabulary === "string" ? body.vocabulary.slice(0, 500) : "";
    if (!audio) return json(req, 400, { error: "No audio was provided." });
    if (audio.length > 12_000_000) return json(req, 413, { error: "Recording is too long. Keep it under about a minute." });

    const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
    if (!apiKey) return json(req, 503, { error: "Transcription is not configured on this environment." });

    const base = mimeType.split(";")[0].trim().toLowerCase();
    const extension = base.includes("wav") ? "wav"
      : base.includes("mp4") || base.includes("m4a") ? "mp4"
      : base.includes("mpeg") || base.includes("mp3") ? "mp3"
      : base.includes("ogg") ? "ogg"
      : "webm";
    const format = extension === "mp4" || extension === "mp3" ? "mp3" : extension === "wav" ? "wav" : "webm";

    let bytes: Uint8Array;
    try {
      const binary = atob(audio);
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    } catch {
      return json(req, 400, { error: "The recording could not be decoded." });
    }
    if (bytes.byteLength < 1500) return json(req, 400, { error: "That recording was too short to transcribe." });

    // Primary: purpose-built speech-to-text endpoint.
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: base || "audio/webm" }), `recording.${extension}`);
    if (vocabulary) form.append("prompt", `Domain terms: ${vocabulary}`);

    const speech = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (speech.status === 429) return json(req, 429, { error: "Transcription rate limit reached. Try again shortly." });
    if (speech.status === 402) return json(req, 402, { error: "AI credits are exhausted for this workspace." });
    if (speech.ok) {
      const payload = await speech.json().catch(() => null);
      const transcript = String(payload?.text ?? "").trim();
      if (transcript) return json(req, 200, { transcript, confidence: 0.92, engine: "speech" });
    } else {
      console.error("voice-transcribe speech endpoint error", speech.status, (await speech.text()).slice(0, 500));
    }

    // Fallback: multimodal chat model (handles containers the STT endpoint rejects).
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Transcribe the audio verbatim in English. Return only the transcript text, no commentary. Likely domain terms: ${vocabulary || "Classic Visions, portal access, pricelist, lens"}.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this recording." },
              { type: "input_audio", input_audio: { data: audio, format } },
            ],
          },
        ],
      }),
    });

    if (response.status === 429) return json(req, 429, { error: "Transcription rate limit reached. Try again shortly." });
    if (response.status === 402) return json(req, 402, { error: "AI credits are exhausted for this workspace." });
    if (!response.ok) {
      const detail = await response.text();
      console.error("voice-transcribe gateway error", response.status, detail.slice(0, 500));
      return json(req, 502, { error: "Transcription service failed." });
    }

    const payload = await response.json();
    const transcript = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!transcript) return json(req, 200, { transcript: "", confidence: 0 });
    return json(req, 200, { transcript, confidence: 0.9, engine: "chat" });

  } catch (error) {
    console.error("voice-transcribe failure", error);
    return json(req, 500, { error: error instanceof Error ? error.message : "Unknown transcription error" });
  }
});
