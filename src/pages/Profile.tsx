import { Link } from "react-router";
import { BookUser, BadgeDollarSign, FileSignature, LifeBuoy, LockKeyhole, Package, ShieldCheck, User, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPortalFeatureBlockedReason, type PortalFeature, usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useAuth } from "@/contexts/AuthContext";
<<<<<<< Updated upstream
import { useCustomerAddresses } from "@/hooks/useCustomerAddresses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMissingProfileRequirements } from "@/features/portal/profileCompletion";
=======
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { fetchCustomerCommandCenter } from "@/features/portal/customerCommandCenter";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";
import { requestLiveData } from "@/lib/liveDataGateway";
import { resolveUserFullName } from "@/lib/profileData";
import { useUserRole } from "@/hooks/useUserRole";
import { isStaffRole } from "@/features/staff-cards/staffPublicCards";
>>>>>>> Stashed changes

const quickSections = [
  {
    title: "My Account",
    description: "Edit profile details and security settings.",
    to: "/profile/account",
    icon: User,
  },
  {
    title: "My Orders",
    description: "View order history and statuses.",
    to: "/profile/orders",
    icon: Package,
  },
  {
    title: "Address Book",
    description: "Manage up to 2 saved checkout addresses.",
    to: "/profile/address-book",
    icon: BookUser,
  },
  {
    title: "Payment Methods",
    description: "Store tokenized demo cards for one-click ordering.",
    to: "/profile/payment-methods",
    icon: WalletCards,
  },
  {
    title: "Quotes",
    description: "Create and track quote requests.",
    to: "/profile/quotes",
    icon: FileSignature,
  },
  {
    title: "Helpdesk",
    description: "Follow your support tickets.",
    to: "/profile/helpdesk",
    icon: LifeBuoy,
  },
  {
    title: "Pricelists",
    description: "See account-assigned pricelists.",
    to: "/profile/pricelists",
    icon: BadgeDollarSign,
  },
];

const gatedSections = new Map<string, PortalFeature>([
  ["/profile/quotes", "quotes"],
  ["/profile/helpdesk", "helpdesk"],
  ["/profile/pricelists", "pricelists"],
]);

const Profile = () => {
  const { identity, canAccessFeature, isStaff } = usePortalIdentity();
  const { user } = useAuth();
  const { addresses } = useCustomerAddresses();
  const { data: profile } = useQuery({
    queryKey: ["profile-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("full_name,phone,organization_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name?: string | null; phone?: string | null; organization_name?: string | null } | null;
    },
  });
