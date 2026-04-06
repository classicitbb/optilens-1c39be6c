import { supabase } from "@/integrations/supabase/client";
import type { AssistantProfile, AssistantQueryResult } from "./companionAssistantEngine";

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

export async function generateAssistantAnswer(payload: AssistantGenerationPayload): Promise<string | null> {
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

    if (error) return null;

    return typeof data?.answer === "string" && data.answer.trim()
      ? data.answer.trim()
      : null;
  } catch {
    return null;
  }
}
