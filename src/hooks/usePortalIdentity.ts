import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getPortalEmulation, onPortalEmulationChange } from "@/lib/portalEmulation";

export type PortalAccessStatus = "pending_verification" | "pending_profile" | "pending_approval" | "approved_customer";
export type PortalFeature = "quotes" | "helpdesk" | "pricelists" | "private-orders" | "live-order-status" | "statements" | "order-prices" | "rx-order";

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
  ordersUseBillToAccount: boolean;
  assignedPricelistId: number | null;
  organizationName: string | null;
  customerName: string | null;
  paymentTerms: PaymentTerms;
  canAccessPricing: boolean;
  canAccessStatements: boolean;
  featureOverrides: Partial<Record<PortalFeature, boolean>>;
}

export interface PortalAccountMembership {
  membershipId: string;
  customerId: number;
  contactId: string;
  customerName: string;
  accountNumber: string | null;
  accessRole: "owner" | "manager" | "ordering" | "finance" | "member" | "viewer";
  status: "active" | "suspended";
  isDefault: boolean;
  assignedPricelistId: number | null;
  paymentTerms: PaymentTerms;
  ordersUseBillToAccount: boolean;
  canAccessPricing: boolean;
  canAccessStatements: boolean;
  featureOverrides: Partial<Record<PortalFeature, boolean>>;
}

const selectedAccountStorageKey = (userId: string) => `cv.portal.activeCustomer.${userId}`;
const portalAccountSelectionEvent = "cv:portal-account-selection";

const readSelectedCustomerId = (userId: string | null) => {
  if (!userId || typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(selectedAccountStorageKey(userId)));
  return Number.isInteger(value) && value > 0 ? value : null;
};

const normalizeMembership = (row: Record<string, unknown>): PortalAccountMembership => ({
  membershipId: String(row.membership_id ?? ""),
  customerId: Number(row.customer_id),
  contactId: String(row.contact_id ?? ""),
  customerName: typeof row.customer_name === "string" ? row.customer_name : "Customer account",
  accountNumber: typeof row.account_number === "string" && row.account_number.trim() ? row.account_number.trim() : null,
  accessRole: (row.access_role ?? "member") as PortalAccountMembership["accessRole"],
  status: (row.membership_status ?? "suspended") as PortalAccountMembership["status"],
  isDefault: row.is_default === true,
  assignedPricelistId: typeof row.assigned_pricelist_id === "number" ? row.assigned_pricelist_id : null,
  paymentTerms: (row.payment_terms === "credit_approved" ? "credit" : row.payment_terms === "cash_only" ? "cash" : "standard") as PaymentTerms,
  ordersUseBillToAccount: row.portal_orders_use_bill_to_account === true,
  canAccessPricing: row.can_access_pricing === true,
  canAccessStatements: row.can_access_statements === true,
  featureOverrides: row.feature_overrides && typeof row.feature_overrides === "object"
    ? row.feature_overrides as Partial<Record<PortalFeature, boolean>>
    : {},
});

const featureTitles: Record<PortalFeature, string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
  "live-order-status": "Live order status",
  statements: "Statements",
  "order-prices": "Order prices",
  "rx-order": "Rx Order Form",
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
  ordersUseBillToAccount: row.portal_orders_use_bill_to_account === true,
  assignedPricelistId: typeof row.assigned_pricelist_id === "number" ? row.assigned_pricelist_id : null,
  organizationName: typeof row.organization_name === "string" ? row.organization_name : null,
  customerName: typeof row.customer_name === "string" ? row.customer_name : null,
  paymentTerms: (row.payment_terms === "credit_approved" ? "credit"
               : row.payment_terms === "cash_only"       ? "cash"
               : "standard") as PaymentTerms,
  canAccessPricing: row.can_access_pricing === true,
  canAccessStatements: row.can_access_statements === true,
  featureOverrides,
});

/**
 * Per-account membership overrides (portal_membership_feature_overrides) win
 * where set; the per-user overrides the admin Portals page edits
 * (customer_portal_feature_overrides) fill every other key. Mirrors the
 * live-data-gateway precedence — without the fallback, a membership row with
 * no override for e.g. "order-prices" silently hid a feature staff had enabled.
 */
export const resolvePortalFeatureOverrides = (
  userOverrides: Partial<Record<PortalFeature, boolean>>,
  membershipOverrides: Partial<Record<PortalFeature, boolean>>,
): Partial<Record<PortalFeature, boolean>> => ({ ...userOverrides, ...membershipOverrides });

