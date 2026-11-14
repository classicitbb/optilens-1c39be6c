import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollCraft } from "@/lib/scrollcraft/useScrollCraft";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  Headphones,
  LifeBuoy,
  MapPin,
  PackageCheck,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { fetchCustomerCommandCenter } from "@/features/portal/customerCommandCenter";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STAGES,
  buildActivity,
  buildNextActions,
  greetingForHour,
  orderStageIndex,
  type ActivityItem,
  type NextAction,
} from "@/features/portal/commandCenterInsights";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { requestLiveData } from "@/lib/liveDataGateway";
import { resolveUserFullName } from "@/lib/profileData";
import { useUserRole } from "@/hooks/useUserRole";
import { isStaffRole } from "@/features/staff-cards/staffPublicCards";

interface LiveInnovationsOrdersResponse {
  orders: unknown[];
  retrieved_at: string;
}

const money = (value: unknown) => Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available";
const relativeDate = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return days < 7 ? `${days} days ago` : date(value);
};

const Profile = () => {
  const { user } = useAuth();
  const { identity, isLoading: identityLoading, canAccessFeature, emulation, effectiveUserId } = usePortalIdentity();
  const { openAssistant } = useCompanionAssistant();
  const { role } = useUserRole();
  const activeCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : null;
  const commandCenterQuery = useQuery({
    queryKey: ["customer-command-center", user?.id, activeCustomerId],
    enabled: Boolean(user),
    queryFn: () => fetchCustomerCommandCenter(activeCustomerId),
  });
  const data = commandCenterQuery.data;
  const canViewStatements = canAccessFeature("statements");
  const canViewPricelists = canAccessFeature("pricelists");
  const canSeeLiveOrderStatus = canAccessFeature("live-order-status");
  const canUseLensAssistant = canAccessFeature("rx-order");
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

  const activeOrders = useMemo(() => (data?.orders ?? []).filter((order) => ACTIVE_ORDER_STATUSES.has(order.status)), [data?.orders]);
  const openTickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => !ticket.closedAt), [data?.tickets]);
  const activity = useMemo(
    () => buildActivity({ orders: data?.orders ?? [], drafts: data?.drafts ?? [], tickets: data?.tickets ?? [] }, 6),
    [data?.orders, data?.drafts, data?.tickets],
  );
  // Website checkout orders plus active lab work — the full account, not just this site's cart.
  const liveOrderCount = liveOrdersQuery.data?.orders.length ?? 0;
  const totalActiveOrders = activeOrders.length + liveOrderCount;
  const currentBalance = Number(data?.balance?.current_balance ?? data?.latestStatement?.closing_balance ?? 0);
  const accountName = identity?.customerName || data?.profile?.customerName || data?.profile?.organizationName || null;
  const displayName = (emulation ? null : resolveUserFullName(user)) || accountName || (emulation ? null : user?.email?.split("@")[0]) || "Customer";
  const firstName = displayName.split(/\s+/)[0];
  const accessStatus = identity?.portalAccessStatus ?? data?.profile?.accessStatus ?? "pending_profile";
  const accessApproved = accessStatus === "approved_customer";
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

  const nextActions = useMemo(
    () => buildNextActions({
      accessApproved,
      orders: data?.orders ?? [],
      liveOrderCount,
      openTicketCount: openTickets.length,
      draftCount: data?.drafts.length ?? 0,
      balance: currentBalance,
      canViewStatements,
    }),
    [accessApproved, data?.orders, data?.drafts.length, liveOrderCount, openTickets.length, currentBalance, canViewStatements],
  );
  const urgentCount = nextActions.filter((action) => action.tone === "warn").length;

  const quickActions = [
    canUseLensAssistant ? { label: "Start an Rx order", icon: ClipboardCheck, to: "/profile/rx-order" } : null,
    { label: "My orders", icon: PackageCheck, to: "/profile/orders" },
    canViewStatements ? { label: "Statements", icon: Receipt, to: "/profile/statements" } : null,
    canViewPricelists ? { label: "Pricing", icon: BadgeDollarSign, to: "/profile/pricelists" } : null,
    { label: "Address book", icon: MapPin, to: "/profile/address-book" },
    { label: "Support", icon: LifeBuoy, to: "/profile/helpdesk" },
  ].filter(Boolean) as Array<{ label: string; icon: typeof PackageCheck; to: string }>;

  const portalLoading = commandCenterQuery.isLoading || identityLoading;
  // Re-run when the loading gate lifts: the root div only exists after it.
  const scrollRef = useScrollCraft([portalLoading]);
  const isRefreshing = commandCenterQuery.isFetching || liveOrdersQuery.isFetching;
  const refresh = () => {
    void commandCenterQuery.refetch();
    if (canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number") void liveOrdersQuery.refetch();
  };

  if (portalLoading) return <ProfileSkeleton />;

  return (
    <div ref={scrollRef} className="space-y-7">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b1e35,#125a69)] p-6 text-white shadow-medium sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#efb53a]">Customer command centre</p>
              {identity?.accountNumber ? <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">Account {identity.accountNumber}</span> : null}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${accessApproved ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/20 text-amber-200"}`}>
                {accessApproved ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {accessApproved ? "Approved customer" : "Setup in progress"}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{greetingForHour(new Date().getHours())}, {firstName}</h1>
            <p className="mt-3 max-w-2xl text-white/70">
              {nextActions.length
                ? `${nextActions.length} thing${nextActions.length === 1 ? "" : "s"} to look at for ${accountName || "your account"}${urgentCount ? `, ${urgentCount} needing action` : ""}.`
                : `Everything is up to date for ${accountName || "your account"}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUseLensAssistant ? <Button asChild className="bg-[#efb53a] text-[#0b1e35] hover:bg-[#f5c55b]"><Link to="/profile/rx-order"><ClipboardCheck className="mr-2 h-4 w-4" />Start an Rx order</Link></Button> : null}
            {isStaffRole(role) ? <Button asChild variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/profile/networking-card"><QrCode className="mr-2 h-4 w-4" />Share my card</Link></Button> : null}
            <Button asChild variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/profile/helpdesk"><Sparkles className="mr-2 h-4 w-4" />Ask Classic</Link></Button>
            <Button variant="outline" size="icon" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white" onClick={refresh} disabled={isRefreshing} aria-label="Refresh account data" title="Refresh account data"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
      </section>

      <section data-sc-in data-sc-stagger="70" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account overview">
        <SummaryCard icon={PackageCheck} label="Active orders" value={String(totalActiveOrders)} detail={liveOrderCount ? `${liveOrderCount} in the lab` : undefined} tone="teal" to="/profile/orders" />
        <SummaryCard icon={FileText} label="Saved drafts" value={String(data?.drafts.length ?? 0)} detail="Cart and controlled Rx drafts" to="/profile/drafts" />
        <SummaryCard icon={LifeBuoy} label="Open support" value={String(openTickets.length)} detail={openTickets[0]?.title} to="/profile/helpdesk" />
        {canViewStatements ? <SummaryCard icon={CircleDollarSign} label="Current balance" value={`$${money(currentBalance)}`} detail="BBD · from the latest available account data" tone={currentBalance > 0 ? "amber" : "default"} to="/profile/statements" /> : null}
      </section>

      {!accessApproved ? (
        <Card className="border-amber-300 bg-amber-50/60"><CardHeader className="sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Complete your customer access</CardTitle><CardDescription>{identity?.portalAccessNote || data?.profile?.accessNote || "Finish your profile to continue the approval process."}</CardDescription></div><Button asChild variant="outline"><Link to="/profile/account">Open account setup</Link></Button></CardHeader></Card>
      ) : !isApprovedAccessNoticeDismissed ? (
        <Card className="border-emerald-200 bg-emerald-50/40"><CardHeader className="flex-row items-center gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><CardTitle className="text-lg">Approved customer access</CardTitle><CardDescription>Your account is approved and linked. Orders, pricing and statements are available from the menu.</CardDescription></div><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Dismiss approved customer access message permanently" title="Dismiss permanently" onClick={dismissApprovedAccessNotice}><X className="h-4 w-4" /></Button></CardHeader></Card>
      ) : null}

      <section data-sc-in data-sc-stagger="70" className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/20 pb-4"><CardTitle>Next up</CardTitle><CardDescription>What needs you, most urgent first.</CardDescription></CardHeader>
          <CardContent className="pt-4">
            {nextActions.length ? (
              <ul className="divide-y">{nextActions.map((action) => <NextActionRow key={action.id} action={action} />)}</ul>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" /><div><p className="font-semibold">You're all caught up</p><p className="text-sm text-muted-foreground">No open orders, requests or balances need your attention.</p></div></div>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/20 pb-4"><CardTitle>Quick actions</CardTitle><CardDescription>Jump straight to common tasks.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-4">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link key={to} to={to} className="group flex flex-col items-start gap-2 rounded-xl border p-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Icon className="h-5 w-5 text-primary" />{label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section data-sc-in data-sc-stagger="70" className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden transition-all hover:shadow-md"><CardHeader className="flex-row items-center justify-between bg-muted/20 pb-4"><div><CardTitle>Orders in progress</CardTitle><CardDescription>Website checkout orders. Lab job status is tracked on the orders page.</CardDescription></div><Button asChild variant="ghost" size="sm" className="transition-transform hover:translate-x-1"><Link to="/profile/orders">All orders<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent className="space-y-3 pt-6">
          {activeOrders.length ? activeOrders.slice(0, 5).map((order) => (
            <Link key={order.id} to="/profile/orders" className="group block space-y-4 rounded-xl border p-4 transition-colors hover:bg-muted/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold transition-colors group-hover:text-primary">Website order #{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-muted-foreground">Placed {date(order.createdAt)} · Expected completion is not supplied by this source</p></div>
                <div className="flex items-center gap-3"><Badge variant="outline" className="capitalize">{order.status.replace(/_/g, " ")}</Badge><strong>${money(order.totalAmount)}</strong></div>
              </div>
              <OrderStepper status={order.status} />
            </Link>
          )) : <EmptyState title="No website orders in progress" detail="Lab order status is available on your orders page." />}
        </CardContent></Card>

        {canViewPricelists || canViewStatements ? (
          <Card className="overflow-hidden transition-all hover:shadow-md"><CardHeader className="bg-muted/20 pb-4"><CardTitle>Account & pricing</CardTitle><CardDescription>Customer-scoped information only.</CardDescription></CardHeader><CardContent className="space-y-4 pt-6 text-sm">
            {canViewPricelists ? <InfoRow label="Assigned pricelist" value={data?.pricelist?.name || "Not assigned"} icon={BadgeDollarSign} /> : null}
            {canViewStatements ? <InfoRow label="Latest statement" value={date(String(data?.latestStatement?.period_end ?? ""))} icon={FileText} /> : null}
            <InfoRow label="Open support requests" value={String(openTickets.length)} icon={LifeBuoy} />
            <div className="grid gap-2 pt-2">
              {canViewPricelists ? <Button asChild variant="outline"><Link to="/profile/pricelists">View pricing</Link></Button> : null}
              {canViewStatements ? <Button asChild variant="outline"><Link to="/profile/statements">View statements</Link></Button> : null}
            </div>
          </CardContent></Card>
        ) : null}
      </section>

      <section data-sc-in data-sc-stagger="70" className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="flex-row items-center justify-between bg-muted/20 pb-4"><div><CardTitle>Recent activity</CardTitle><CardDescription>Orders, saved work and support in one timeline.</CardDescription></div><Button asChild variant="ghost" size="sm" className="transition-transform hover:translate-x-1"><Link to="/profile/drafts">All drafts<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader>
          <CardContent className="pt-6">
            {activity.length ? <ol className="relative space-y-1 border-l pl-5">{activity.map((item) => <ActivityRow key={item.id} item={item} />)}</ol> : <EmptyState title="No activity yet" detail="The lens assistant can create your first controlled Rx draft." />}
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all hover:shadow-md"><CardHeader className="bg-muted/20 pb-4"><CardTitle>Messages & support</CardTitle><CardDescription>Latest account notices and support requests.</CardDescription></CardHeader><CardContent className="space-y-3 pt-6">{openTickets.slice(0, 4).map((ticket) => <Link key={ticket.id} to={`/profile/helpdesk/${ticket.id}`} className="group flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"><span><span className="font-medium group-hover:text-primary transition-colors">{ticket.ticketNumber} · {ticket.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">Open · {date(ticket.createdAt)}</span></span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>)}{!openTickets.length ? <EmptyState title="No open support requests" detail="Ask Classic or open a ticket when you need the team." /> : null}<Button variant="outline" className="w-full transition-colors hover:bg-primary/10 hover:text-primary" onClick={() => openAssistant({ query: "Prepare a technical support request for my account.", autoSubmit: true, profile: "portal_support" })}><Headphones className="mr-2 h-4 w-4" />Get technical help</Button></CardContent></Card>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Website data refreshed {date(data?.sources.websiteAsOf)}. Account data {data?.sources.innovationsAsOf ? `last synchronized ${date(data.sources.innovationsAsOf)}` : "does not currently include live Rx job status"}.</p>
      {commandCenterQuery.isError ? <p className="text-sm text-destructive">Some command-centre information could not be loaded. The detailed account sections remain available.</p> : null}
    </div>
  );
};

const ProfileSkeleton = () => (
  <div className="space-y-7" role="status" aria-label="Loading your account">
    <Skeleton className="h-44 w-full rounded-2xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Skeleton className="h-64 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>
  </div>
);

const SummaryCard = ({ icon: Icon, label, value, detail, tone = "default", to }: { icon: typeof AlertCircle; label: string; value: string; detail?: string; tone?: "default" | "amber" | "teal"; to: string }) => (
  <Link to={to} aria-label={`View ${label}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    <Card className={`h-full cursor-pointer transition-all group-hover:-translate-y-0.5 group-hover:shadow-md ${tone === "amber" ? "border-amber-200" : tone === "teal" ? "border-cyan-200" : ""}`}>
      <CardContent className="flex items-start gap-4 p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === "amber" ? "bg-amber-100 text-amber-700" : tone === "teal" ? "bg-cyan-100 text-cyan-700" : "bg-muted text-foreground"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span><strong className="mt-1 block text-2xl">{value}</strong>{detail ? <span className="mt-1 block truncate text-xs leading-5 text-muted-foreground">{detail}</span> : null}</span></CardContent>
    </Card>
  </Link>
);

const NextActionRow = ({ action }: { action: NextAction }) => (
  <li>
    <Link to={action.to} className="group flex items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${action.tone === "warn" ? "bg-amber-500" : "bg-cyan-500"}`} aria-hidden />
      <span className="min-w-0 flex-1"><span className="block font-medium group-hover:text-primary">{action.label}</span><span className="block text-xs text-muted-foreground">{action.detail}</span></span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  </li>
);

const OrderStepper = ({ status }: { status: string }) => {
  const current = orderStageIndex(status);
  if (current < 0) return null;
  return (
    <ol className="flex items-center" aria-label={`Order stage: ${ORDER_STAGES[current]}, step ${current + 1} of ${ORDER_STAGES.length}`}>
      {ORDER_STAGES.map((stage, index) => {
        const reached = index <= current;
        return (
          <li key={stage} className={`flex items-center ${index < ORDER_STAGES.length - 1 ? "flex-1" : ""}`}>
            <span className="flex flex-col items-center gap-1">
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${reached ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground"} ${index === current ? "ring-4 ring-primary/15" : ""}`}>{index < current ? <Check className="h-3 w-3" /> : index + 1}</span>
              <span className={`whitespace-nowrap text-[11px] ${index === current ? "font-semibold" : "text-muted-foreground"}`}>{stage}</span>
            </span>
            {index < ORDER_STAGES.length - 1 ? <span className={`mx-2 mb-4 h-0.5 flex-1 rounded ${index < current ? "bg-primary" : "bg-border"}`} aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
};

const ACTIVITY_ICON = { order: PackageCheck, draft: FileText, ticket: LifeBuoy } as const;

const ActivityRow = ({ item }: { item: ActivityItem }) => {
  const Icon = ACTIVITY_ICON[item.kind];
  return (
    <li className="relative">
      <span className="absolute -left-[31px] top-3 grid h-5 w-5 place-items-center rounded-full border bg-background text-muted-foreground"><Icon className="h-3 w-3" /></span>
      <Link to={item.to} className="group block rounded-lg px-3 py-2 transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="block text-sm font-medium group-hover:text-primary">{item.title}</span>
        <span className="block text-xs capitalize text-muted-foreground">{item.detail} · {relativeDate(item.at)}</span>
      </Link>
    </li>
  );
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FileText }) => <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"><Icon className="h-5 w-5 text-primary" /><span><span className="block text-xs text-muted-foreground">{label}</span><strong>{value}</strong></span></div>;
const EmptyState = ({ title, detail }: { title: string; detail: string }) => <div className="rounded-xl border border-dashed p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>;

export default Profile;
