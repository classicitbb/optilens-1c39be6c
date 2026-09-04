import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { checkRateLimit, getClientIp } from "../_shared/http/rateLimit.ts";
import { PUBLIC_ASSISTANT_SYSTEM_PROMPT } from "../_shared/copilot/prompts.ts";

const corsPolicy = createCorsPolicy();

const SYSTEM_PROMPT = PUBLIC_ASSISTANT_SYSTEM_PROMPT;

type ContextLink = {
  title?: string;
  description?: string;
  path?: string;
  label?: string;
  kind?: string;
  marketName?: string | null;
  website?: string | null;
  sourceId?: string | null;
  sourceTier?: string | null;
  evidence?: string | null;
};

type CompanionRequest = {
  query?: string;
  route?: string;
  profile?: string;
  audience?: string;
  intent?: string;
  confidence?: string;
  answerMode?: string;
  anonymousSessionId?: string;
  taskContext?: {
    kind?: string;
    label?: string;
    sourceRoute?: string;
  };
  fallbackAnswer?: string;
  topLinks?: ContextLink[];
  conversation?: Array<{
    role?: string;
    text?: string;
  }>;
};

const normalizeRoute = (route?: string) => {
  const value = (route ?? "/").trim();
  return value.startsWith("/") ? value.split(/[?#]/, 1)[0].slice(0, 180) : "/";
};

const editorialTopicKey = (payload: CompanionRequest) => {
  const taskKind = payload.taskContext?.kind?.toLowerCase().replace(/[^a-z_]/g, "");
  const intent = payload.intent?.toLowerCase().replace(/[^a-z_]/g, "") || "general";
  const route = normalizeRoute(payload.taskContext?.sourceRoute ?? payload.route)
    .split("/").filter(Boolean).slice(0, 2).join("-") || "home";
  return `${taskKind || intent}:${route}`.slice(0, 120);
};

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const recordEditorialSignal = async (payload: CompanionRequest) => {
  if (payload.answerMode !== "support_handoff" || !payload.anonymousSessionId) return;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return;

  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await (db.rpc as any)("record_assistant_editorial_signal", {
    p_topic_key: editorialTopicKey(payload),
    p_audience: (payload.audience ?? "visitor").slice(0, 32),
    p_route: normalizeRoute(payload.taskContext?.sourceRoute ?? payload.route),
    p_outcome: "unresolved",
    p_session_hash: await sha256(payload.anonymousSessionId),
  });
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const scoreContext = (query: string, text: string) => {
  const queryWords = normalize(query).split(" ").filter((word) => word.length > 2);
  const normalizedText = normalize(text);
  return queryWords.reduce((score, word) => score + (normalizedText.includes(word) ? 2 : 0), 0);
};

const retrieveServerContext = async (request: Request, payload: CompanionRequest): Promise<ContextLink[]> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return [];

  const db = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
  });
  const { data: authData } = await db.auth.getUser();
  const allowedVisibility = authData.user ? ["public", "customer"] : ["public"];

  const [{ data: articles }, { data: lenses }, { data: supplies }] = await Promise.all([
    (db.from("help_articles") as any)
      .select("id,title,content,description,page_slug,category,visibility")
      .eq("is_active", true)
      .in("visibility", allowedVisibility)
      .limit(200),
    (db.rpc as any)("get_lenses_safe"),
    (db.rpc as any)("get_supplies_safe"),
  ]);

  const articleLinks = (articles ?? []).map((article: any) => ({
    title: article.title,
    description: article.description ?? article.category ?? "",
    path: `/knowledge/${article.page_slug}`,
    label: "Knowledge article",
    kind: "knowledge",
    sourceId: `server:article:${article.id}`,
    sourceTier: "knowledge_base",
    evidence: `${article.title}\n${article.content ?? article.description ?? ""}`.slice(0, 1800),
    score: scoreContext(payload.query ?? "", `${article.title} ${article.description ?? ""} ${article.content ?? ""}`),
  }));

  const productLinks = [...(lenses ?? []), ...(supplies ?? [])]
    .filter((product: any) => product.show_on_website === true)
    .map((product: any) => ({
      title: product.name,
      description: product.notes ?? product.description ?? product.category ?? "",
      path: `/store/product/${product.product_type === "supply" ? "supply" : "lens"}/${product.id}`,
      label: "Published product",
      kind: "product",
      sourceId: `server:product:${product.id}`,
      sourceTier: "site_content",
      evidence: `${product.name}\n${product.notes ?? product.description ?? ""}`.slice(0, 1800),
      score: scoreContext(payload.query ?? "", `${product.name} ${product.notes ?? ""} ${product.description ?? ""}`),
    }));

  return [...articleLinks, ...productLinks]
    .filter((link) => link.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score: _score, ...link }) => link);
};

