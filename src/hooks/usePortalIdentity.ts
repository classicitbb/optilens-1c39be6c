import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getPortalEmulation, onPortalEmulationChange } from "@/lib/portalEmulation";

export type PortalAccessStatus = "pending_verification" | "pending_profile" | "pending_approval" | "approved_customer";
export type PortalFeature = "quotes" | "helpdesk" | "pricelists" | "private-orders" | "statements";

export type PaymentTerms = "credit" | "cash" | "standard";

export interface PortalIdentity {
  profileId: string;
  portalAccessStatus: PortalAccessStatus;
  portalAccessNote: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  crmContactId: string | null;
  crmCustomerId: number | null;
  accountNumber: string | null;
  assignedPricelistId: number | null;
  organizationName: string | null;
  customerName: string | null;
  paymentTerms: PaymentTerms;
  featureOverrides: Partial<Record<PortalFeature, boolean>>;
}

const featureTitles: Record<PortalFeature, string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
  statements: "Statements",
};

const normalizeIdentity = (
  row: Record<string, unknown>,
  featureOverrides: Partial<Record<PortalFeature, boolean>>,
): PortalIdentity => ({
  profileId: String(row.profile_id ?? ""),
  portalAccessStatus: (row.portal_access_status ?? "pending_profile") as PortalAccessStatus,
  portalAccessNote: typeof row.portal_access_note === "string" ? row.portal_access_note : "",
  emailVerified: row.email_verified === true,
  profileCompleted: row.profile_completed === true,
  crmContactId: typeof row.crm_contact_id === "string" ? row.crm_contact_id : null,
  crmCustomerId: typeof row.crm_customer_id === "number" ? row.crm_customer_id : null,
  accountNumber: typeof row.account_number === "string" && row.account_number.trim() ? row.account_number.trim() : null,
  assignedPricelistId: typeof row.assigned_pricelist_id === "number" ? row.assigned_pricelist_id : null,
  organizationName: typeof row.organization_name === "string" ? row.organization_name : null,
  customerName: typeof row.customer_name === "string" ? row.customer_name : null,
  paymentTerms: (row.payment_terms === "credit_approved" ? "credit"
               : row.payment_terms === "cash_only"       ? "cash"
               : "standard") as PaymentTerms,
  featureOverrides,
});

export const canAccessPortalFeature = (identity: PortalIdentity | null, feature: PortalFeature) => {
  if (!identity) return false;
  const override = identity.featureOverrides?.[feature];
  if (typeof override === "boolean") return override;
  if (feature === "private-orders") return identity.portalAccessStatus === "approved_customer";
  return identity.portalAccessStatus === "approved_customer";
};

export const getPortalFeatureBlockedReason = (identity: PortalIdentity | null, feature: PortalFeature) => {
  const title = featureTitles[feature];

  if (!identity) {
    return {
      title: `${title} will unlock after sign-in`,
      description: `Sign in, verify your email, and complete your profile to start the ${title.toLowerCase()} approval flow.`,
    };
  }

  const override = identity.featureOverrides?.[feature];
  if (override === false) {
    return {
      title: `${title} is currently disabled`,
      description: "Your account team has temporarily disabled this workflow for your portal.",
    };
  }

  if (override === true) {
    return {
      title: `${title} is enabled`,
      description: `Your account has an explicit access override for ${title.toLowerCase()}.`,
    };
  }

  switch (identity.portalAccessStatus) {
    case "pending_verification":
      return {
        title: `Verify your email to unlock ${title.toLowerCase()}`,
        description: "We only create CRM contacts and customer workflows after email verification.",
      };
    case "pending_profile":
      return {
        title: `Complete your profile to unlock ${title.toLowerCase()}`,
        description: "Add your full name and phone number so we can create your CRM contact and route your account correctly.",
      };
    case "pending_approval":
      return {
        title: `${title} is waiting for customer approval`,
        description: "Your verified contact is in CRM. Customer-only workflows become available once your account is approved.",
      };
    case "approved_customer":
      return {
        title: `${title} is available`,
        description: identity.portalAccessNote,
      };
    default:
      return {
        title: `${title} is not available yet`,
        description: identity.portalAccessNote,
      };
  }
};

