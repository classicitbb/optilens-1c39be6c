import type { PortalIdentity } from "@/hooks/usePortalIdentity";

export type ProfileRequirementKey = "full_name" | "phone" | "organization_name" | "shipping_address";

export interface ProfileRequirement {
  key: ProfileRequirementKey;
  label: string;
  route: string;
  focus: string;
}

export interface ProfileCompletionSnapshot {
  fullName?: string | null;
  phone?: string | null;
  organizationName?: string | null;
  hasShippingAddress?: boolean;
}

const REQUIREMENTS: Record<ProfileRequirementKey, ProfileRequirement> = {
  full_name: { key: "full_name", label: "Full name", route: "/profile/account", focus: "full_name" },
  phone: { key: "phone", label: "Phone number", route: "/profile/account", focus: "phone" },
  organization_name: { key: "organization_name", label: "Organization", route: "/profile/account", focus: "organization_name" },
  shipping_address: { key: "shipping_address", label: "Shipping address", route: "/profile/address-book", focus: "add_address" },
};

const hasValue = (value?: string | null) => Boolean(value && value.trim().length > 0);

export const getMissingProfileRequirements = (
  snapshot: ProfileCompletionSnapshot,
  identity?: PortalIdentity | null,
): ProfileRequirement[] => {
  const missing: ProfileRequirement[] = [];
  if (!hasValue(snapshot.fullName)) missing.push(REQUIREMENTS.full_name);
  if (!hasValue(snapshot.phone)) missing.push(REQUIREMENTS.phone);
  if (!hasValue(snapshot.organizationName)) missing.push(REQUIREMENTS.organization_name);
  if (!snapshot.hasShippingAddress) missing.push(REQUIREMENTS.shipping_address);

  if (identity?.portalAccessStatus === "approved_customer") {
    return missing.filter((item) => item.key !== "shipping_address");
  }

  return missing;
};
