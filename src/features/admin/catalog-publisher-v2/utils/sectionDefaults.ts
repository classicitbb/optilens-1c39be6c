import { ProposalSection } from "../types";

export const DEFAULT_SECTIONS: ProposalSection[] = [
  {
    key: "executive_snapshot",
    title: "Executive Snapshot",
    body: "Clinical recommendation summary for this account, including top package rationale and expected value outcomes.",
  },
  {
    key: "visibility",
    title: "Visibility",
    body: "How the package improves shelf clarity, product discoverability, and offer communication for the target market.",
  },
  {
    key: "conversion",
    title: "Conversion",
    body: "Projected uplift assumptions based on the selected lens/supply mix and customer volume tier.",
  },
  {
    key: "competitor_comparison",
    title: "Competitor Comparison",
    body: "Concise comparison of Classic Visions offer quality, reliability, and speed against common alternatives.",
  },
  {
    key: "how_classic_visions_helps",
    title: "How Classic Visions Helps",
    body: "Operational support, technical guidance, and launch enablement included with this package.",
  },
  {
    key: "offer_next_step",
    title: "Offer + Next Step",
    body: "Commercial offer summary and clear next step for confirmation, pilot, or rollout.",
  },
];
