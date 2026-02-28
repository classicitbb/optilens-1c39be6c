export type BlockedIntentCategory = "illegal" | "exploitative_vulnerability" | "coercive_abusive_targeting";

export interface ComplianceValidationResult {
  blocked: boolean;
  category?: BlockedIntentCategory;
  matchedTerm?: string;
  message?: string;
  alternatives: string[];
}

const BLOCKED_INTENT_RULES: Array<{ category: BlockedIntentCategory; terms: string[]; message: string }> = [
  {
    category: "illegal",
    terms: ["fraud", "money laundering", "fake prescription", "counterfeit", "steal", "identity theft", "tax evasion"],
    message: "Requests that facilitate illegal activity are not allowed.",
  },
  {
    category: "exploitative_vulnerability",
    terms: ["elderly victims", "desperate", "financially stressed", "terminally ill", "addicted", "grieving"],
    message: "Requests that exploit vulnerable populations are not allowed.",
  },
  {
    category: "coercive_abusive_targeting",
    terms: ["harass", "blackmail", "threaten", "force them", "without consent", "stalk"],
    message: "Coercive, abusive, or non-consensual targeting is not allowed.",
  },
];

const COMPLIANT_ALTERNATIVES = [
  "Use role-based targeting (e.g., clinic owner, purchasing manager, store manager).",
  "Use industry-based targeting (e.g., independent optical retailers, eye clinics, pharmacies).",
  "Use account-based targeting (e.g., named chains, priority accounts, territory-defined accounts).",
];

export function validateTargetingInput(input: string): ComplianceValidationResult {
  const normalized = input.toLowerCase();

  for (const rule of BLOCKED_INTENT_RULES) {
    const matchedTerm = rule.terms.find((term) => normalized.includes(term));
    if (matchedTerm) {
      return {
        blocked: true,
        category: rule.category,
        matchedTerm,
        message: `${rule.message} Matched term: "${matchedTerm}".`,
        alternatives: COMPLIANT_ALTERNATIVES,
      };
    }
  }

  return {
    blocked: false,
    alternatives: COMPLIANT_ALTERNATIVES,
  };
}

export function formatComplianceError(action: string, validation: ComplianceValidationResult): string {
  const alternatives = validation.alternatives.map((item, idx) => `${idx + 1}. ${item}`).join(" ");
  return `${action} blocked by lead targeting safety policy (${validation.category}). ${validation.message} Try one of these compliant alternatives: ${alternatives}`;
}
