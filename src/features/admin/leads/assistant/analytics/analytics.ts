import type { AssistantResponse } from "../types";

export interface AssistantAnalyticsEvent {
  feature: "knowledge_assistant";
  mode: AssistantResponse["answer"]["mode"];
  citationCount: number;
  usedExternalFallback: boolean;
}

export const buildAssistantAnalyticsEvent = (response: AssistantResponse): AssistantAnalyticsEvent => ({
  feature: "knowledge_assistant",
  mode: response.answer.mode,
  citationCount: response.attribution.appliedSources.length,
  usedExternalFallback: response.attribution.appliedSources.some((source) => source.source === "external_web"),
});
