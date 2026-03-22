import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PortalAccessStatus = "pending_verification" | "pending_profile" | "pending_approval" | "approved_customer";
export type PortalFeature = "quotes" | "helpdesk" | "pricelists" | "private-orders";

export interface PortalIdentity {
  profileId: string;
  portalAccessStatus: PortalAccessStatus;
  portalAccessNote: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  crmContactId: string | null;
  crmCustomerId: number | null;
  assignedPricelistId: number | null;
  organizationName: string | null;
  customerName: string | null;
  featureOverrides: Partial<Record<PortalFeature, boolean>>;
}

const featureTitles: Record<PortalFeature, string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
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
  assignedPricelistId: typeof row.assigned_pricelist_id === "number" ? row.assigned_pricelist_id : null,
  organizationName: typeof row.organization_name === "string" ? row.organization_name : null,
  customerName: typeof row.customer_name === "string" ? row.customer_name : null,
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

export const usePortalIdentity = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["portal-identity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [{ data, error }, { data: overrides, error: overridesError }] = await Promise.all([
        (supabase.rpc as any)("sync_customer_portal_identity", {
          p_user_id: user.id,
        }),
        (supabase as any)
          .from("customer_portal_feature_overrides")
          .select("feature_key,enabled")
          .eq("user_id", user.id),
      ]);

      if (error) throw error;
      if (overridesError) throw overridesError;

      const overrideMap = ((overrides ?? []) as Array<{ feature_key: PortalFeature; enabled: boolean }>).reduce(
        (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
        {} as Partial<Record<PortalFeature, boolean>>,
      );

      const row = Array.isArray(data) ? data[0] : data;
      return row ? normalizeIdentity(row, overrideMap) : null;
    },
  });

  return {
    ...query,
    identity: query.data ?? null,
    canAccessFeature: (feature: PortalFeature) => canAccessPortalFeature(query.data ?? null, feature),
  };
};
