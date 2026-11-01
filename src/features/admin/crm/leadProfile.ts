// Derives a buyer persona, the signals behind it and a suggested angle for a CRM
// contact from fields the CRM already holds. Pure and read-only: nothing is
// stored, so a profile always reflects the contact as it is now. Every signal
// names its evidence, so staff can see why a contact got its persona.

export interface ProfileInput {
  pipeline: string | null;
  stage: string | null;
  website: string | null;
  instagram_handle?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  phone?: string | null;
  email?: string | null;
  is_customer?: boolean;
}

export interface ProfileHealth {
  health: "alarm" | "flag" | "ok" | "unknown";
  quiet_days: number | null;
  avg_gap_days: number | null;
}

export interface LeadSignal {
  label: string;
  evidence: string;
}

export interface LeadProfile {
  persona: string;
  summary: string;
  signals: LeadSignal[];
  /** What to lead with, and the psychology principle behind it. */
  angle: { lead: string; principle: string };
  channel: "email" | "whatsapp" | "call";
}

const PERSONAS = {
  atRisk: {
    persona: "At-risk account",
    summary: "Orders have gone quiet compared with their usual rhythm.",
    angle: { lead: "A personal call to ask what changed; no pitch.", principle: "Loss aversion (theirs, not ours) + Liking" },
    channel: "call" as const,
  },
  active: {
    persona: "Active account",
    summary: "Ordering regularly; the aim is a larger share of their volume.",
    angle: { lead: "Introduce one more product line they already use elsewhere.", principle: "Goal-gradient + Endowment" },
    channel: "email" as const,
  },
  institution: {
    persona: "Chain or department store",
    summary: "Multi-site buyer; decisions run through a buyer, not an owner.",
    angle: { lead: "A concise supply-reliability case with one pilot location.", principle: "Regret aversion + Anchoring on a small pilot" },
    channel: "email" as const,
  },
  lab: {
    persona: "Lab",
    summary: "Competes and partners; interested in sourcing breadth.",
    angle: { lead: "Sourcing range and turnaround on hard-to-get prescriptions.", principle: "Contrast" },
    channel: "email" as const,
  },
  established: {
    persona: "Established independent",
    summary: "Well-reviewed practice with a loyal local base and a supplier already.",
    angle: { lead: "Reframe service quality: speed and care they can feel, not a price match.", principle: "Contrast + Pratfall (be honest about what we are not)" },
    channel: "email" as const,
  },
  growing: {
    persona: "Growing practice",
    summary: "Building its reputation online; open to better partners.",
    angle: { lead: "Help them grow: faster turnaround lets them promise patients more.", principle: "Reciprocity + Social proof" },
    channel: "email" as const,
  },
  wordOfMouth: {
    persona: "Word-of-mouth shop",
    summary: "Little online presence; relationships and quick answers matter most.",
    angle: { lead: "A short, friendly WhatsApp with one easy question.", principle: "Activation energy + Liking" },
    channel: "whatsapp" as const,
  },
};

export const buildLeadProfile = (c: ProfileInput, health?: ProfileHealth | null): LeadProfile => {
  const signals: LeadSignal[] = [];
  const reviews = c.google_reviews_count ?? 0;
  const rating = c.google_rating ?? 0;

  if (rating && reviews) signals.push({ label: "Local reputation", evidence: `${rating.toFixed(1)}★ from ${reviews} Google reviews` });
  signals.push(c.website
    ? { label: "Has a website", evidence: c.website }
    : { label: "No website", evidence: "No website recorded on the contact" });
  if (c.instagram_handle) signals.push({ label: "Active on Instagram", evidence: `@${c.instagram_handle.replace(/^@/, "")}` });
  if (health && health.health !== "unknown" && health.avg_gap_days != null) {
    signals.push({ label: "Order rhythm", evidence: `Orders about every ${health.avg_gap_days.toFixed(1)} days; ${health.quiet_days ?? "?"} quiet days now` });
  }

  let base: (typeof PERSONAS)[keyof typeof PERSONAS] = PERSONAS.growing;
  if (health?.health === "alarm" || health?.health === "flag") base = PERSONAS.atRisk;
  else if (c.is_customer || c.stage === "customer" || c.stage === "converting") base = PERSONAS.active;
  else if (c.pipeline === "department_stores") base = PERSONAS.institution;
  else if (c.pipeline === "labs") base = PERSONAS.lab;
  else if (!c.website && !c.instagram_handle) base = PERSONAS.wordOfMouth;
  else if (reviews >= 40 && rating >= 4.3) base = PERSONAS.established;

  return { persona: base.persona, summary: base.summary, signals, angle: base.angle, channel: base.channel };
};
