import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CreditCard,
  ExternalLink,
  Eye,
  LifeBuoy,
  Mail,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  UserRound,
  WalletCards,
} from "lucide-react";
import { startPortalEmulation } from "@/lib/portalEmulation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useCustomerAddresses } from "@/hooks/useCustomerAddresses";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import ContactsPage from "@/pages/admin/erp/ContactsPage";
import { usePricelistVersions } from "@/hooks/usePricelistVersions";
import AddressBookSection from "@/components/account/sections/AddressBookSection";
import PaymentMethodsSection from "@/components/account/sections/PaymentMethodsSection";
import { Separator } from "@/components/ui/separator";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  AccountNumberAssignmentError,
  assignCustomerAccountNumber,
  normalizeAccountNumberInput,
} from "@/lib/accountNumberAssignment";
import type { CheckoutFormData } from "@/components/CheckoutDialog";

interface PortalCustomerListItem {
  userId: string;
  profileId: string;
  email: string;
  fullName: string;
  phone: string;
  organizationName: string;
  portalAccessStatus: string;
  portalAccessNote: string;
  portalAccessApprovedOverride: boolean;
  portalAccessApprovedAt: string | null;
  portalAccessApprovedNote: string | null;
  crmContactId: string | null;
  crmCustomerId: number | null;
  assignedPricelistId: number | null;
  cartItemCount: number;
  cartStatus: "empty" | "in_progress" | "abandoned";
  presenceStatus: "online" | "idle" | "offline" | string;
}

interface PortalCustomerDetail extends PortalCustomerListItem {
  featureOverrides: Record<string, boolean>;
  accountNumber: string | null;
  canAccessStatements: boolean;
  cartItems: Array<{
    id: string;
    product_name: string;
    product_price: number;
    product_type: string;
    quantity: number;
  }>;
  abandonedAlerts: Array<{
    id: string;
    total_items: number;
    total_amount: number;
    status: string;
    cutoff_hours: number;
    first_detected_at: string;
    last_detected_at: string;
    helpdesk_ticket_id: string | null;
    notification_id: string | null;
    email_outbox_id: string | null;
  }>;
  inquiries: Array<{
    id: string;
    inquiry_type: string;
    business_name: string | null;
    message: string | null;
    created_at: string;
    page_slug: string | null;
  }>;
  quotes: Array<{
    id: string;
    quote_number: string;
    customer_name: string;
    grand_total: number;
    status: string;
    created_at: string;
  }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    title: string;
    source_channel: string;
    created_at: string;
  }>;
}

interface PortalAccountRecord {
  id: string;
  portalUser: PortalCustomerListItem | null;
  crmCustomerId: number | null;
  crmContactId: string | null;
  accountNumber: string | null;
  fullName: string;
  email: string;
  phone: string;
  organizationName: string;
  isErpCustomer: boolean;
}

const FEATURE_KEYS = ["quotes", "helpdesk", "pricelists", "private-orders", "live-order-status", "statements"] as const;

const FEATURE_LABELS: Record<(typeof FEATURE_KEYS)[number], string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
  "live-order-status": "Live order status",
  statements: "Statements",
};

const FEATURE_DESCRIPTIONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  quotes: "Explicit override for quote requests.",
  helpdesk: "Explicit override for helpdesk access.",
  pricelists: "Explicit override for assigned pricelist viewing.",
  "private-orders": "Approved customer access for private/manual order history.",
  "live-order-status": "Opt-in only while live lab and delivery status is being finished.",
  statements: "Owner/CEO/Buyer tag required; disabled override can still block it.",
};

