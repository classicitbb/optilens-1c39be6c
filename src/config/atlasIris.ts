import { generateAssistantAnswer } from "@/features/assistant/assistantGeneration";
import {
  buildAssistantCorpus,
  runAssistantQuery,
  type AssistantLinkResult,
  type AssistantQueryResult,
} from "@/features/assistant/companionAssistantEngine";
import type { AtlasIrisProvider } from "@/features/atlas/host";

/**
 * The host's assistant for Atlas: the existing companion assistant (same retrieval engine, same
 * `companion-assistant` function, same identity). Atlas pages come in as extra evidence ahead of
 * the engine's own top results. Spend is recorded server-side by `companion-assistant`
 * (recordAiSpend), so every Iris call is metered by the existing ledger.
 */
const sessionId = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `atlas-${Date.now()}`;
  }
})();

export const atlasIrisProvider: AtlasIrisProvider = {
  async ask({ question, evidence, conversation, route, onDelta }) {
    const retrieval = runAssistantQuery({
      query: question,
      route,
      profile: "general_search",
      audience: "staff",
      corpus: buildAssistantCorpus({ products: [], knowledge: [] }),
    });

    const atlasLinks: AssistantLinkResult[] = evidence.map((item, index) => ({
      id: item.id,
      title: item.title,
      description: item.text.slice(0, 200),
      path: item.path,
      label: "Atlas",
      kind: "knowledge",
      score: 100 - index,
      sourceId: item.id,
      sourceTier: "company_policy",
      evidence: item.text.slice(0, 1800),
    }));

    const result: AssistantQueryResult = {
      ...retrieval,
      intent: "general",
      topLinks: [...atlasLinks, ...retrieval.topLinks].slice(0, 8),
      confidence: atlasLinks.length > 0 ? "high" : retrieval.confidence,
      answerMode: "direct_answer",
    };

    const generated = await generateAssistantAnswer({
      query: question,
      route,
      profile: "general_search",
      audience: "staff",
      result,
      conversation: [...conversation, { role: "user", text: question }],
      anonymousSessionId: sessionId,
      // Tells the function to ground on the Atlas pages sent here (staff only) instead of the public knowledge base.
      taskContext: { kind: "atlas", label: "Atlas", sourceRoute: route },
      onDelta,
    });
    if (!generated) return null;

    return {
      text: generated.answer,
      citations: generated.citations
        .map((citation) => ({ id: citation.sourceId ?? citation.id, title: citation.title, path: citation.path }))
        .filter((citation) => atlasLinks.some((link) => link.id === citation.id)),
    };
  },
};
