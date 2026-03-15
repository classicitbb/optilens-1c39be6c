import type { AssistantIntent, AssistantRequest, SourceAttribution } from "../types";

export interface KnowledgeGapEvent {
  kind: "knowledge_gap";
  role: AssistantRequest["role"];
  intent: AssistantIntent;
  message: string;
  routeGroup: AssistantRequest["routeGroup"];
  attribution: SourceAttribution;
}

export const buildKnowledgeGapEvent = (
  request: AssistantRequest,
  intent: AssistantIntent,
  attribution: SourceAttribution,
): KnowledgeGapEvent => ({
  kind: "knowledge_gap",
  role: request.role,
  intent,
  message: request.message,
  routeGroup: request.routeGroup,
  attribution,
});
