import type { SequenceStep } from "../types";

export const DEFAULT_SEQUENCE: SequenceStep[] = [
  { step: 1, channel: "whatsapp", delayHours: 0, prompt: "Warm intro + value hook" },
  { step: 2, channel: "email", delayHours: 24, prompt: "Audit preview + meeting CTA" },
  { step: 3, channel: "whatsapp", delayHours: 48, prompt: "Follow-up with objection handling" },
  { step: 4, channel: "instagram_dm", delayHours: 72, prompt: "Friendly DM with social proof" },
  { step: 5, channel: "email", delayHours: 96, prompt: "Final call + proposal offer" },
];
