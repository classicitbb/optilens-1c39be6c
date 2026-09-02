import { supabase } from "@/integrations/supabase/client";
import type { AssistantAudience, AssistantProfile, AssistantLinkResult, AssistantQueryResult } from "./companionAssistantEngine";
import type { AssistantTaskContext } from "./CompanionAssistantContext.shared";

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

export interface AssistantGenerationPayload {
  query: string;
  route: string;
  profile: AssistantProfile;
  audience: AssistantAudience;
  result: AssistantQueryResult;
  conversation: ConversationTurn[];
  anonymousSessionId: string;
  taskContext?: AssistantTaskContext;
  /** Called with the answer text so far while the model streams. */
  onDelta?: (partialAnswer: string) => void;
}

export interface AssistantGenerationResult {
  answer: string;
  citations: AssistantLinkResult[];
}

const buildRequestBody = (payload: AssistantGenerationPayload, stream: boolean) => ({
  query: payload.query,
  route: payload.route,
  profile: payload.profile,
  audience: payload.audience,
  intent: payload.result.intent,
  confidence: payload.result.confidence,
  answerMode: payload.result.answerMode,
  fallbackAnswer: payload.result.answer,
  topLinks: payload.result.topLinks.map((link) => ({
    title: link.title,
    description: link.description,
    path: link.path,
    label: link.label,
    kind: link.kind,
    marketName: link.marketName ?? null,
    website: link.website ?? null,
    sourceId: link.sourceId ?? null,
    sourceTier: link.sourceTier ?? null,
    evidence: link.evidence ?? null,
  })),
  conversation: payload.conversation,
  anonymousSessionId: payload.anonymousSessionId,
  taskContext: payload.taskContext,
  stream,
});

const FUNCTIONS_URL = (() => {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base}/functions/v1/companion-assistant` : null;
})();

async function generateStreamed(payload: AssistantGenerationPayload): Promise<AssistantGenerationResult | null> {
  if (!FUNCTIONS_URL || !payload.onDelta) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

  const response = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(buildRequestBody(payload, true)),
  });

  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let citations: AssistantLinkResult[] = [];
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (typeof event.delta === "string") {
          answer += event.delta;
          payload.onDelta(answer);
        }
        if (event.done === true) {
          if (event.error) return null;
          completed = true;
          if (typeof event.answer === "string") answer = event.answer;
          if (Array.isArray(event.citations)) citations = event.citations;
        }
      } catch {
        buffer = `${line}\n${buffer}`;
        break;
      }
    }
  }

  const trimmed = answer.trim();
  if (!completed || !trimmed) return null;
  return { answer: trimmed, citations };
}

export async function generateAssistantAnswer(payload: AssistantGenerationPayload): Promise<AssistantGenerationResult | null> {
  try {
    const streamed = await generateStreamed(payload).catch(() => null);
    if (streamed) return streamed;

    const { data, error } = await supabase.functions.invoke("companion-assistant", {
      body: buildRequestBody(payload, false),
    });

    if (error || !data?.answer?.trim()) return null;

    return {
      answer: data.answer.trim(),
      citations: Array.isArray(data.citations) ? data.citations : [],
    };
  } catch {
    return null;
  }
}
