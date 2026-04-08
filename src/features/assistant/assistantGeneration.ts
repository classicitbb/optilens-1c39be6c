import { supabase } from "@/integrations/supabase/client";
import type { AssistantProfile, AssistantLinkResult, AssistantQueryResult } from "./companionAssistantEngine";

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

export interface AssistantGenerationPayload {
  query: string;
  route: string;
  profile: AssistantProfile;
  result: AssistantQueryResult;
  conversation: ConversationTurn[];
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
        intent: payload.result.intent,
        confidence: payload.result.confidence,
        fallbackAnswer: payload.result.answer,
        topLinks: payload.result.topLinks.map((link) => ({
          title: link.title,
          description: link.description,
          path: link.path,
          label: link.label,
          kind: link.kind,
          marketName: link.marketName ?? null,
          website: link.website ?? null,
        })),
        conversation: payload.conversation,
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