<<<<<<< Updated upstream
  const quoteReason = getPortalFeatureBlockedReason(identity, "quotes");
  const missingRequirements = getMissingProfileRequirements(
    {
      fullName: profile?.full_name,
      phone: profile?.phone,
      organizationName: profile?.organization_name,
      hasShippingAddress: addresses.length > 0,
    },
    identity,
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Customer Account</h2>
        <p className="text-sm text-muted-foreground">Choose a section to manage your account.</p>
      </header>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Portal access status</CardTitle>
            <CardDescription>
              {isStaff
                ? "You have full portal access as a staff member."
                : identity?.portalAccessNote || quoteReason.description}
            </CardDescription>
          </div>
          {isStaff ? (
            <Badge variant="outline" className="w-fit gap-1.5 border-primary/40 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" />
              {identity?.portalAccessStatus?.replace(/_/g, " ") || "pending profile"}
            </Badge>
          )}
        </CardHeader>
      </Card>
      {!isStaff && missingRequirements.length ? (
        <Card className="border-amber-300/60 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base">Complete your profile</CardTitle>
            <CardDescription>Finish these items to unlock full portal access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingRequirements.map((item) => (
              <Button key={item.key} asChild variant="outline" className="w-full justify-start">
                <Link to={`${item.route}?focus=${item.focus}`}>Add {item.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
=======
  const data = commandCenterQuery.data;
  const canViewStatements = canAccessFeature("statements");
  const canViewPricelists = canAccessFeature("pricelists");
  const canSeeLiveOrderStatus = canAccessFeature("live-order-status");
  const canUseLensAssistant = (isAdmin ? adminLensAssistant.enabled : publicLensAssistant.enabled)
    && canAccessFeature("lens-assistant");
  // Under admin emulation the gateway must fetch the emulated customer's data, not the admin's.
  const websiteCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : undefined;
  const localFallbackTarget = { accountNumber: identity?.accountNumber ?? null, ordersUseBillToAccount: identity?.ordersUseBillToAccount ?? false };
  const liveOrdersQuery = useQuery({
    queryKey: ["live-innovations-customer-orders", identity?.crmCustomerId],
    enabled: canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveInnovationsOrdersResponse>("innovations.customer_orders", {}, { signal, websiteCustomerId, localFallbackTarget }),
    staleTime: 30_000,
    retry: 1,
  });

  const activeOrders = useMemo(() => (data?.orders ?? []).filter((order) => ACTIVE_STATUSES.has(order.status)), [data?.orders]);
  const recentOrders = useMemo(() => (data?.orders ?? []).filter((order) => !ACTIVE_STATUSES.has(order.status)).slice(0, 4), [data?.orders]);
  const openTickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => !ticket.closedAt), [data?.tickets]);
  // Website checkout orders plus active lab work — the full account, not just this site's cart.
  const totalActiveOrders = activeOrders.length + (liveOrdersQuery.data?.orders.length ?? 0);
  const currentBalance = Number(data?.balance?.current_balance ?? data?.latestStatement?.closing_balance ?? 0);
  const accountName = identity?.customerName || data?.profile?.customerName || data?.profile?.organizationName || null;
  const displayName = resolveUserFullName(user) || accountName || user?.email?.split("@")[0] || "Customer";
  const accessStatus = identity?.portalAccessStatus ?? data?.profile?.accessStatus ?? "pending_profile";
  const approvedAccessNoticeStorageKey = `cv.portal.approved-access-notice.dismissed:${effectiveUserId ?? user?.id ?? "anonymous"}`;
  const [isApprovedAccessNoticeDismissed, setIsApprovedAccessNoticeDismissed] = useState(false);

  useEffect(() => {
    try {
      setIsApprovedAccessNoticeDismissed(window.localStorage.getItem(approvedAccessNoticeStorageKey) === "true");
    } catch {
      setIsApprovedAccessNoticeDismissed(false);
    }
  }, [approvedAccessNoticeStorageKey]);

  const dismissApprovedAccessNotice = () => {
    try {
      window.localStorage.setItem(approvedAccessNoticeStorageKey, "true");
    } catch {
      // The notice should still disappear if storage is unavailable.
    }
    setIsApprovedAccessNoticeDismissed(true);
  };
  const needsAttention = [
    accessStatus !== "approved_customer" ? "Complete account setup or wait for customer approval." : null,
    totalActiveOrders ? `${totalActiveOrders} order${totalActiveOrders === 1 ? "" : "s"} still in progress.` : null,
    openTickets.length ? `${openTickets.length} open support request${openTickets.length === 1 ? "" : "s"}.` : null,
    canViewStatements && currentBalance > 0 ? `Account balance: BBD $${money(currentBalance)}.` : null,
  ].filter(Boolean) as string[];
  const needsAttentionRoute = accessStatus !== "approved_customer"
    ? "/profile/account"
    : totalActiveOrders
      ? "/profile/orders"
      : openTickets.length
        ? "/profile/helpdesk"
        : canViewStatements && currentBalance > 0
          ? "/profile/statements"
          : "/profile/account";

  if (commandCenterQuery.isLoading || identityLoading) {
    return <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b1e35,#125a69)] p-6 text-white shadow-medium sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#efb53a]">Customer command centre</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, {displayName}</h1><p className="mt-3 max-w-2xl text-white/70">Website orders, Rx drafts, pricing, statements and support for {accountName || "your account"}.</p></div>
          <div className="flex flex-wrap gap-2">{canUseLensAssistant ? <Button asChild className="bg-[#efb53a] text-[#0b1e35] hover:bg-[#f5c55b]"><Link to="/profile/rx-order"><ClipboardCheck className="mr-2 h-4 w-4" />Start an Rx order</Link></Button> : null}{isStaffRole(role) ? <Button asChild variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/profile/networking-card"><QrCode className="mr-2 h-4 w-4" />Share my card</Link></Button> : null}<Button asChild variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/profile/helpdesk"><Sparkles className="mr-2 h-4 w-4" />Ask Classic</Link></Button></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account overview">
        <SummaryCard icon={AlertCircle} label="Needs attention" value={String(needsAttention.length)} detail={needsAttention[0] || "Nothing urgent"} tone="amber" to={needsAttentionRoute} />
        <SummaryCard icon={PackageCheck} label="Active orders" value={String(totalActiveOrders)} tone="teal" to="/profile/orders" />
        {data?.drafts.length ? <SummaryCard icon={FileText} label="Saved drafts" value={String(data.drafts.length)} detail="Cart and controlled Rx drafts" to="/profile/drafts" /> : null}
        {canViewStatements ? <SummaryCard icon={CircleDollarSign} label="Current balance" value={`$${money(currentBalance)}`} detail="BBD · from the latest available account data" to="/profile/statements" /> : null}
      </section>

      {accessStatus !== "approved_customer" ? (
        <Card className="border-amber-300 bg-amber-50/60"><CardHeader className="sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Complete your customer access</CardTitle><CardDescription>{identity?.portalAccessNote || data?.profile?.accessNote || "Finish your profile to continue the approval process."}</CardDescription></div><Button asChild variant="outline"><Link to="/profile/account">Open account setup</Link></Button></CardHeader></Card>
      ) : !isApprovedAccessNoticeDismissed ? (
        <Card className="border-emerald-200 bg-emerald-50/40"><CardHeader className="flex-row items-center gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><CardTitle className="text-lg">Approved customer access</CardTitle><CardDescription>{"\n"}</CardDescription></div><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Dismiss approved customer access message permanently" title="Dismiss permanently" onClick={dismissApprovedAccessNotice}><X className="h-4 w-4" /></Button></CardHeader></Card>
>>>>>>> Stashed changes
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickSections.map(({ title, description, to, icon: Icon }) => {
          const gatedFeature = gatedSections.get(to);
          const locked = gatedFeature ? !canAccessFeature(gatedFeature) : false;

          return (
            <Card key={to} className={locked ? "border-dashed" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {title}
                </CardTitle>
                <CardDescription>{locked ? `${description} Available after customer approval.` : description}</CardDescription>
              </CardHeader>
              <CardContent>
                {locked ? (
                  <div className="space-y-3">
                    <Badge variant="secondary" className="gap-1.5">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Customer-only
                    </Badge>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/profile/account">Complete setup</Link>
                    </Button>
                  </div>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={to}>Open section</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default Profile;