const buildUserPrompt = (payload: CompanionRequest) => {
  const topLinks = (payload.topLinks ?? [])
    .slice(0, 4)
    .map((link, index) =>
      `[${index + 1}] ${link.title ?? "Untitled"} | ${link.description ?? ""} | ${link.path ?? ""}${link.marketName ? ` | ${link.marketName}` : ""}`,
    )
    .join("\n");

  const evidence = (payload.topLinks ?? [])
    .slice(0, 4)
    .map((link, index) =>
      `[${index + 1}] Source tier: ${link.sourceTier ?? "site_content"}; Source id: ${link.sourceId ?? "unknown"}\n${link.evidence ?? link.description ?? "No evidence excerpt supplied."}`,
    )
    .join("\n\n");

  const conversation = (payload.conversation ?? [])
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text ?? ""}`)
    .join("\n");

  return [
    `Visitor query: ${payload.query ?? ""}`,
    `Current route: ${payload.route ?? ""}`,
    `Assistant profile: ${payload.profile ?? ""}`,
    `Audience: ${payload.audience ?? "visitor"}`,
    `Detected intent: ${payload.intent ?? ""}`,
    `Local confidence: ${payload.confidence ?? ""}`,
    `Answer mode: ${payload.answerMode ?? "direct_answer"}`,
    "",
    "Website context links (cite these as [1], [2], etc. in your answer):",
    topLinks || "None supplied.",
    "",
    "Evidence excerpts (these are the facts you may use):",
    evidence || "None supplied.",
    "",
    "Recent conversation:",
    conversation || "No prior turns.",
    "",
    "Write the final assistant answer only.",
  ].join("\n");
};

const gatewayModel = () => Deno.env.get("COMPANION_ASSISTANT_GATEWAY_MODEL") ?? "google/gemini-3-flash-preview";

const callGateway = (payload: CompanionRequest, apiKey: string, stream: boolean) =>
  fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: gatewayModel(),
      stream,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(payload) },
      ],
    }),
  });

async function generateWithGateway(payload: CompanionRequest, apiKey: string) {
  const response = await callGateway(payload, apiKey, false);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway companion assistant failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

// Only surface sources the answer actually cited (via [n] markers), instead of
// dumping every candidate link that happened to be supplied as context.
const resolveCitations = (rawAnswer: string | null, availableLinks: ContextLink[]) => {
  const citedIndices = rawAnswer
    ? Array.from(new Set(Array.from(rawAnswer.matchAll(/\[(\d+)\]/g), (match: RegExpMatchArray) => Number(match[1]))))
        .filter((index) => index >= 1 && index <= availableLinks.length)
        .sort((a, b) => a - b)
    : [];
  return citedIndices.length > 0 ? citedIndices.map((index) => availableLinks[index - 1]) : availableLinks.slice(0, 1);
};

/**
 * Streams the gateway answer to the browser as `data: {"delta": "..."}` lines and
 * closes with `data: {"done": true, "citations": [...]}` once the full text is known.
 */
async function streamAnswer(payload: CompanionRequest, apiKey: string, corsHeaders: Record<string, string>) {
  const upstream = await callGateway(payload, apiKey, true);
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    throw new Error(`Gateway companion assistant failed (${upstream.status}): ${text}`);
  }

  const availableLinks = payload.topLinks ?? [];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const body = new ReadableStream({
    async start(controller) {
      let answer = "";
      let buffer = "";
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
            buffer = buffer.slice(newlineIndex + 1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                answer += delta;
                send({ delta });
              }
            } catch {
              // Partial JSON chunk — wait for the rest of the line.
              buffer = `${line}\n${buffer}`;
              break;
            }
          }
        }

        const finalAnswer = answer.trim() || payload.fallbackAnswer?.trim() || null;
        send({ done: true, answer: finalAnswer, citations: resolveCitations(answer.trim() || null, availableLinks) });
      } catch (error) {
        console.error("companion-assistant stream error", error);
        send({ done: true, error: "stream_failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  // Public visitor-facing assistant (no auth required for marketing site UX).
  // AI cost exposure is mitigated by: strict same-origin CORS (rejectDisallowedOrigin),
  // a tight per-IP rate limit, and a hard ceiling per hour. The Lovable AI Gateway
  // also enforces project-level quotas server-side.
  const ip = getClientIp(req);
  const perMinute = checkRateLimit(ip, corsHeaders, 6, 60_000);
  if (perMinute) return perMinute;
  const perHour = checkRateLimit(`hour:${ip}`, corsHeaders, 60, 60 * 60_000);
  if (perHour) return perHour;

  try {
    const payload = (await req.json()) as CompanionRequest & { stream?: boolean };
    const serverLinks = await retrieveServerContext(req, payload).catch(() => []);
    const groundedPayload = serverLinks.length > 0 ? { ...payload, topLinks: serverLinks } : payload;

    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");

    if (payload.stream === true && gatewayKey) {
      await recordEditorialSignal(groundedPayload).catch((error) => console.error("assistant editorial signal failed", error));
      return await streamAnswer(groundedPayload, gatewayKey, corsHeaders);
    }

    const rawAnswer = gatewayKey
      ? await generateWithGateway(groundedPayload, gatewayKey)
      : groundedPayload.fallbackAnswer ?? null;

    const answer = (rawAnswer ?? groundedPayload.fallbackAnswer ?? "").trim() || null;

    // When the model didn't cite anything (e.g. the fallback text, or an off-topic
    // reply), fall back to at most the single strongest match.
    const citations = resolveCitations(rawAnswer, groundedPayload.topLinks ?? []);
    await recordEditorialSignal(groundedPayload).catch((error) => console.error("assistant editorial signal failed", error));

    return new Response(JSON.stringify({
      answer,
      citations,
      provider: gatewayKey ? "gateway" : "fallback",
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("companion-assistant error", error);
    return new Response(JSON.stringify({
      error: "An unexpected error occurred. Please try again.",
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
