import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CreditCard,
  ExternalLink,
  LifeBuoy,
  Mail,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  WalletCards,
} from "lucide-react";
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
import { usePricelistVersions } from "@/hooks/usePricelistVersions";
import AddressBookSection from "@/components/account/sections/AddressBookSection";
import PaymentMethodsSection from "@/components/account/sections/PaymentMethodsSection";
import { Separator } from "@/components/ui/separator";
import { ToastAction } from "@/components/ui/toast";
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

const FEATURE_KEYS = ["quotes", "helpdesk", "pricelists", "private-orders", "statements"] as const;

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
  const { users, resetPassword, isLoading: usersLoading } = useAdminUsers();
  const { data: pricelistVersions = [] } = usePricelistVersions();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // selectedUserId is read from & written to the URL (?customer=<userId>)
  const selectedUserId = searchParams.get("customer");
  const setSelectedUserId = (id: string | null) =>
    setSearchParams(id ? { customer: id } : {}, { replace: true });
  const [cutoffHours, setCutoffHours] = useState("24");
  const [profileDraft, setProfileDraft] = useState({ full_name: "", phone: "", organization_name: "" });
  const [accountNumberDraft, setAccountNumberDraft] = useState("");

  const customersQuery = useQuery({
    queryKey: ["website-portals-customers"],
    queryFn: async () => {
      const portalUsers = users.filter((entry) => !["admin", "operator", "viewer"].includes(entry.role ?? ""));
      const portalUserIds = portalUsers.map((entry) => entry.user_id);

      if (portalUserIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id,user_id,full_name,phone,organization_name,portal_access_status,portal_access_note,crm_contact_id,crm_customer_id")
        .in("user_id", portalUserIds)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const profileMap = new Map(
        ((data ?? []) as Record<string, any>[]).map((row) => [
          String(row.user_id),
          row,
        ]),
      );

      const [{ data: cartRows, error: cartError }, { data: alertRows, error: alertError }, { data: presenceRows, error: presenceError }] = await Promise.all([
        (supabase as any)
          .from("cart_items")
          .select("user_id,quantity")
          .in("user_id", portalUserIds),
        (supabase as any)
          .from("abandoned_cart_alerts")
          .select("user_id,status")
          .in("user_id", portalUserIds)
          .eq("status", "open"),
        (supabase as any)
          .from("user_presence")
          .select("user_id,status,last_heartbeat_at")
          .in("user_id", portalUserIds),
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

      return portalUsers
        .map((entry) => {
          const profile = profileMap.get(entry.user_id);
          const cartItemCount = cartCountByUser[entry.user_id] ?? 0;
          return {
            userId: entry.user_id,
            profileId: profile?.id ? String(profile.id) : `pending:${entry.user_id}`,
            email: entry.email ?? "",
            fullName: String(profile?.full_name ?? entry.display_name ?? ""),
            phone: String(profile?.phone ?? ""),
            organizationName: String(profile?.organization_name ?? ""),
            portalAccessStatus: String(profile?.portal_access_status ?? "pending_profile"),
            portalAccessNote: String(profile?.portal_access_note ?? "Profile not completed yet."),
            crmContactId: typeof profile?.crm_contact_id === "string" ? profile.crm_contact_id : null,
            crmCustomerId: typeof profile?.crm_customer_id === "number" ? profile.crm_customer_id : null,
            assignedPricelistId: null,
            cartItemCount,
            cartStatus: openAlertByUser.has(entry.user_id) ? "abandoned" : cartItemCount > 0 ? "in_progress" : "empty",
            presenceStatus: presenceByUser.get(entry.user_id)?.status ?? "offline",
          } satisfies PortalCustomerListItem;
        })
        .sort((a, b) => (b.fullName || b.email).localeCompare(a.fullName || a.email));
    },
    enabled: !usersLoading,
  });

  const customers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customersQuery.data ?? []).filter((customer) => {
      if (!q) return true;
      return [customer.fullName, customer.email, customer.organizationName, customer.phone]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [customersQuery.data, search]);

  useEffect(() => {
    if (customersQuery.isLoading) return;
    if (!selectedUserId && customers[0]) {
      setSelectedUserId(customers[0].userId);
      return;
    }
    if (selectedUserId && customers.length > 0 && !customers.some((customer) => customer.userId === selectedUserId)) {
      setSelectedUserId(customers[0]?.userId ?? null);
    }
  }, [customers, selectedUserId, customersQuery.isLoading]);

  const selectedCustomer = customers.find((customer) => customer.userId === selectedUserId) ?? null;

  const detailQuery = useQuery({
    queryKey: ["website-portals-customer-detail", selectedCustomer?.userId],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      if (!selectedCustomer) return null;

      await (supabase.rpc as any)("sync_customer_portal_identity", {
        p_user_id: selectedCustomer.userId,
      });

      const [{ data: featureRows, error: featureError }, { data: cartRows, error: cartError }, { data: alerts, error: alertsError }, { data: inquiries, error: inquiriesError }, { data: quotes, error: quotesError }, { data: tickets, error: ticketsError }, { data: customerRow, error: customerError }] = await Promise.all([
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
      ]);

      if (featureError) throw featureError;
      if (cartError) throw cartError;
      if (alertsError) throw alertsError;
      if (inquiriesError) throw inquiriesError;
      if (quotesError) throw quotesError;
      if (ticketsError) throw ticketsError;
      if (customerError) throw customerError;

      const featureOverrides = ((featureRows ?? []) as Array<{ feature_key: string; enabled: boolean }>).reduce<Record<string, boolean>>(
        (accumulator, row) => ({ ...accumulator, [row.feature_key]: row.enabled }),
        {},
      );

      return {
        ...selectedCustomer,
        featureOverrides,
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
          <ToastAction altText="Open ERP account" onClick={() => navigate(`/admin/erp/contacts?erpCustomer=${error.result.conflict_customer_id}`)}>
            Open contacts
          </ToastAction>
        ) : undefined,
      });
    },
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
      await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: selectedCustomer.userId });
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["website-portals-customers"] });
      toast({ title: "Profile updated", description: "Customer profile details were saved and resynced." });
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

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden shadow-none hover:shadow-none">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Customers</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="pl-9" />
            </div>
            <CardDescription>{customers.length} customer portal profile(s)</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {customers.map((customer) => (
              <button
                key={customer.userId}
                type="button"
                onClick={() => setSelectedUserId(customer.userId)}
                aria-pressed={selectedUserId === customer.userId}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selectedUserId === customer.userId ? "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent)/0.08)]" : "border-border hover:border-[hsl(var(--admin-accent)/0.35)]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{customer.fullName || customer.email || "Customer"}</p>
                    <p className="text-xs text-muted-foreground">{customer.email || "No email on file"}</p>
                    {customer.organizationName ? <p className="mt-1 text-xs text-muted-foreground">{customer.organizationName}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cart: {getCartStatusLabel(customer.cartStatus)} ({customer.cartItemCount} item{customer.cartItemCount === 1 ? "" : "s"})
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">{customer.portalAccessStatus.replace(/_/g, " ")}</Badge>
                    <Badge variant={customer.presenceStatus === "online" ? "default" : "secondary"}>{customer.presenceStatus}</Badge>
                    {customer.cartStatus === "abandoned" ? <Badge variant="destructive">Abandoned</Badge> : null}
                    {customer.cartStatus === "in_progress" ? <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">In progress</Badge> : null}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          {!selectedCustomer || !detailQuery.data ? (
            <Card className="shadow-none hover:shadow-none">
              <CardContent className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                Select a customer to review their portal profile, cart, orders, pricing access, and support history.
              </CardContent>
            </Card>
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <TabsTrigger value="profile">Profile</TabsTrigger>
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
                                    <span className="block text-sm font-medium capitalize text-foreground">{feature.replace(/-/g, " ")}</span>
                                    <span className="block text-xs text-muted-foreground">Explicit override for this portal workflow.</span>
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
                        <Label>Account number</Label>
                        <Input value={detailQuery.data.accountNumber || "Not linked"} disabled readOnly />
                        <p className="text-xs text-muted-foreground">Read-only here — edit it from the Operations tab or the linked company's contact record.</p>
                      </div>
                      <Button
                        onClick={() => updateCustomerProfile.mutate(profileDraft)}
                        disabled={updateCustomerProfile.isPending || !profileDraft.full_name.trim() || !profileDraft.phone.trim() || !profileDraft.organization_name.trim()}
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
      </div>
    </div>
  );
};

export default WebsitePortalsPage;