export const canAccessPortalFeature = (identity: PortalIdentity | null, feature: PortalFeature) => {
  if (!identity) return false;
  const override = identity.featureOverrides?.[feature];
  if (override === false) return false;
  if (feature === "statements") {
    return identity.portalAccessStatus === "approved_customer" && identity.canAccessStatements;
  }
  if (feature === "pricelists") {
    return identity.portalAccessStatus === "approved_customer" && identity.canAccessPricing;
  }
  // Off by default: prices only show once staff explicitly enables it for a customer.
  if (feature === "order-prices") return override === true;
  if (override === true) return true;
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

  if (feature === "statements" && identity.portalAccessStatus === "approved_customer" && !identity.canAccessStatements) {
    return {
      title: "Statements require billing authorization",
      description: "Statements are available to contacts tagged Approved Access to Statement. CEO also grants statement access.",
    };
  }

  if (feature === "pricelists" && identity.portalAccessStatus === "approved_customer" && !identity.canAccessPricing) {
    return {
      title: "Pricelists require pricing authorization",
      description: "Assigned pricelists are available to contacts tagged Approved Access to Pricing. CEO also grants pricing access.",
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

  const [{ data: customer }, { data: overrides }, { data: canAccessPricing }, { data: canAccessStatements }] = await Promise.all([
    typeof profile.crm_customer_id === "number"
      ? (supabase as any)
          .from("customers")
          .select("name,account_number,assigned_pricelist_id,portal_orders_use_bill_to_account")
          .eq("id", profile.crm_customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    (supabase as any)
      .from("customer_portal_feature_overrides")
      .select("feature_key,enabled")
      .eq("user_id", targetUserId),
    (supabase.rpc as any)("can_access_customer_pricing", { p_user_id: targetUserId }),
    (supabase.rpc as any)("can_access_customer_statement", { p_user_id: targetUserId }),
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
      portal_orders_use_bill_to_account: customer?.portal_orders_use_bill_to_account === true,
      assigned_pricelist_id: customer?.assigned_pricelist_id ?? null,
      organization_name: profile.organization_name,
      customer_name: customer?.name ?? profile.full_name ?? null,
      can_access_pricing: canAccessPricing === true,
      can_access_statements: canAccessStatements === true,
    },
    overrideMap,
  );
};

export const usePortalIdentity = () => {
  const { user } = useAuth();
  const { canEdit: isStaff } = useUserRole();
  const queryClient = useQueryClient();

  const [emulation, setEmulation] = useState(() => getPortalEmulation());
  useEffect(() => onPortalEmulationChange(() => setEmulation(getPortalEmulation())), []);
  const signedInAsEmulation =
    emulation?.mode === "signed-in-as" && user?.id === emulation.userId ? emulation : null;
  const activeEmulation = isStaff && emulation && emulation.mode !== "signed-in-as" ? emulation : null;
  const effectiveUserId = activeEmulation?.userId ?? user?.id ?? null;
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(() => readSelectedCustomerId(effectiveUserId));

  useEffect(() => {
    setSelectedCustomerId(readSelectedCustomerId(effectiveUserId));
  }, [effectiveUserId]);

  useEffect(() => {
    const refreshSelection = () => setSelectedCustomerId(readSelectedCustomerId(effectiveUserId));
    window.addEventListener(portalAccountSelectionEvent, refreshSelection);
    return () => window.removeEventListener(portalAccountSelectionEvent, refreshSelection);
  }, [effectiveUserId]);

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

      const [{ data: orderLookup, error: orderLookupError }, { data: overrides, error: overridesError }, { data: canAccessPricing, error: pricingError }, { data: canAccessStatements, error: statementsError }] = await Promise.all([
        typeof row?.crm_customer_id === "number"
          ? (supabase.rpc as any)("get_portal_erp_order_lookup")
          : Promise.resolve({ data: null, error: null }),
        (supabase as any)
          .from("customer_portal_feature_overrides")
          .select("feature_key,enabled")
          .eq("user_id", user.id),
        (supabase.rpc as any)("can_access_customer_pricing", { p_user_id: user.id }),
        (supabase.rpc as any)("can_access_customer_statement", { p_user_id: user.id }),
      ]);

      if (orderLookupError) throw orderLookupError;
      if (overridesError) throw overridesError;
      if (pricingError) throw pricingError;
      if (statementsError) throw statementsError;

      const overrideMap = ((overrides ?? []) as Array<{ feature_key: PortalFeature; enabled: boolean }>).reduce(
        (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
        {} as Partial<Record<PortalFeature, boolean>>,
      );

      const lookup = Array.isArray(orderLookup) ? orderLookup[0] : orderLookup;
      return row ? normalizeIdentity({ ...row, account_number: lookup?.account_number ?? null, portal_orders_use_bill_to_account: lookup?.portal_orders_use_bill_to_account === true, can_access_pricing: canAccessPricing, can_access_statements: canAccessStatements }, overrideMap) : null;
    },
  });

  const membershipsQuery = useQuery({
    queryKey: ["portal-account-memberships", effectiveUserId],
    enabled: !!effectiveUserId && !!query.data,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_portal_account_memberships", {
        p_user_id: effectiveUserId,
      });
      if (error) {
        // Additive rollout compatibility: a frontend preview may briefly run
        // before the migration reaches the linked Supabase project.
        if (/get_portal_account_memberships|schema cache|Could not find the function/i.test(error.message ?? "")) return [];
        throw error;
      }
      return ((data ?? []) as Record<string, unknown>[]).map(normalizeMembership);
    },
  });

  const memberships = membershipsQuery.data ?? [];
  const activeMembership = useMemo(() => {
    const active = memberships.filter((membership) => membership.status === "active");
    return active.find((membership) => membership.customerId === selectedCustomerId)
      ?? active.find((membership) => membership.isDefault)
      ?? active.find((membership) => membership.customerId === query.data?.crmCustomerId)
      ?? active[0]
      ?? null;
  }, [memberships, query.data?.crmCustomerId, selectedCustomerId]);

  useEffect(() => {
    if (!effectiveUserId || !activeMembership || selectedCustomerId === activeMembership.customerId) return;
    setSelectedCustomerId(activeMembership.customerId);
    window.localStorage.setItem(selectedAccountStorageKey(effectiveUserId), String(activeMembership.customerId));
  }, [activeMembership, effectiveUserId, selectedCustomerId]);

  const identity = useMemo<PortalIdentity | null>(() => {
    if (!query.data || !activeMembership) return query.data ?? null;
    return {
      ...query.data,
      crmContactId: activeMembership.contactId,
      crmCustomerId: activeMembership.customerId,
      accountNumber: activeMembership.accountNumber,
      customerName: activeMembership.customerName,
      assignedPricelistId: activeMembership.assignedPricelistId,
      paymentTerms: activeMembership.paymentTerms,
      ordersUseBillToAccount: activeMembership.ordersUseBillToAccount,
      canAccessPricing: activeMembership.canAccessPricing,
      canAccessStatements: activeMembership.canAccessStatements,
      featureOverrides: resolvePortalFeatureOverrides(query.data.featureOverrides, activeMembership.featureOverrides),
    };
  }, [activeMembership, query.data]);

  const selectAccount = useCallback(async (customerId: number) => {
    if (!effectiveUserId || !memberships.some((membership) => membership.customerId === customerId && membership.status === "active")) {
      throw new Error("That customer account is not available to this login.");
    }
    setSelectedCustomerId(customerId);
    window.localStorage.setItem(selectedAccountStorageKey(effectiveUserId), String(customerId));
    window.dispatchEvent(new Event(portalAccountSelectionEvent));
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["live-innovations-customer-orders"] }),
      queryClient.cancelQueries({ queryKey: ["live-optilens-deliveries"] }),
      queryClient.cancelQueries({ queryKey: ["live-innovations-customer-account"] }),
    ]);
  }, [effectiveUserId, memberships, queryClient]);

  return {
    ...query,
    identity,
    memberships,
    activeMembership,
    selectAccount,
    isLoading: query.isLoading || membershipsQuery.isLoading,
    isStaff,
    emulation: activeEmulation,
    portalSessionEmulation: signedInAsEmulation,
    /**
     * The user id every portal data surface should query by: the emulated
     * account's during admin emulation, otherwise the signed-in user's.
     * RLS admin-read policies enforce who may actually see foreign rows.
     */
    effectiveUserId,
    canAccessFeature: (feature: PortalFeature) =>
      isStaff || canAccessPortalFeature(identity, feature),
  };
};
