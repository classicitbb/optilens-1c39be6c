import type { AssistantMessage, AssistantQuickAction } from "./CompanionAssistantContext.shared";

export const visitorStarterAnswer = (query: string): { text: string; quickActions: AssistantQuickAction[] } | null => {
  switch (query.trim().toLowerCase()) {
    case "find lenses for my frame":
      return {
        text: "Lens compatibility depends on the frame type, size, condition and your prescription. Full-rim, rimless and semi-rimless frames can need different materials and fitting checks. Is this a new frame or one you already wear, and which type is it? A photo can help explain the style, but your optician must inspect and measure it before confirming a fit.",
        quickActions: [{ type: "link", label: "Read the customer-supplied frame policy", href: "/professionals/customer-supplied-frames-policy" }],
      };
    case "compare lens coatings & upgrades":
      return {
        text: "Anti-reflective coating reduces lens reflections; scratch-resistant hard coat improves durability but is not scratch-proof. Hydrophobic and oleophobic top coats make water and oils easier to clean. Photochromic lenses change tint with light, while polarized sunglasses reduce reflected outdoor glare. These solve different needs and may be combined depending on the lens. What matters most to you: screen reflections, outdoor glare, cleaning or durability?",
        quickActions: [{ type: "link", label: "Explore coatings", href: "/coatings" }, { type: "link", label: "Explore photochromic lenses", href: "/photochromic" }],
      };
    case "shipping, returns & warranty":
      return {
        text: "Classic Visions supplies optical professionals across the Caribbean. For delivery, check the freight policy for your destination; for a return or remake, review the eligibility and reporting requirements before sending anything back. I cannot confirm warranty coverage or a delivery date for a particular job without its details. Are you asking about shipping to an island, returning lenses, or a problem with glasses you bought from a retailer? If you bought from a retailer, start with that practice so they can assess the glasses and arrange any lab request.",
        quickActions: [{ type: "link", label: "Freight & delivery policy", href: "/professionals/freight-delivery-policy" }, { type: "link", label: "Returns & replacements policy", href: "/professionals/returns-replacements" }, { type: "form", label: "Prepare a support request", profile: "customer_support" }],
      };
    default: return null;
  }
};

// General product and policy questions must not trigger an account lookup.
export const asksForPrivateAccountData = (query: string) =>
  /\b(?:my|our)\s+(?:account|orders?|jobs?|balance|statements?|invoices?|drafts?|pricelist|prices?|tickets?|support requests?)\b|\b(?:track|status of|where is|look up|lookup|find)\s+(?:(?:my|our|the|a)\s+)?(?:order|job|invoice|ticket)\b|\b(?:account balance|assigned pricelist|purchase order|job number|lablink job)\b/i.test(query);

export const buildConversationTurns = (messages: AssistantMessage[]) => messages
  .filter((message) => message.kind !== "confirmation")
  .slice(-6)
  .map((message) => ({
    role: message.role,
    text: message.kind === "result" ? message.result.answer ?? "" : message.text,
  }))
  .filter((turn) => turn.text.trim());
