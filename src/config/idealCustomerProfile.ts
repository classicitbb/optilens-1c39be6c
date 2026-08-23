/**
 * Ideal Customer Profile (ICP) for Classic Visions wholesale lens/coatings sales.
 * Consumed by lead scoring, lead-finder search planning, and CRM segmentation
 * to keep targeting consistent across the platform.
 */

export type IcpSegment = "decision_makers" | "operators" | "procurement_influencers";

export interface IcpFirmographics {
  industries: string[];
  roles: string[];
  minLocations?: number;
  maxLocations?: number;
}

export interface IcpGeography {
  primaryCountries: string[];
  primaryCities?: string[];
  fulfillmentGeography: string;
}

export interface IcpBuyingSignals {
  digitalMaturitySignals: string[];
  procurementReadinessSignals: string[];
  engagementRecencyDays: number;
}

export interface IdealCustomerProfile {
  name: string;
  description: string;
  segments: IcpSegment[];
  firmographics: IcpFirmographics;
  geography: IcpGeography;
  buyingSignals: IcpBuyingSignals;
  productCategories: string[];
  marginTiers: string[];
  exclusions: string[];
}

export const IDEAL_CUSTOMER_PROFILE: IdealCustomerProfile = {
  name: "Independent Optical Retailer / Eye Clinic / Regional Chain",
  description:
    "Optical retailers, eye clinics, and regional optical chains across the wider Caribbean and diaspora markets, purchasing wholesale lenses and coatings on a recurring basis.",
  segments: ["decision_makers", "operators", "procurement_influencers"],
  firmographics: {
    industries: ["independent optical retailers", "eye clinics", "large retail chains"],
    roles: ["clinic owner", "purchasing manager", "optician/lab technician"],
    minLocations: 1,
    maxLocations: 25,
  },
  geography: {
    primaryCountries: [
      "Barbados",
      "Trinidad and Tobago",
      "Jamaica",
      "Eastern Caribbean (St. Lucia, Grenada, St. Vincent, Antigua)",
      "Caribbean diaspora communities (UK, US, Canada)",
    ],
    fulfillmentGeography: "Caribbean and diaspora",
  },
  buyingSignals: {
    digitalMaturitySignals: ["active website", "active Instagram/Facebook page", "online booking"],
    procurementReadinessSignals: [
      "recurring/repeat order history",
      "gap or dissatisfaction with existing supplier",
    ],
    engagementRecencyDays: 90,
  },
  productCategories: ["stock lenses", "coatings", "optical supplies"],
  marginTiers: ["standard", "preferred"],
  exclusions: ["exploitative_vulnerability", "coercive_abusive_targeting", "illegal"],
} as const;
