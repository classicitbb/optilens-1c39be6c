import type { AssistantIntent, AssistantRequest } from "../types";

const KEYWORDS: Array<{ intent: AssistantIntent; terms: string[] }> = [
  { intent: "account_support", terms: ["login", "reset", "account", "password", "billing"] },
  { intent: "policy_lookup", terms: ["policy", "compliance", "terms", "rule"] },
  { intent: "how_to", terms: ["how", "setup", "configure", "workflow", "steps"] },
  { intent: "product_lookup", terms: ["lens", "catalog", "price", "coating", "product"] },
];

export const classifyIntent = (request: AssistantRequest): AssistantIntent => {
  const lowered = request.message.toLowerCase();
  const hit = KEYWORDS.find(({ terms }) => terms.some((term) => lowered.includes(term)));
  return hit?.intent ?? "unknown";
};
