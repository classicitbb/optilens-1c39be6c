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
}

export interface AssistantGenerationResult {
  answer: string;
  citations: AssistantLinkResult[];
}

export async function generateAssistantAnswer(payload: AssistantGenerationPayload): Promise<AssistantGenerationResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("companion-assistant", {
      body: {
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
      },
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
