import type { LeadRecord } from "../types";

export type LeadSegment = "decision_makers" | "operators" | "procurement_influencers";

export interface CampaignPacket {
  segment: LeadSegment;
  audienceHypotheses: string[];
  creativeAngles: string[];
  channelRecommendations: Array<{ channel: string; objective: string; rationale: string }>;
  metaAudienceDefinitions: string[];
  metaMessagingVariants: string[];
}

const SEGMENT_PACKETS: Record<LeadSegment, Omit<CampaignPacket, "segment">> = {
  decision_makers: {
    audienceHypotheses: [
      "Owners/CEOs of independent optical stores prioritize margin protection and predictable supplier fulfillment.",
      "Decision-makers respond to total business outcomes: turnover, reorder reliability, and patient retention impact.",
    ],
    creativeAngles: [
      "Profit-per-patient storytelling with premium lens bundle uplift examples.",
      "Risk-reduction angle focused on supply continuity and turnaround consistency.",
    ],
    channelRecommendations: [
      { channel: "meta", objective: "Lead", rationale: "Efficiently reaches page admins and business leaders with high-level value propositions." },
      { channel: "email", objective: "Meeting booked", rationale: "Supports ROI details, pricing narrative, and executive-ready summaries." },
    ],
    metaAudienceDefinitions: [
      "Include interests/behaviors tied to optical retail ownership, small-business leadership, and eyewear merchandising; exclude sensitive personal attributes.",
      "Use geography + business category targeting (optical stores, eye clinics, pharmacies with optical category) with age 25+ and broad gender targeting.",
    ],
    metaMessagingVariants: [
      "Variant A: \"Scale premium lens revenue without stockout stress.\"",
      "Variant B: \"Protect your margins with dependable optical supply partnerships.\"",
    ],
  },
  operators: {
    audienceHypotheses: [
      "Store and lab operators value fewer remakes, faster cycle time, and simple order workflows.",
      "Operators engage with practical proof points: SLA reliability, process clarity, and responsive support.",
    ],
    creativeAngles: [
      "Workflow simplification with before/after order handling narrative.",
      "Service reliability angle focused on turnaround and remake reduction.",
    ],
    channelRecommendations: [
      { channel: "meta", objective: "Messages", rationale: "Encourages quick conversations on pain points and operations constraints." },
      { channel: "whatsapp", objective: "Qualification", rationale: "Fast troubleshooting and tactical follow-up for operational teams." },
    ],
    metaAudienceDefinitions: [
      "Target job-function proxies related to operations, store management, and optical technicians using compliant interest clusters.",
      "Use lookalikes from consented CRM leads segmented by operational role; avoid prohibited trait-based inferences.",
    ],
    metaMessagingVariants: [
      "Variant A: \"Cut remake headaches with dependable lens quality and delivery windows.\"",
      "Variant B: \"Keep your team moving with faster, cleaner order fulfillment.\"",
    ],
  },
  procurement_influencers: {
    audienceHypotheses: [
      "Procurement influencers care about price stability, MOQ flexibility, and supplier responsiveness.",
      "They prefer vendor comparisons, clear terms, and procurement-safe communication.",
    ],
    creativeAngles: [
      "Cost-to-serve optimization with transparent terms and reorder economics.",
      "Supplier scorecard narrative showing reliability, quality, and service responsiveness.",
    ],
    channelRecommendations: [
      { channel: "meta", objective: "Traffic", rationale: "Drives structured comparisons and downloadable procurement checklists." },
      { channel: "email", objective: "Quote request", rationale: "Best channel for specs, pricing terms, and decision documentation." },
    ],
    metaAudienceDefinitions: [
      "Target business decision and purchasing interest groups related to procurement, inventory planning, and wholesale buying in optical categories.",
      "Use custom audiences from opted-in B2B contact lists and exclude existing active opportunities to avoid overlap fatigue.",
    ],
    metaMessagingVariants: [
      "Variant A: \"Compare supplier terms built for reliable optical replenishment.\"",
      "Variant B: \"Streamline buying decisions with transparent pricing and service SLAs.\"",
    ],
  },
};

export const inferLeadSegment = (lead: LeadRecord): LeadSegment => {
  const name = lead.name.toLowerCase();
  const notes = (lead.notes ?? "").toLowerCase();
  const text = `${name} ${notes}`;
  if (text.includes("owner") || text.includes("ceo") || text.includes("director")) return "decision_makers";
  if (text.includes("procurement") || text.includes("buyer") || text.includes("purchasing")) return "procurement_influencers";
  return "operators";
};

export const buildCampaignPacket = (segment: LeadSegment): CampaignPacket => ({
  segment,
  ...SEGMENT_PACKETS[segment],
});
