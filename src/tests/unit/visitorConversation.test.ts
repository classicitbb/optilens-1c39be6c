import { describe, expect, it } from "vitest";
import { asksForPrivateAccountData, buildConversationTurns } from "@/features/assistant/visitorConversation";
import { buildAssistantCorpus, runAssistantQuery } from "@/features/assistant/companionAssistantEngine";

describe("visitor conversation routing", () => {
  it.each(["Find lenses for my frame", "Shipping, returns & warranty", "What lenses does my patient need?", "How do I order lenses?", "Explain support and remake policies"])("keeps public guidance public: %s", (query) => {
    expect(asksForPrivateAccountData(query)).toBe(false);
  });
  it.each(["What is my account balance?", "Track my order", "Find job 1234", "Show my invoices", "What is my assigned pricelist?", "Show our support requests"])("routes actual records to account help: %s", (query) => {
    expect(asksForPrivateAccountData(query)).toBe(true);
  });
  it("retains generated answers when the visitor asks a follow-up", () => {
    const result = runAssistantQuery({ query: "Compare coatings", route: "/", profile: "general_search", corpus: buildAssistantCorpus({ products: [], knowledge: [] }) });
    const turns = buildConversationTurns([
      { id: "1", role: "user", kind: "user", text: "Compare coatings" },
      { id: "2", role: "assistant", kind: "result", result: { ...result, answer: "AR reduces reflections; photochromic changes tint." } },
      { id: "3", role: "user", kind: "user", text: "Can I combine them?" },
    ]);
    expect(turns[1]).toEqual({ role: "assistant", text: "AR reduces reflections; photochromic changes tint." });
  });
});