/**
 * Read-only identity for an emulated portal account: built from the same
 * tables the admin portals screen reads, deliberately NOT via the
 * sync_customer_portal_identity RPC (which creates/mutates rows for the
 * caller). Staff-only — RLS on profiles/customers enforces it server-side.
 */
const fetchEmulatedIdentity = async (targetUserId: string): Promise<PortalIdentity | null> => {
  const { data: profile, error: profileError } = await (supabase as any)
    .from("profiles")
    .select("id,user_id,full_name,organization_name,portal_access_status,portal_access_note,crm_contact_id,crm_customer_id")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  const [{ data: customer }, { data: overrides }] = await Promise.all([
    typeof profile.crm_customer_id === "number"
      ? (supabase as any)
          .from("customers")
          .select("name,account_number,assigned_pricelist_id")
          .eq("id", profile.crm_customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    (supabase as any)
      .from("customer_portal_feature_overrides")
      .select("feature_key,enabled")
      .eq("user_id", targetUserId),
  ]);

  const overrideMap = ((overrides ?? []) as Array<{ feature_key: PortalFeature; enabled: boolean }>).reduce(
    (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
    {} as Partial<Record<PortalFeature, boolean>>,
  );

  return normalizeIdentity(
    {
      profile_id: profile.id,
      portal_access_status: profile.portal_access_status,
      portal_access_note: profile.portal_access_note,
      email_verified: true,
      profile_completed: true,
      crm_contact_id: profile.crm_contact_id,
      crm_customer_id: profile.crm_customer_id,
      account_number: customer?.account_number ?? null,
      assigned_pricelist_id: customer?.assigned_pricelist_id ?? null,
      organization_name: profile.organization_name,
      customer_name: customer?.name ?? profile.full_name ?? null,
    },
    overrideMap,
  );
};

export const usePortalIdentity = () => {
  const { user } = useAuth();
  const { canEdit: isStaff } = useUserRole();

  const [emulation, setEmulation] = useState(() => getPortalEmulation());
  useEffect(() => onPortalEmulationChange(() => setEmulation(getPortalEmulation())), []);
  const activeEmulation = isStaff && emulation ? emulation : null;

  const query = useQuery({
    queryKey: ["portal-identity", user?.id, activeEmulation?.userId ?? "self"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      if (activeEmulation) return fetchEmulatedIdentity(activeEmulation.userId);
      const { data, error } = await (supabase.rpc as any)("sync_customer_portal_identity", {
        p_user_id: user.id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;

      const [{ data: accountNumber, error: accountNumberError }, { data: overrides, error: overridesError }] = await Promise.all([
        typeof row?.crm_customer_id === "number"
          ? (supabase.rpc as any)("get_portal_erp_account_number")
          : Promise.resolve({ data: null, error: null }),
        (supabase as any)
          .from("customer_portal_feature_overrides")
          .select("feature_key,enabled")
          .eq("user_id", user.id),
      ]);

      if (accountNumberError) throw accountNumberError;
      if (overridesError) throw overridesError;

      const overrideMap = ((overrides ?? []) as Array<{ feature_key: PortalFeature; enabled: boolean }>).reduce(
        (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
        {} as Partial<Record<PortalFeature, boolean>>,
      );

      return row ? normalizeIdentity({ ...row, account_number: accountNumber }, overrideMap) : null;
    },
  });

  return {
    ...query,
    identity: query.data ?? null,
    isStaff,
    emulation: activeEmulation,
    /**
     * The user id every portal data surface should query by: the emulated
     * account's during admin emulation, otherwise the signed-in user's.
     * RLS admin-read policies enforce who may actually see foreign rows.
     */
    effectiveUserId: activeEmulation?.userId ?? user?.id ?? null,
    canAccessFeature: (feature: PortalFeature) =>
      isStaff || canAccessPortalFeature(query.data ?? null, feature),
  };
};
