interface Inputs {
  volume: number;
  websiteWeakness: number;
  socialWeakness: number;
  supplierPain: number;
  fit: number;
  aiIntentBoost?: number;
}

export const computeLeadScore = ({
  volume,
  websiteWeakness,
  socialWeakness,
  supplierPain,
  fit,
  aiIntentBoost = 0,
}: Inputs) => {
  const base = volume * 0.25 + websiteWeakness * 0.2 + socialWeakness * 0.2 + supplierPain * 0.2 + fit * 0.15;
  const score = Math.max(0, Math.min(100, Math.round(base + aiIntentBoost)));
  if (score >= 75) return { score, band: "Hot", emoji: "🔥" };
  if (score >= 45) return { score, band: "Warm", emoji: "🌤️" };
  return { score, band: "Cold", emoji: "❄️" };
};
