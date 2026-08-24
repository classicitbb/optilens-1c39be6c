import { IDEAL_CUSTOMER_PROFILE } from "@/config/idealCustomerProfile";

interface Inputs {
  volume: number;
  websiteWeakness: number;
  socialWeakness: number;
  supplierPain: number;
  fit: number;
  aiIntentBoost?: number;
  country?: string | null;
}

/** Rewards leads based in an ICP primary country/fulfillment region over out-of-territory leads. */
export const computeIcpGeographyFit = (country?: string | null): number => {
  if (!country) return 50;
  const normalized = country.toLowerCase();
  const inIcpGeography = IDEAL_CUSTOMER_PROFILE.geography.primaryCountries.some((entry) =>
    entry.toLowerCase().includes(normalized),
  );
  return inIcpGeography ? 100 : 30;
};

export const computeLeadScore = ({
  volume,
  websiteWeakness,
  socialWeakness,
  supplierPain,
  fit,
  aiIntentBoost = 0,
  country = null,
}: Inputs) => {
  const blendedFit = fit * 0.7 + computeIcpGeographyFit(country) * 0.3;
  const base = volume * 0.25 + websiteWeakness * 0.2 + socialWeakness * 0.2 + supplierPain * 0.2 + blendedFit * 0.15;
  const score = Math.max(0, Math.min(100, Math.round(base + aiIntentBoost)));
  if (score >= 75) return { score, band: "Hot", emoji: "🔥" };
  if (score >= 45) return { score, band: "Warm", emoji: "🌤️" };
  return { score, band: "Cold", emoji: "❄️" };
};