const formatMoney = (value: number | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`;
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
const getCartStatusLabel = (status: PortalCustomerListItem["cartStatus"]) => {
  if (status === "abandoned") return "Abandoned";
  if (status === "in_progress") return "In progress";
  return "No cart";
};

const WebsitePortalsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { users, resetPassword, inviteUser, createUser, isLoading: usersLoading } = useAdminUsers();
  const { data: pricelistVersions = [] } = usePricelistVersions();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // Older deep links still open the requested account, but ordinary row clicks
  // keep their selection in component state and do not change the page URL.
  const legacySelectedAccountId = searchParams.get("account") ?? searchParams.get("customer");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => legacySelectedAccountId);
  const dismissedLegacyAccountRef = useRef<string | null>(null);
  const [cutoffHours, setCutoffHours] = useState("24");
  const [profileDraft, setProfileDraft] = useState({ full_name: "", phone: "", organization_name: "" });
  const [accountNumberDraft, setAccountNumberDraft] = useState("");
  const [provisioningMode, setProvisioningMode] = useState<"create" | "invite" | null>(null);
  const [provisioningEmail, setProvisioningEmail] = useState("");
  const [provisioningName, setProvisioningName] = useState("");
  const [provisioningPassword, setProvisioningPassword] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [contactEditor, setContactEditor] = useState<{ contactId: string; initialTab: "details" | "account-settings" | "portal-settings" } | null>(null);

  useEffect(() => {
    if (!legacySelectedAccountId) {
      dismissedLegacyAccountRef.current = null;
      return;
    }
    if (dismissedLegacyAccountRef.current === legacySelectedAccountId) return;
    setSelectedAccountId(legacySelectedAccountId);
  }, [legacySelectedAccountId]);

  const clearSelectedAccount = () => {
    if (legacySelectedAccountId) {
      dismissedLegacyAccountRef.current = legacySelectedAccountId;
      setSearchParams({}, { replace: true });
    }
    setSelectedAccountId(null);
  };

  const customersQuery = useQuery({
    queryKey: ["website-portals-customers"],
    queryFn: async () => {
      const portalUserIds = users.map((entry) => entry.user_id);
      const [{ data, error }, { data: erpCustomers, error: erpCustomersError }] = await Promise.all([
        portalUserIds.length
          ? (supabase as any)
              .from("profiles")
              .select("id,user_id,email,full_name,phone,organization_name,portal_access_status,portal_access_note,portal_access_approved_override,portal_access_approved_at,portal_access_approved_note,crm_contact_id,crm_customer_id")
              .in("user_id", portalUserIds)
              .order("updated_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        (supabase as any)
          .from("customers")
          .select("id,name,email,phone,account_number,assigned_pricelist_id,innovations_customer_id,contact_id")
          .order("name"),
      ]);
      if (error) throw error;
      if (erpCustomersError) throw erpCustomersError;

      const erpCustomerRows = (erpCustomers ?? []) as Array<Record<string, any>>;
      const erpCustomerIds = erpCustomerRows.map((customer) => Number(customer.id)).filter(Number.isFinite);
      const directContactIds = erpCustomerRows
        .map((customer) => typeof customer.contact_id === "string" ? customer.contact_id : null)
        .filter((id): id is string => !!id);
      const [{ data: directContactRows, error: directContactError }, { data: resolvedContactRows, error: resolvedContactError }] = await Promise.all([
        directContactIds.length
          ? (supabase as any).from("contacts").select("id,email,phone").in("id", directContactIds)
          : Promise.resolve({ data: [], error: null }),
        erpCustomerIds.length
          ? (supabase as any).from("contacts").select("id,email,phone,linked_customer_id").in("linked_customer_id", erpCustomerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (directContactError) throw directContactError;
      if (resolvedContactError) throw resolvedContactError;

      const directContactById = new Map(((directContactRows ?? []) as Array<Record<string, any>>).map((contact) => [String(contact.id), contact]));
      const resolvedContactByCustomerId = new Map(
        ((resolvedContactRows ?? []) as Array<Record<string, any>>)
          .filter((contact) => typeof contact.linked_customer_id === "number")
          .map((contact) => [Number(contact.linked_customer_id), contact]),
      );

      const profileMap = new Map(
        ((data ?? []) as Record<string, any>[]).map((row) => [
          String(row.user_id),
          row,
        ]),
      );

      const customerRoleAccounts = users.filter((entry) => {
        const profile = profileMap.get(entry.user_id);
        // Include unassigned logins as portal candidates. An admin can link a
        // newly created or signed-up user to a customer from this screen;
        // staff-only roles remain out of the customer operations surface.
        const isStaffRole = entry.role === "admin" || entry.role === "operator" || entry.role === "viewer";
        return !isStaffRole || typeof profile?.crm_customer_id === "number";
      });
      const customerUserIds = customerRoleAccounts.map((entry) => entry.user_id);

      const [{ data: cartRows, error: cartError }, { data: alertRows, error: alertError }, { data: presenceRows, error: presenceError }] = await Promise.all([
        (supabase as any)
          .from("cart_items")
          .select("user_id,quantity")
          .in("user_id", customerUserIds),
        (supabase as any)
          .from("abandoned_cart_alerts")
          .select("user_id,status")
          .in("user_id", customerUserIds)
          .eq("status", "open"),
        (supabase as any)
          .from("user_presence")
          .select("user_id,status,last_heartbeat_at")
          .in("user_id", customerUserIds),
      ]);

      if (cartError) throw cartError;
      if (alertError) throw alertError;
      if (presenceError) throw presenceError;

      const cartCountByUser = ((cartRows ?? []) as Array<{ user_id: string; quantity: number }>).reduce<Record<string, number>>(
        (acc, row) => ({ ...acc, [row.user_id]: (acc[row.user_id] ?? 0) + Number(row.quantity ?? 0) }),
        {},
      );

      const openAlertByUser = new Set(((alertRows ?? []) as Array<{ user_id: string }>).map((row) => row.user_id));
      const presenceByUser = new Map(((presenceRows ?? []) as Array<{ user_id: string; status: string; last_heartbeat_at: string }>).map((row) => [row.user_id, row]));

      const portalAccounts: PortalAccountRecord[] = customerRoleAccounts
        .map((entry): PortalAccountRecord => {
          const profile = profileMap.get(entry.user_id);
          const cartItemCount = cartCountByUser[entry.user_id] ?? 0;
          const portalUser = {
            userId: entry.user_id,
            profileId: profile?.id ? String(profile.id) : `pending:${entry.user_id}`,
            // profiles.email is maintained from auth.users at signup. It remains
            // available even when the admin-only user-list endpoint is offline.
            email: String(profile?.email || entry.email || ""),
            fullName: String(profile?.full_name ?? entry.display_name ?? ""),
            phone: String(profile?.phone ?? ""),
            organizationName: String(profile?.organization_name ?? ""),
            portalAccessStatus: String(profile?.portal_access_status ?? "pending_profile"),
            portalAccessNote: String(profile?.portal_access_note ?? "Profile not completed yet."),
            portalAccessApprovedOverride: profile?.portal_access_approved_override === true,
            portalAccessApprovedAt: typeof profile?.portal_access_approved_at === "string" ? profile.portal_access_approved_at : null,
            portalAccessApprovedNote: typeof profile?.portal_access_approved_note === "string" ? profile.portal_access_approved_note : null,
            crmContactId: typeof profile?.crm_contact_id === "string" ? profile.crm_contact_id : null,
            crmCustomerId: typeof profile?.crm_customer_id === "number" ? profile.crm_customer_id : null,
            assignedPricelistId: null,
            cartItemCount,
            cartStatus: openAlertByUser.has(entry.user_id) ? "abandoned" : cartItemCount > 0 ? "in_progress" : "empty",
            presenceStatus: presenceByUser.get(entry.user_id)?.status ?? "offline",
          } satisfies PortalCustomerListItem;
          return {
            id: `user:${entry.user_id}`,
            portalUser,
            crmCustomerId: portalUser.crmCustomerId,
            crmContactId: portalUser.crmContactId,
            accountNumber: null,
            fullName: portalUser.fullName,
            email: portalUser.email,
            phone: portalUser.phone,
            organizationName: portalUser.organizationName,
            isErpCustomer: false,
          };
        })
        .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));

      const accountByCustomerId = new Map<number, PortalAccountRecord>();
      for (const account of portalAccounts) {
        if (account.crmCustomerId) accountByCustomerId.set(account.crmCustomerId, account);
      }

      for (const erpCustomer of erpCustomerRows) {
        const customerId = Number(erpCustomer.id);
        const directContactId = typeof erpCustomer.contact_id === "string" ? erpCustomer.contact_id : null;
        const linkedContact = (directContactId ? directContactById.get(directContactId) : null) ?? resolvedContactByCustomerId.get(customerId) ?? null;
        const contactEmail = typeof linkedContact?.email === "string" ? linkedContact.email : "";
        const contactPhone = typeof linkedContact?.phone === "string" ? linkedContact.phone : "";
        const contactId = typeof linkedContact?.id === "string" ? linkedContact.id : directContactId;
        const existing = accountByCustomerId.get(customerId);
        if (existing) {
          existing.accountNumber = typeof erpCustomer.account_number === "string" ? erpCustomer.account_number : null;
          existing.isErpCustomer = true;
          existing.crmContactId ||= contactId;
          existing.fullName ||= String(erpCustomer.name ?? "");
          existing.email ||= String(contactEmail || erpCustomer.email || "");
          existing.phone ||= String(contactPhone || erpCustomer.phone || "");
          continue;
        }
        portalAccounts.push({
          id: `erp:${customerId}`,
          portalUser: null,
          crmCustomerId: customerId,
          crmContactId: contactId,
          accountNumber: typeof erpCustomer.account_number === "string" ? erpCustomer.account_number : null,
          fullName: String(erpCustomer.name ?? "ERP customer"),
          email: String(contactEmail || erpCustomer.email || ""),
          phone: String(contactPhone || erpCustomer.phone || ""),
          organizationName: "",
          isErpCustomer: true,
        });
      }

      return portalAccounts.sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
    },
    enabled: !usersLoading,
  });

  const accounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customersQuery.data ?? []).filter((customer) => {
      if (!q) return true;
      return [customer.fullName, customer.email, customer.organizationName, customer.phone]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [customersQuery.data, search]);

  // The portal list is intentionally centred on ERP-backed accounts. Keep the
  // same source available at the approval decision so an admin can link a
  // signed-up or manually-created login before approving its portal access.
  const erpCustomers = useMemo(
    () => (customersQuery.data ?? []).filter((account) => typeof account.crmCustomerId === "number"),
    [customersQuery.data],
  );

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedCustomer = selectedAccount?.portalUser ?? null;

  // Retain support for legacy links that identify a portal account in the URL.
  // Normal row clicks open the contact editor directly without route navigation.
  useEffect(() => {
    if (!selectedAccountId || !selectedAccount || contactEditor) return;
    if (selectedAccount.crmContactId) {
      openContactEditor(selectedAccount.crmContactId, "portal-settings");
      return;
    }
    setAccountDialogOpen(true);
  }, [contactEditor, selectedAccount, selectedAccountId]);

  const detailQuery = useQuery({
    queryKey: ["website-portals-customer-detail", selectedCustomer?.userId],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      if (!selectedCustomer) return null;

      await (supabase.rpc as any)("sync_customer_portal_identity", {
        p_user_id: selectedCustomer.userId,
      });

      const [{ data: featureRows, error: featureError }, { data: cartRows, error: cartError }, { data: alerts, error: alertsError }, { data: inquiries, error: inquiriesError }, { data: quotes, error: quotesError }, { data: tickets, error: ticketsError }, { data: customerRow, error: customerError }, { data: canAccessStatements, error: statementsAccessError }] = await Promise.all([
        (supabase as any)
          .from("customer_portal_feature_overrides")
          .select("feature_key,enabled")
          .eq("user_id", selectedCustomer.userId),
        (supabase as any)
          .from("cart_items")
          .select("id,product_name,product_price,product_type,quantity")
          .eq("user_id", selectedCustomer.userId)
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("abandoned_cart_alerts")
          .select("id,total_items,total_amount,status,cutoff_hours,first_detected_at,last_detected_at,helpdesk_ticket_id,notification_id,email_outbox_id")
          .eq("user_id", selectedCustomer.userId)
          .order("last_detected_at", { ascending: false }),
        (supabase as any)
          .from("public_inquiries")
          .select("id,inquiry_type,business_name,message,created_at,page_slug")
          .eq("email", selectedCustomer.email)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("quotes")
          .select("id,quote_number,customer_name,grand_total,status,created_at")
          .eq("contact_email", selectedCustomer.email)
          .order("created_at", { ascending: false })
          .limit(20),
        selectedCustomer.crmContactId
          ? (supabase as any)
              .from("helpdesk_tickets")
              .select("id,ticket_number,title,source_channel,created_at")
              .eq("partner_contact_id", selectedCustomer.crmContactId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
        selectedCustomer.crmCustomerId
          ? (supabase as any)
              .from("customers")
              .select("assigned_pricelist_id,account_number")
              .eq("id", selectedCustomer.crmCustomerId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase.rpc as any)("can_access_customer_statement", { p_user_id: selectedCustomer.userId }),
      ]);

      if (featureError) throw featureError;
      if (cartError) throw cartError;
      if (alertsError) throw alertsError;
      if (inquiriesError) throw inquiriesError;
      if (quotesError) throw quotesError;
      if (ticketsError) throw ticketsError;
      if (customerError) throw customerError;
      if (statementsAccessError) throw statementsAccessError;

      const featureOverrides = ((featureRows ?? []) as Array<{ feature_key: string; enabled: boolean }>).reduce<Record<string, boolean>>(
        (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
        {},
      );

      return {
        ...selectedCustomer,
        featureOverrides,
        canAccessStatements: canAccessStatements === true,
        assignedPricelistId: typeof (customerRow as any)?.assigned_pricelist_id === "number" ? (customerRow as any).assigned_pricelist_id : null,
        accountNumber: typeof (customerRow as any)?.account_number === "string" ? (customerRow as any).account_number : null,
        cartItems: (cartRows ?? []) as PortalCustomerDetail["cartItems"],
        abandonedAlerts: (alerts ?? []) as PortalCustomerDetail["abandonedAlerts"],
        inquiries: (inquiries ?? []) as PortalCustomerDetail["inquiries"],
        quotes: (quotes ?? []) as PortalCustomerDetail["quotes"],
        tickets: (tickets ?? []) as PortalCustomerDetail["tickets"],
      } satisfies PortalCustomerDetail;
    },
  });

  const { orders, loading: ordersLoading, createOrder, refetch: refetchOrders } = useOrders(selectedCustomer?.userId ?? undefined);
  const { addresses, defaultShipping, defaultBilling, refetch: refetchAddresses } = useCustomerAddresses(selectedCustomer?.userId ?? undefined);
  const { paymentMethods, defaultPaymentMethod, refetch: refetchPaymentMethods } = useCustomerPaymentMethods(selectedCustomer?.userId ?? undefined);

  const upsertFeatureOverride = useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
      if (!selectedCustomer) throw new Error("Select a customer first.");
      const { error } = await (supabase as any)
        .from("customer_portal_feature_overrides")
        .upsert({ user_id: selectedCustomer.userId, feature_key: featureKey, enabled }, { onConflict: "user_id,feature_key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["portal-identity", selectedCustomer?.userId] });
      toast({ title: "Portal access updated", description: "Feature override has been saved." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to update portal feature.", variant: "destructive" }),
  });

  const assignPricelist = useMutation({
    mutationFn: async (pricelistId: number | null) => {
      if (!selectedCustomer?.crmCustomerId) throw new Error("Customer approval is required before assigning a pricelist.");
      const { error } = await (supabase as any)
        .from("customers")
        .update({ assigned_pricelist_id: pricelistId })
        .eq("id", selectedCustomer.crmCustomerId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      toast({ title: "Pricelist updated", description: "Customer pricing access has been updated." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to assign pricelist.", variant: "destructive" }),
  });
  const updateAccountNumber = useMutation({
    mutationFn: async (nextAccountNumber: string) => {
      if (!selectedCustomer?.crmCustomerId) throw new Error("Customer must be approved (have a CRM customer record) before an account number can be linked.");
      return assignCustomerAccountNumber(selectedCustomer.crmCustomerId, nextAccountNumber);
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      toast({ title: "Account number updated", description: "This is the only field that links the account to Innovations and online statements." });
    },
    onError: (error: any) => {
      const isConflict = error instanceof AccountNumberAssignmentError && error.result.status === "conflict";
      toast({
        title: isConflict ? "Account number already linked" : "Error",
        description: error.message || "Failed to update account number.",
        variant: "destructive",
        action: isConflict ? (
          <ToastAction altText="Open ERP account" onClick={() => navigate(`/admin/contacts?erpCustomer=${error.result.conflict_customer_id}`)}>
            Open contacts
          </ToastAction>
        ) : undefined,
      });
    },
  });

  const setPortalApproval = useMutation({
    mutationFn: async (approved: boolean) => {
      if (!selectedCustomer) throw new Error("Select a customer first.");
      if (approved && !selectedCustomer.crmCustomerId) throw new Error("Link this portal account to an ERP customer before approving access.");
      if (approved && !selectedCustomer.email.trim()) throw new Error("Add an email address before approving portal access.");
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert({
          user_id: selectedCustomer.userId,
          portal_access_approved_override: approved,
          portal_access_approved_by: approved ? user?.id ?? null : null,
          portal_access_approved_at: approved ? new Date().toISOString() : null,
          portal_access_approved_note: approved ? "Approved by Classic Visions for portal access before profile completion." : null,
        }, { onConflict: "user_id" });
      if (error) throw error;
      await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: selectedCustomer.userId });
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] });
      toast({ title: "Portal approval updated", description: "The account access state has been resynced." });
    },
    onError: (error: any) => toast({ title: "Approval failed", description: error.message || "Failed to update portal approval.", variant: "destructive" }),
  });

  const linkPortalToErpCustomer = useMutation({
    mutationFn: async (customerId: number) => {
      if (!selectedCustomer) throw new Error("Select a portal login first.");
      const customer = erpCustomers.find((account) => account.crmCustomerId === customerId);
      if (!customer) throw new Error("The selected ERP customer is no longer available.");

      const { error } = await (supabase as any)
        .from("profiles")
        .upsert({ user_id: selectedCustomer.userId, crm_customer_id: customerId }, { onConflict: "user_id" });
      if (error) throw error;

      const { error: syncError } = await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: selectedCustomer.userId });
      if (syncError) throw syncError;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] }),
        queryClient.invalidateQueries({ queryKey: ["website-portals-customer-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
      toast({ title: "ERP customer linked", description: "The login can now be approved for portal access when its email is available." });
    },
    onError: (error: any) => toast({ title: "Customer link failed", description: error.message || "Unable to link this portal login to the ERP customer.", variant: "destructive" }),
  });

  const updateCustomerProfile = useMutation({
    mutationFn: async (payload: { full_name: string; phone: string; organization_name: string }) => {
      if (!selectedCustomer) throw new Error("Select a customer first.");
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert({
          user_id: selectedCustomer.userId,
          full_name: payload.full_name.trim(),
          phone: payload.phone.trim(),
          organization_name: payload.organization_name.trim(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      if (selectedCustomer.crmContactId) {
        const { data: contact, error: contactLookupError } = await (supabase as any)
          .from("contacts")
          .select("name,phone,business_name")
          .eq("id", selectedCustomer.crmContactId)
          .maybeSingle();
        if (contactLookupError) throw contactLookupError;
        const contactPatch: Record<string, string | null> = {};
        // A profile may supply missing CRM information, but it must never
        // overwrite an existing contact value (especially an ERP-synced one).
        if (payload.full_name.trim() && !String(contact?.name ?? "").trim()) contactPatch.name = payload.full_name.trim();
        if (payload.phone.trim() && !String(contact?.phone ?? "").trim()) contactPatch.phone = payload.phone.trim();
        if (payload.organization_name.trim() && !String(contact?.business_name ?? "").trim()) contactPatch.business_name = payload.organization_name.trim();
        if (Object.keys(contactPatch).length) {
          const { error: contactError } = await (supabase as any)
            .from("contacts")
            .update(contactPatch)
            .eq("id", selectedCustomer.crmContactId);
          if (contactError) throw contactError;
        }
      }
      await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: selectedCustomer.userId });
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] });
      toast({ title: "Profile updated", description: selectedCustomer.crmContactId ? "Customer profile and linked ERP contact were updated." : "Customer profile details were saved and resynced." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to update customer profile.", variant: "destructive" }),
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase as any)
        .from("abandoned_cart_alerts")
        .update({ status: "resolved" })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => { detailQuery.refetch(); toast({ title: "Alert resolved", description: "The abandoned cart alert has been marked resolved." }); },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to resolve alert.", variant: "destructive" }),
  });

  const runAbandonedCartScan = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("queue_abandoned_cart_alerts", { p_cutoff_hours: Number(cutoffHours || 24) });
      if (error) throw error;
      return data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customer-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({
        title: "Abandoned cart scan complete",
        description: `Created ${result?.created ?? 0} alert(s) and refreshed ${result?.updated ?? 0}.`,
      });
      detailQuery.refetch();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to scan abandoned carts.", variant: "destructive" }),
  });

  const placeOnBehalfOrder = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || !detailQuery.data) throw new Error("Select a customer first.");
      if (!detailQuery.data.cartItems.length) throw new Error("This customer has no cart items to convert.");
      if (!defaultShipping) throw new Error("Add a saved address before placing an order on behalf.");

      const checkout: CheckoutFormData = {
        fullName: selectedCustomer.fullName || selectedCustomer.email,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        shippingAddressId: defaultShipping.id,
        billingAddressId: defaultBilling?.id ?? defaultShipping.id,
        shippingAddress: {
          recipient: defaultShipping.recipient,
          line1: defaultShipping.line1,
          line2: defaultShipping.line2,
          city: defaultShipping.city,
          state: defaultShipping.state,
          postalCode: defaultShipping.postalCode,
          country: defaultShipping.country,
        },
        billingAddress: {
          recipient: (defaultBilling ?? defaultShipping).recipient,
          line1: (defaultBilling ?? defaultShipping).line1,
          line2: (defaultBilling ?? defaultShipping).line2,
          city: (defaultBilling ?? defaultShipping).city,
          state: (defaultBilling ?? defaultShipping).state,
          postalCode: (defaultBilling ?? defaultShipping).postalCode,
          country: (defaultBilling ?? defaultShipping).country,
        },
        checkoutMethod: defaultPaymentMethod ? "saved_demo_card" : "manual_review",
        paymentMethodId: defaultPaymentMethod?.id ?? null,
        savePaymentMethod: false,
        cardholderName: defaultPaymentMethod?.cardholderName ?? selectedCustomer.fullName ?? selectedCustomer.email,
        cardBrand: defaultPaymentMethod?.brand ?? "Manual review",
        cardLast4: defaultPaymentMethod?.last4 ?? "",
        expiryMonth: defaultPaymentMethod?.expiryMonth ?? new Date().getMonth() + 1,
        expiryYear: defaultPaymentMethod?.expiryYear ?? new Date().getFullYear(),
      };

      const total = detailQuery.data.cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
      return createOrder(detailQuery.data.cartItems as any, total, checkout, user?.id);
    },
    onSuccess: async (order) => {
      if (!order) return;
      await detailQuery.refetch();
      await refetchOrders();
      toast({ title: "Order placed", description: `Created order ${order.id.slice(0, 8).toUpperCase()} on behalf of the customer.` });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to place order on behalf.", variant: "destructive" }),
  });

  useEffect(() => {
    if (!selectedCustomer?.userId) return;
    refetchAddresses();
    refetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.userId]);

  useEffect(() => {
    if (!detailQuery.data) return;
    setProfileDraft({
      full_name: detailQuery.data.fullName || "",
      phone: detailQuery.data.phone || "",
      organization_name: detailQuery.data.organizationName || "",
    });
    setAccountNumberDraft(detailQuery.data.accountNumber || "");
  }, [detailQuery.data]);

  const openProvisioning = (mode: "create" | "invite") => {
    if (!selectedAccount?.crmCustomerId) return;
    setAccountDialogOpen(false);
    setProvisioningMode(mode);
    setProvisioningEmail(selectedAccount.email);
    setProvisioningName(selectedAccount.fullName);
    setProvisioningPassword("");
  };

  const provisionAccount = async () => {
    if (!selectedAccount?.crmCustomerId || !provisioningMode) return;
    try {
      if (provisioningMode === "invite") {
        await inviteUser.mutateAsync({
          email: provisioningEmail,
          customerId: selectedAccount.crmCustomerId,
          contactId: selectedAccount.crmContactId ?? undefined,
          displayName: provisioningName,
        });
        toast({ title: "Invite sent", description: `The existing customer invitation email was sent to ${provisioningEmail}.` });
      } else {
        const result = await createUser.mutateAsync({
          email: provisioningEmail,
          password: provisioningPassword,
          displayName: provisioningName,
          customerId: selectedAccount.crmCustomerId,
          contactId: selectedAccount.crmContactId ?? undefined,
        });
        if ((result as any)?.alreadyExisted) {
          toast({ title: "Existing login linked", description: `An account for ${provisioningEmail} already existed and has been linked to this customer. The submitted password was ignored — send a reset if they need one.` });
        } else {
          toast({ title: "Customer account created", description: "The login is linked to this approved ERP customer." });
        }
      }
      setProvisioningMode(null);
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] });
    } catch (error: any) {
      toast({ title: "Account setup failed", description: error.message || "Unable to create the customer account.", variant: "destructive" });
    }
  };

  const openContactEditor = (contactId: string, initialTab: "details" | "account-settings" | "portal-settings" = "details") => {
    setContactEditor({ contactId, initialTab });
  };

  const openPortalContactEditor = (account: PortalAccountRecord, initialTab: "details" | "account-settings" | "portal-settings") => {
    setSelectedAccountId(account.id);
    if (account.crmContactId) openContactEditor(account.crmContactId, initialTab);
  };

  const openPortalContact = (account: PortalAccountRecord) => {
    // Keep the selected portal identity available so its profile-to-contact
    // synchronization completes before the shared editor is shown.
    if (account.crmContactId) {
      openPortalContactEditor(account, "portal-settings");
      return;
    }
    setSelectedAccountId(account.id);
    setAccountDialogOpen(true);
  };

  const emulatePortalAccount = (account: PortalAccountRecord) => {
    if (!account.portalUser) return;
    startPortalEmulation({ userId: account.portalUser.userId, label: account.fullName || account.email || "customer" });
    navigate("/profile");
  };

  const createPortalLogin = (account: PortalAccountRecord) => {
    if (!account.crmCustomerId) {
      toast({ title: "Customer approval required", description: "Approve or link this customer before creating a website login.", variant: "destructive" });
      return;
    }
    setSelectedAccountId(account.id);
    setProvisioningMode("create");
    setProvisioningEmail(account.email);
    setProvisioningName(account.fullName);
    setProvisioningPassword("");
  };

  const portalSettings = !selectedAccount ? null : !selectedCustomer ? (
    <Card className="shadow-none hover:shadow-none">
      <CardHeader>
        <CardTitle>Portal access</CardTitle>
        <CardDescription>This approved customer has no website login yet. Create one when portal access is needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => createPortalLogin(selectedAccount)} disabled={!selectedAccount.email}>
          <UserPlus className="mr-2 h-4 w-4" />Create login
        </Button>
      </CardContent>
    </Card>
  ) : !detailQuery.data ? (
    <Card className="shadow-none hover:shadow-none"><CardContent className="py-10 text-sm text-muted-foreground">Loading portal settings…</CardContent></Card>
  ) : (
    <Tabs defaultValue="operations" className="space-y-4">
      <TabsList className="flex w-full flex-wrap justify-start gap-2">
        <TabsTrigger value="operations">Operations</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="support">Support</TabsTrigger>
      </TabsList>

      <TabsContent value="operations" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none hover:shadow-none">
            <CardHeader><CardTitle className="text-base">Feature access</CardTitle><CardDescription>Overrides become available for the linked website account.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {FEATURE_KEYS.map((feature) => {
                const enabled = detailQuery.data.featureOverrides[feature];
                return <Button key={feature} type="button" variant={enabled ? "default" : "outline"} className="w-full justify-between" onClick={() => upsertFeatureOverride.mutate({ featureKey: feature, enabled: !enabled })}>
                  {FEATURE_LABELS[feature]}<span className="text-xs">{enabled ? "Enabled" : "Default"}</span>
                </Button>;
              })}
            </CardContent>
          </Card>
          <Card className="shadow-none hover:shadow-none">
            <CardHeader><CardTitle className="text-base">Account actions</CardTitle><CardDescription>Customer identity is edited on Details and Account Settings.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={async () => { try { await resetPassword.mutateAsync(detailQuery.data.email); toast({ title: "Reset sent", description: "Password reset email has been sent." }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to send reset email.", variant: "destructive" }); } }} disabled={!detailQuery.data.email || resetPassword.isPending}>
                <Mail className="mr-2 h-4 w-4" />{resetPassword.isPending ? "Sending reset…" : "Send password reset"}
              </Button>
              <div className="space-y-2"><Label>Assigned pricelist</Label><Select value={detailQuery.data.assignedPricelistId ? String(detailQuery.data.assignedPricelistId) : "none"} onValueChange={(value) => assignPricelist.mutate(value === "none" ? null : Number(value))}><SelectTrigger><SelectValue placeholder="Select a pricelist" /></SelectTrigger><SelectContent><SelectItem value="none">No assigned pricelist</SelectItem>{pricelistVersions.map((version) => <SelectItem key={version.id} value={String(version.id)}>{version.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Innovations account number</Label><div className="flex gap-2"><Input value={accountNumberDraft} onChange={(event) => setAccountNumberDraft(event.target.value)} placeholder="e.g. RETAIL" disabled={!detailQuery.data.crmCustomerId} /><Button size="sm" variant="outline" onClick={() => updateAccountNumber.mutate(accountNumberDraft)} disabled={updateAccountNumber.isPending || !detailQuery.data.crmCustomerId || normalizeAccountNumberInput(accountNumberDraft) === normalizeAccountNumberInput(detailQuery.data.accountNumber)}>{updateAccountNumber.isPending ? "Saving…" : "Save"}</Button></div></div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Current cart</CardTitle><CardDescription>{detailQuery.data.cartItems.length} item(s) in progress.</CardDescription></CardHeader><CardContent className="space-y-2">{detailQuery.data.cartItems.length ? detailQuery.data.cartItems.map((item) => <div key={item.id} className="flex justify-between rounded border px-3 py-2 text-sm"><span>{item.product_name} × {item.quantity}</span><span>{formatMoney(item.product_price * item.quantity)}</span></div>) : <p className="text-sm text-muted-foreground">No active cart items.</p>}<Button className="w-full" onClick={() => placeOnBehalfOrder.mutate()} disabled={placeOnBehalfOrder.isPending || !detailQuery.data.cartItems.length}><ShoppingCart className="mr-2 h-4 w-4" />{placeOnBehalfOrder.isPending ? "Placing order…" : "Place order on behalf"}</Button></CardContent></Card>
          <Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Abandoned carts</CardTitle><CardDescription>{detailQuery.data.abandonedAlerts.filter((alert) => alert.status === "open").length} open alert(s).</CardDescription></CardHeader><CardContent className="space-y-2">{detailQuery.data.abandonedAlerts.length ? detailQuery.data.abandonedAlerts.map((alert) => <div key={alert.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><span>{alert.total_items} item(s) · {formatMoney(alert.total_amount)}</span>{alert.status === "open" ? <Button size="sm" variant="outline" onClick={() => resolveAlert.mutate(alert.id)} disabled={resolveAlert.isPending}>Resolve</Button> : <Badge variant="secondary">Resolved</Badge>}</div>) : <p className="text-sm text-muted-foreground">No abandoned cart alerts.</p>}</CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="orders"><Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Orders and payments</CardTitle></CardHeader><CardContent className="space-y-2">{ordersLoading ? <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /> : orders.length ? orders.map((order) => <div key={order.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><span>#{order.id.slice(0, 8).toUpperCase()} · {order.status}</span><Badge variant="outline">{formatMoney(order.totalAmount)}</Badge></div>) : <p className="text-sm text-muted-foreground">No orders on file.</p>}</CardContent></Card></TabsContent>
      <TabsContent value="addresses"><AddressBookSection targetUserId={selectedCustomer.userId} title="Customer addresses" description="Update saved checkout addresses." /></TabsContent>
      <TabsContent value="payments"><PaymentMethodsSection targetUserId={selectedCustomer.userId} title="Saved payment methods" description="Manage saved payment methods for this customer." /></TabsContent>
      <TabsContent value="support"><div className="grid gap-4 xl:grid-cols-3"><Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Helpdesk tickets</CardTitle></CardHeader><CardContent className="space-y-2">{detailQuery.data.tickets.length ? detailQuery.data.tickets.map((ticket) => <div key={ticket.id} className="rounded border p-2 text-sm"><p className="font-medium">{ticket.ticket_number}</p><p className="text-muted-foreground">{ticket.title}</p></div>) : <p className="text-sm text-muted-foreground">No linked tickets.</p>}</CardContent></Card><Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Submitted forms</CardTitle></CardHeader><CardContent className="space-y-2">{detailQuery.data.inquiries.length ? detailQuery.data.inquiries.map((inquiry) => <div key={inquiry.id} className="rounded border p-2 text-sm"><p className="font-medium">{inquiry.inquiry_type}</p><p className="line-clamp-2 text-muted-foreground">{inquiry.message || "No message"}</p></div>) : <p className="text-sm text-muted-foreground">No form submissions.</p>}</CardContent></Card><Card className="shadow-none hover:shadow-none"><CardHeader><CardTitle className="text-base">Quote requests</CardTitle></CardHeader><CardContent className="space-y-2">{detailQuery.data.quotes.length ? detailQuery.data.quotes.map((quote) => <div key={quote.id} className="rounded border p-2 text-sm"><p className="font-medium">{quote.quote_number}</p><p className="text-muted-foreground">{formatMoney(quote.grand_total)} · {quote.status}</p></div>) : <p className="text-sm text-muted-foreground">No quote requests.</p>}</CardContent></Card></div></TabsContent>
    </Tabs>
  );

  const handleAccountDialogOpenChange = (open: boolean) => {
    setAccountDialogOpen(open);
    if (!open) clearSelectedAccount();
  };


  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <div className="shrink-0">
        <AdminPageHeader icon={ShieldCheck} title="Website Portals">
          <div className="flex items-center gap-2">
            <Input value={cutoffHours} onChange={(event) => setCutoffHours(event.target.value)} className="h-8 w-20 text-xs" />
            <Button size="sm" variant="outline" onClick={() => runAbandonedCartScan.mutate()} disabled={runAbandonedCartScan.isPending}>
              <BellRing className="mr-2 h-3.5 w-3.5" />
              {runAbandonedCartScan.isPending ? "Scanning…" : "Scan abandoned carts"}
            </Button>
          </div>
        </AdminPageHeader>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-none hover:shadow-none">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Customer accounts</CardTitle>
                <CardDescription className="mt-1">ERP customers are approved by default. A website login is optional until it is needed.</CardDescription>
              </div>
              <Badge variant="outline">{accounts.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts, email, ERP number…" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden px-0 pb-0">
            <div className="h-full overflow-auto border-t">
              <table className="w-full min-w-[820px] table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-background text-xs text-muted-foreground shadow-sm">
                  <tr className="border-y">
                    <th className="w-[28%] px-4 py-3 font-medium">Account name</th>
                    <th className="w-[28%] px-4 py-3 font-medium">Email</th>
                    <th className="w-[16%] px-4 py-3 font-medium">ERP ACC#</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Login</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const user = account.portalUser;
                    return (
                      <ContextMenu key={account.id}>
                      <ContextMenuTrigger asChild>
                      <tr
                        onClick={() => openPortalContact(account)}
                        className={`cursor-pointer border-b align-top transition-colors ${selectedAccountId === account.id ? "bg-[hsl(var(--admin-accent)/0.08)]" : "hover:bg-muted/60"}`}
                      >
                        <td className="px-4 py-3">
                          {account.crmContactId ? (
                            <button
                              type="button"
                              className="text-left font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={(event) => { event.stopPropagation(); openPortalContact(account); }}
                            >
                              {account.fullName || account.email || "Unnamed account"}
                            </button>
                          ) : (
                            <p className="font-medium text-foreground">{account.fullName || account.email || "Unnamed account"}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{account.email || "No email on file"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {account.isErpCustomer ? <span>{account.accountNumber || "ERP customer"}</span> : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {user ? (
                            <span className="flex items-center gap-2">
                              <Badge variant="outline">Active</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                title="View the customer portal as this account (no login needed)"
                                onClick={(event) => { event.stopPropagation(); emulatePortalAccount(account); }}
                              >
                                <Eye className="mr-1 h-3 w-3" /> Emulate
                              </Button>
                            </span>
                          ) : <Badge variant="secondary">Not created</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {user ? (
                            <span className="space-y-1">
                              <Badge variant={user.crmCustomerId ? "default" : "secondary"}>{user.crmCustomerId ? "Approved" : user.portalAccessStatus.replace(/_/g, " ")}</Badge>
                              {user.cartStatus === "abandoned" ? <Badge className="ml-1" variant="destructive">Cart alert</Badge> : null}
                            </span>
                          ) : account.isErpCustomer ? <Badge variant="outline">Approved</Badge> : <Badge variant="secondary">Needs review</Badge>}
                        </td>
                      </tr>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => account.crmContactId && openPortalContactEditor(account, "details")} disabled={!account.crmContactId}>Edit contact</ContextMenuItem>
                        <ContextMenuItem onSelect={() => openPortalContact(account)}>Edit portal</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={() => emulatePortalAccount(account)} disabled={!account.portalUser}>Emulate</ContextMenuItem>
                        <ContextMenuItem onSelect={() => createPortalLogin(account)} disabled={!account.crmCustomerId || !!account.portalUser}>Create login</ContextMenuItem>
                      </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                  {!accounts.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No customer accounts match this search.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={accountDialogOpen && !!selectedAccount} onOpenChange={handleAccountDialogOpenChange}>
          <DialogContent className={`flex max-w-6xl flex-col overflow-hidden p-0 ${selectedCustomer ? "h-[min(860px,calc(100vh-3rem))]" : "max-h-[calc(100vh-3rem)]"}`}>
            <DialogTitle className="sr-only">{selectedAccount?.fullName || selectedAccount?.email || "Customer account"}</DialogTitle>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          {!selectedAccount ? (
            <Card className="shadow-none hover:shadow-none">
              <CardContent className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                Select an account to review its ERP relationship, login readiness, and portal activity.
              </CardContent>
            </Card>
          ) : !selectedCustomer ? (
            <Card className="min-h-[320px] shadow-none hover:shadow-none">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedAccount.fullName || "ERP customer"}</CardTitle>
                    <CardDescription>This approved ERP customer does not have a website login yet. Set one up when they need portal access; purchases are not required.</CardDescription>
                  </div>
                  <Badge variant="outline">ERP approved</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Email</p><p className="mt-1 text-sm font-medium">{selectedAccount.email || "Missing"}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Phone</p><p className="mt-1 text-sm font-medium">{selectedAccount.phone || "Missing"}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Account number</p><p className="mt-1 text-sm font-medium">{selectedAccount.accountNumber || "Not linked"}</p></div>
                </div>
                <div className="rounded-xl border border-dashed p-4">
                  <p className="font-medium text-foreground">Finish account setup</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create a login and password for the customer, or use the established invitation template to let them choose their own password.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => openProvisioning("create")} disabled={!selectedAccount.email}><UserPlus className="mr-2 h-4 w-4" />Create login</Button>
                    <Button variant="outline" onClick={() => openProvisioning("invite")} disabled={!selectedAccount.email}><Mail className="mr-2 h-4 w-4" />Send invite</Button>
                  {selectedAccount.crmContactId ? <Button variant="ghost" onClick={() => openContactEditor(selectedAccount.crmContactId)}>Edit account &amp; contact</Button> : null}
                  </div>
                  {!selectedAccount.email ? <p className="mt-3 text-xs text-amber-700">Add an email address in the ERP contact before creating or inviting this account.</p> : null}
                </div>
              </CardContent>
            </Card>
          ) : !detailQuery.data ? (
            <Card className="shadow-none hover:shadow-none"><CardContent className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">Loading customer account…</CardContent></Card>
          ) : (
            <>
              <Card className="shrink-0 shadow-none hover:shadow-none">
                <CardHeader>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <CardTitle className="text-xl">{detailQuery.data.fullName || detailQuery.data.email}</CardTitle>
                      <CardDescription>{detailQuery.data.portalAccessNote || "Portal record ready for operations review."}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{detailQuery.data.portalAccessStatus.replace(/_/g, " ")}</Badge>
                      <Badge variant={selectedCustomer?.presenceStatus === "online" ? "default" : "secondary"}>{selectedCustomer?.presenceStatus ?? "offline"}</Badge>
                      {detailQuery.data.crmCustomerId ? <Badge variant="outline">Approved customer</Badge> : <Badge variant="secondary">Pending approval</Badge>}
                      {detailQuery.data.canAccessStatements ? <Badge variant="outline">Statements allowed</Badge> : <Badge variant="secondary">Statements gated</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(!detailQuery.data.email || !detailQuery.data.fullName || !detailQuery.data.phone || !detailQuery.data.organizationName) ? (
                    <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">Finish account setup</p>
                        <p className="mt-1 text-sm text-muted-foreground">{detailQuery.data.crmCustomerId ? "Complete the missing contact details, then save the profile to update the linked ERP contact." : "Add the missing contact details so this account can complete customer approval."}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => document.getElementById("portal-profile-tab")?.click()}>Complete profile</Button>
                    </div>
                  ) : null}
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="mt-2 font-medium text-foreground">{detailQuery.data.email || "—"}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                    <p className="mt-2 font-medium text-foreground">{detailQuery.data.phone || "—"}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Organization</p>
                    <p className="mt-2 font-medium text-foreground">{detailQuery.data.organizationName || "—"}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cart value</p>
                    <p className="mt-2 font-medium text-foreground">
                      {formatMoney(detailQuery.data.cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="operations" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <TabsList className="flex w-full shrink-0 flex-wrap justify-start gap-2">
                  <TabsTrigger value="operations">Operations</TabsTrigger>
                  <TabsTrigger id="portal-profile-tab" value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="support">Support</TabsTrigger>
                </TabsList>

                <TabsContent value="operations" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <Card className="shadow-none hover:shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <UserRound className="h-5 w-5" />
                        Customer operations cockpit
                      </CardTitle>
                      <CardDescription>Enable portal workflows, assign pricing, recover abandoned carts, and place orders on behalf of the customer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3 rounded-xl border p-4">
                          <p className="text-sm font-semibold text-foreground">Feature access overrides</p>
                          <div className="space-y-2">
                            {FEATURE_KEYS.map((feature) => {
                              const enabled = detailQuery.data.featureOverrides[feature];
                              return (
                                <button
                                  key={feature}
                                  type="button"
                                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left ${enabled ? "border-primary bg-primary/5" : "border-border"}`}
                                  onClick={() => upsertFeatureOverride.mutate({ featureKey: feature, enabled: !enabled })}
                                >
                                  <span>
                                    <span className="block text-sm font-medium text-foreground">{FEATURE_LABELS[feature]}</span>
                                    <span className="block text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</span>
                                  </span>
                                  <span className="text-xs font-semibold text-primary">{enabled ? "Enabled" : "Default"}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4 rounded-xl border p-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Account actions</p>
                            <p className="text-xs text-muted-foreground">High-trust actions are logged through auth or order/payment records.</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-lg border p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-foreground">Portal access approval</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {detailQuery.data.portalAccessApprovedOverride
                                      ? `Approved${detailQuery.data.portalAccessApprovedAt ? ` ${formatDateTime(detailQuery.data.portalAccessApprovedAt)}` : ""}.`
                                      : "Link the ERP customer, confirm an email, then approve access even when profile cleanup is still pending."}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={detailQuery.data.portalAccessApprovedOverride ? "outline" : "default"}
                                  onClick={() => setPortalApproval.mutate(!detailQuery.data.portalAccessApprovedOverride)}
                                  disabled={setPortalApproval.isPending || !detailQuery.data.crmCustomerId || !detailQuery.data.email.trim()}
                                >
                                  {setPortalApproval.isPending
                                    ? "Saving..."
                                    : detailQuery.data.portalAccessApprovedOverride
                                      ? "Remove approval"
                                      : "Approve portal access"}
                                </Button>
                              </div>
                              <div className="mt-3 space-y-2">
                                <Label htmlFor="portal-erp-customer">ERP customer</Label>
                                <Select
                                  value={detailQuery.data.crmCustomerId ? String(detailQuery.data.crmCustomerId) : undefined}
                                  onValueChange={(value) => linkPortalToErpCustomer.mutate(Number(value))}
                                  disabled={linkPortalToErpCustomer.isPending || customersQuery.isLoading}
                                >
                                  <SelectTrigger id="portal-erp-customer"><SelectValue placeholder="Select the customer or company to link" /></SelectTrigger>
                                  <SelectContent>
                                    {erpCustomers.map((account) => (
                                      <SelectItem key={account.crmCustomerId} value={String(account.crmCustomerId)}>
                                        {account.fullName || "Unnamed ERP customer"}{account.accountNumber ? ` · ${account.accountNumber}` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">This is the account whose prices, statements, and portal information the user can view.</p>
                              </div>
                              {!detailQuery.data.crmCustomerId ? <p className="mt-2 text-xs text-amber-700">Missing ERP customer link — choose the customer above, or create/link it in Contacts.</p> : null}
                              {!detailQuery.data.email.trim() ? <p className="mt-2 text-xs text-amber-700">Missing email — add it in User Management or the linked contact before approving access.</p> : null}
                              {!detailQuery.data.crmContactId ? (
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                                  <span>No CRM contact is linked yet. Link or create one to keep the person record complete.</span>
                                  <Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={() => navigate("/admin/contacts")}>Open Contacts</Button>
                                </div>
                              ) : null}
                              <p className="mt-2 text-xs text-muted-foreground">
                                Statements allowed: {detailQuery.data.canAccessStatements ? "Yes" : "Owner/CEO/Buyer tag required"}.
                              </p>
                            </div>
                            <Button variant="outline" className="w-full justify-start" onClick={async () => { try { await resetPassword.mutateAsync(detailQuery.data.email); toast({ title: "Reset sent", description: "Password reset email has been sent." }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to send reset email.", variant: "destructive" }); } }} disabled={!detailQuery.data.email || resetPassword.isPending}>
                              <Mail className="mr-2 h-4 w-4" />
                              {resetPassword.isPending ? "Sending reset…" : "Send password reset"}
                            </Button>
                            <div className="space-y-2">
                              <Label>Assigned pricelist</Label>
                              <Select
                                value={detailQuery.data.assignedPricelistId ? String(detailQuery.data.assignedPricelistId) : "none"}
                                onValueChange={(value) => assignPricelist.mutate(value === "none" ? null : Number(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a pricelist" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No assigned pricelist</SelectItem>
                                  {pricelistVersions.map((version) => (
                                    <SelectItem key={version.id} value={String(version.id)}>{version.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Account number</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={accountNumberDraft}
                                  onChange={(event) => setAccountNumberDraft(event.target.value)}
                                  placeholder="e.g. RETAIL"
                                  disabled={!detailQuery.data.crmCustomerId}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateAccountNumber.mutate(accountNumberDraft)}
                                  disabled={
                                    updateAccountNumber.isPending ||
                                    !detailQuery.data.crmCustomerId ||
                                    normalizeAccountNumberInput(accountNumberDraft) === normalizeAccountNumberInput(detailQuery.data.accountNumber)
                                  }
                                >
                                  {updateAccountNumber.isPending ? "Saving…" : "Save"}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {detailQuery.data.crmCustomerId
                                  ? "The only field linking this account to Innovations and their online statements."
                                  : "Customer must be approved before an account number can be linked."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4 rounded-xl border p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Current cart</p>
                              <p className="text-xs text-muted-foreground">Use a saved card to capture payment immediately, or create a pending manual-review order if no card is on file.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{detailQuery.data.cartItems.length} item(s)</Badge>
                              {detailQuery.data.abandonedAlerts.some((alert) => alert.status === "open")
                                ? <Badge variant="destructive">Abandoned</Badge>
                                : detailQuery.data.cartItems.length > 0
                                  ? <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">In progress</Badge>
                                  : <Badge variant="secondary">Empty</Badge>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {detailQuery.data.cartItems.length ? detailQuery.data.cartItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                <span>{item.product_name} × {item.quantity}</span>
                                <span>{formatMoney(item.product_price * item.quantity)}</span>
                              </div>
                            )) : <p className="text-sm text-muted-foreground">No active cart items.</p>}
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span>Default saved card</span>
                            <span className="font-medium">{defaultPaymentMethod ? `${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}` : "Manual review"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Default shipping</span>
                            <span className="font-medium">{defaultShipping ? defaultShipping.label : "Missing"}</span>
                          </div>
                          <Button className="w-full" onClick={() => placeOnBehalfOrder.mutate()} disabled={placeOnBehalfOrder.isPending || !detailQuery.data.cartItems.length}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {placeOnBehalfOrder.isPending ? "Placing order…" : defaultPaymentMethod ? "Place order & capture payment on behalf" : "Create pending order for manual payment review"}
                          </Button>
                        </div>

                        <div className="space-y-4 rounded-xl border p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Abandoned cart automation</p>
                              <p className="text-xs text-muted-foreground">Queued alerts generate an admin notification, email outbox record, and helpdesk ticket.</p>
                            </div>
                            <Badge variant="outline">{detailQuery.data.abandonedAlerts.filter((alert) => alert.status === "open").length} open</Badge>
                          </div>
                          <div className="space-y-3">
                            {detailQuery.data.abandonedAlerts.length ? detailQuery.data.abandonedAlerts.map((alert) => (
                              <div key={alert.id} className="rounded-lg border p-3 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{alert.total_items} item(s) • {formatMoney(alert.total_amount)}</p>
                                    <p className="text-xs text-muted-foreground">Detected {formatDateTime(alert.first_detected_at)} • last seen {formatDateTime(alert.last_detected_at)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Email outbox: {alert.email_outbox_id ? "queued" : "not queued"} • Ticket: {alert.helpdesk_ticket_id ? "created" : "missing"}</p>
                                  </div>
                                  {alert.status === "open" ? (
                                    <Button variant="outline" size="sm" onClick={() => resolveAlert.mutate(alert.id)} disabled={resolveAlert.isPending}>Resolve</Button>
                                  ) : (
                                    <Badge variant="secondary">Resolved</Badge>
                                  )}
                                </div>
                              </div>
                            )) : <p className="text-sm text-muted-foreground">No abandoned cart alerts have been generated for this customer yet.</p>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <Card className="shadow-none hover:shadow-none">
                    <CardHeader>
                      <CardTitle className="text-lg">Profile details (admin edit-on-behalf)</CardTitle>
                      <CardDescription>Keep customer account identity complete and synchronized.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Portal access</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Approval lets this login use portal workflows even if profile cleanup is still pending. Statements still require an Owner, CEO, or Buyer tag.
                            </p>
                          </div>
                          <Badge variant={detailQuery.data.portalAccessApprovedOverride ? "default" : "secondary"}>
                            {detailQuery.data.portalAccessApprovedOverride ? "Override approved" : "No override"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Statements allowed: {detailQuery.data.canAccessStatements ? "Yes" : "Owner/CEO/Buyer tag required"}.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Full name</Label>
                        <Input value={profileDraft.full_name} onChange={(event) => setProfileDraft((prev) => ({ ...prev, full_name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={profileDraft.phone} onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Organization</Label>
                        <Input value={profileDraft.organization_name} onChange={(event) => setProfileDraft((prev) => ({ ...prev, organization_name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Innovations account number override</Label>
                        <div className="flex items-center gap-2">
                          <Input value={accountNumberDraft} onChange={(event) => setAccountNumberDraft(event.target.value)} placeholder="e.g. RETAIL" disabled={!detailQuery.data.crmCustomerId} />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateAccountNumber.mutate(accountNumberDraft)}
                            disabled={updateAccountNumber.isPending || !detailQuery.data.crmCustomerId || normalizeAccountNumberInput(accountNumberDraft) === normalizeAccountNumberInput(detailQuery.data.accountNumber)}
                          >
                            {updateAccountNumber.isPending ? "Saving…" : "Save"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Use this manual override only to correct the company’s ERP account link. Link an ERP customer in Operations first; the account number is unique and drives Innovations statements.</p>
                      </div>
                      <Button
                        onClick={() => updateCustomerProfile.mutate(profileDraft)}
                        disabled={updateCustomerProfile.isPending}
                      >
                        Save & resync profile
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <Card className="shadow-none hover:shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Orders & payments
                      </CardTitle>
                      <CardDescription>Review customer-initiated and staff-assisted orders, including payment summaries.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ordersLoading ? <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /> : orders.length ? orders.map((order) => (
                        <div key={order.id} className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)} • {order.status}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{order.payments[0] ? `${order.payments[0].provider.toUpperCase()} • ${order.payments[0].cardBrand ?? "Card"} •••• ${order.payments[0].cardLast4 ?? "0000"}` : "No payment recorded"}</p>
                            </div>
                            <Badge variant="outline">{formatMoney(order.totalAmount)}</Badge>
                          </div>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No orders on file yet.</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="addresses" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-4">
                    <AddressBookSection
                      targetUserId={selectedCustomer.userId}
                      title="Customer addresses"
                      description="Update the customer’s saved checkout addresses. Maximum 2 addresses per account."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-4">
                    <PaymentMethodsSection
                      targetUserId={selectedCustomer.userId}
                      title="Saved demo cards"
                      description="Manage the customer’s tokenized demo cards for on-behalf ordering and saved checkout."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="support" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="shadow-none hover:shadow-none">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><LifeBuoy className="h-5 w-5" /> Helpdesk tickets</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {detailQuery.data.tickets.length ? detailQuery.data.tickets.map((ticket) => (
                          <div key={ticket.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium text-foreground">{ticket.ticket_number}</p>
                            <p className="text-muted-foreground">{ticket.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{ticket.source_channel} • {formatDateTime(ticket.created_at)}</p>
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No helpdesk tickets linked yet.</p>}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none hover:shadow-none">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5" /> Submitted forms</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {detailQuery.data.inquiries.length ? detailQuery.data.inquiries.map((inquiry) => (
                          <div key={inquiry.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium text-foreground">{inquiry.inquiry_type}</p>
                            <p className="text-muted-foreground line-clamp-3">{inquiry.message || "No message"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(inquiry.created_at)} • {inquiry.page_slug || "website"}</p>
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No public form submissions found.</p>}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none hover:shadow-none">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><ExternalLink className="h-5 w-5" /> Quote requests</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {detailQuery.data.quotes.length ? detailQuery.data.quotes.map((quote) => (
                          <div key={quote.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium text-foreground">{quote.quote_number}</p>
                            <p className="text-muted-foreground">{formatMoney(quote.grand_total)} • {quote.status}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(quote.created_at)}</p>
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No quote requests found.</p>}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contactEditor ? (
        <ContactsPage
          embeddedContactId={contactEditor.contactId}
          embeddedInitialTab={contactEditor.initialTab}
          embeddedPortalSettings={portalSettings}
          onEmbeddedClose={() => {
            setContactEditor(null);
            clearSelectedAccount();
          }}
        />
      ) : null}

      <Dialog open={provisioningMode !== null} onOpenChange={(open) => !open && setProvisioningMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {provisioningMode === "create" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {provisioningMode === "create" ? "Create customer login" : "Invite customer"}
            </DialogTitle>
            <DialogDescription>
              This account will be linked to the selected approved ERP customer. {provisioningMode === "invite" ? "The existing invitation email template will let them set their own password." : "Share the password with the customer through your approved channel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Customer name</Label><Input value={provisioningName} onChange={(event) => setProvisioningName(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={provisioningEmail} onChange={(event) => setProvisioningEmail(event.target.value)} /></div>
            {provisioningMode === "create" ? <div className="space-y-1.5"><Label>Temporary password</Label><Input type="password" value={provisioningPassword} onChange={(event) => setProvisioningPassword(event.target.value)} placeholder="At least 12 characters" /></div> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisioningMode(null)}>Cancel</Button>
            <Button
              onClick={provisionAccount}
              disabled={
                !provisioningEmail.includes("@") ||
                (provisioningMode === "create" && provisioningPassword.length < 12) ||
                inviteUser.isPending ||
                createUser.isPending
              }
            >
              {provisioningMode === "create" ? (createUser.isPending ? "Creating…" : "Create login") : (inviteUser.isPending ? "Sending…" : "Send invite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsitePortalsPage;
