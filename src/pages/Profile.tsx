import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  Headphones,
  LifeBuoy,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { fetchCustomerCommandCenter } from "@/features/portal/customerCommandCenter";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const ACTIVE_STATUSES = new Set(["draft", "pending", "pending_payment", "confirmed", "processing", "shipped"]);

const money = (value: unknown) => Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available";

const Profile = () => {
  const { user } = useAuth();
  const { identity, isLoading: identityLoading, canAccessFeature } = usePortalIdentity();
  const { openAssistant } = useCompanionAssistant();
  const commandCenterQuery = useQuery({
    queryKey: ["customer-command-center", user?.id],
    enabled: Boolean(user),
    queryFn: fetchCustomerCommandCenter,
  });
  const data = commandCenterQuery.data;
  const canViewStatements = canAccessFeature("statements");
  const canViewPricelists = canAccessFeature("pricelists");

  const activeOrders = useMemo(() => (data?.orders ?? []).filter((order) => ACTIVE_STATUSES.has(order.status)), [data?.orders]);
  const recentOrders = useMemo(() => (data?.orders ?? []).filter((order) => !ACTIVE_STATUSES.has(order.status)).slice(0, 4), [data?.orders]);
  const openTickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => !ticket.closedAt), [data?.tickets]);
  const currentBalance = Number(data?.balance?.current_balance ?? data?.latestStatement?.closing_balance ?? 0);
  const displayName = data?.profile?.customerName || data?.profile?.organizationName || user?.email?.split("@")[0] || "Customer";
  const accessStatus = identity?.portalAccessStatus ?? data?.profile?.accessStatus ?? "pending_profile";
  const needsAttention = [
    accessStatus !== "approved_customer" ? "Complete account setup or wait for customer approval." : null,
    activeOrders.length ? `${activeOrders.length} website order${activeOrders.length === 1 ? "" : "s"} still in progress.` : null,
    openTickets.length ? `${openTickets.length} open support request${openTickets.length === 1 ? "" : "s"}.` : null,
    canViewStatements && currentBalance > 0 ? `Account balance: BBD $${money(currentBalance)}.` : null,
  ].filter(Boolean) as string[];

  if (commandCenterQuery.isLoading || identityLoading) {
    return <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b1e35,#125a69)] p-6 text-white shadow-medium sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#efb53a]">Customer command centre</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, {displayName}</h1><p className="mt-3 max-w-2xl text-white/70">Your website orders, Rx drafts, pricing, statements and support are brought together here.</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild className="bg-[#efb53a] text-[#0b1e35] hover:bg-[#f5c55b]"><Link to="/lens-assistant?mode=order&audience=professional"><ClipboardCheck className="mr-2 h-4 w-4" />Start an Rx order</Link></Button><Button variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white" onClick={() => openAssistant({ query: "Show me what needs attention in my account.", autoSubmit: true, profile: "portal_support" })}><Sparkles className="mr-2 h-4 w-4" />Ask Classic</Button></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account overview">
        <SummaryCard icon={AlertCircle} label="Needs attention" value={String(needsAttention.length)} detail={needsAttention[0] || "Nothing urgent"} tone="amber" />
        <SummaryCard icon={PackageCheck} label="Active website orders" value={String(activeOrders.length)} detail="LabLink jobs remain in LabLink tracking" tone="teal" />
        <SummaryCard icon={FileText} label="Saved drafts" value={String(data?.drafts.length ?? 0)} detail="Cart and controlled Rx drafts" />
        {canViewStatements ? <SummaryCard icon={CircleDollarSign} label="Current balance" value={`$${money(currentBalance)}`} detail="BBD · from the latest available account data" /> : null}
      </section>

      {accessStatus !== "approved_customer" ? (
        <Card className="border-amber-300 bg-amber-50/60"><CardHeader className="sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Complete your customer access</CardTitle><CardDescription>{identity?.portalAccessNote || data?.profile?.accessNote || "Finish your profile to continue the approval process."}</CardDescription></div><Button asChild variant="outline"><Link to="/profile/account">Open account setup</Link></Button></CardHeader></Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40"><CardHeader className="flex-row items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-700" /><div><CardTitle className="text-lg">Approved customer access</CardTitle><CardDescription>Customer-only pricing, statements, quotes and support workflows are available.</CardDescription></div></CardHeader></Card>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Orders in progress</CardTitle><CardDescription>Website orders only. LabLink remains the source of truth for Rx job tracking.</CardDescription></div><Button asChild variant="ghost" size="sm"><Link to="/profile/orders">All orders<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent className="space-y-3">
          {activeOrders.length ? activeOrders.slice(0, 5).map((order) => <div key={order.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Website order #{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-muted-foreground">Placed {date(order.createdAt)} · Expected completion is not supplied by this source</p></div><div className="flex items-center gap-3"><Badge variant="outline" className="capitalize">{order.status.replace(/_/g, " ")}</Badge><strong>${money(order.totalAmount)}</strong></div></div>) : <EmptyState title="No website orders in progress" detail="For LabLink Rx jobs, use the tracking action below." />}
          <Button asChild variant="outline" className="w-full"><Link to="/rx-job-status">Open LabLink job tracking <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </CardContent></Card>

        {canViewPricelists || canViewStatements ? (
          <Card><CardHeader><CardTitle>Account & pricing</CardTitle><CardDescription>Customer-scoped information only.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm">
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Saved work</CardTitle><CardDescription>Resume or repeat without starting over.</CardDescription></div><Button asChild variant="ghost" size="sm"><Link to="/profile/drafts">All drafts<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent className="space-y-3">{(data?.drafts ?? []).slice(0, 5).map((draft) => <Link key={`${draft.kind}-${draft.id}`} to={draft.kind === "rx" ? `/profile/rx-drafts/${draft.id}` : "/profile/drafts"} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"><span><span className="font-medium">{draft.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{draft.kind === "rx" ? "Rx draft · not submitted" : "Saved cart"} · {date(draft.updatedAt)}</span></span><RefreshCw className="h-4 w-4 text-muted-foreground" /></Link>)}{!(data?.drafts.length) ? <EmptyState title="No saved work yet" detail="The lens assistant can create your first controlled Rx draft." /> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Messages & support</CardTitle><CardDescription>Latest account notices and support requests.</CardDescription></CardHeader><CardContent className="space-y-3">{openTickets.slice(0, 4).map((ticket) => <Link key={ticket.id} to={`/profile/helpdesk/${ticket.id}`} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"><span><span className="font-medium">{ticket.ticketNumber} · {ticket.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">Open · {date(ticket.createdAt)}</span></span><ArrowRight className="h-4 w-4" /></Link>)}{!openTickets.length ? <EmptyState title="No open support requests" detail="Ask Classic or open a ticket when you need the team." /> : null}<Button variant="outline" className="w-full" onClick={() => openAssistant({ query: "Prepare a technical support request for my account.", autoSubmit: true, profile: "portal_support" })}><Headphones className="mr-2 h-4 w-4" />Get technical help</Button></CardContent></Card>
      </section>

      {recentOrders.length ? <Card><CardHeader><CardTitle>Recently completed</CardTitle><CardDescription>Recent website orders available for reference.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{recentOrders.map((order) => <div key={order.id} className="rounded-lg border p-4"><div className="flex items-center justify-between"><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><Badge variant="secondary" className="capitalize">{order.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{date(order.updatedAt || order.createdAt)}</p></div>)}</CardContent></Card> : null}

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Website data refreshed {date(data?.sources.websiteAsOf)}. Innovations account data {data?.sources.innovationsAsOf ? `last synchronized ${date(data.sources.innovationsAsOf)}` : "does not currently include live Rx job status"}.</p>
      {commandCenterQuery.isError ? <p className="text-sm text-destructive">Some command-centre information could not be loaded. The detailed account sections remain available.</p> : null}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, detail, tone = "default" }: { icon: typeof AlertCircle; label: string; value: string; detail: string; tone?: "default" | "amber" | "teal" }) => <Card className={tone === "amber" ? "border-amber-200" : tone === "teal" ? "border-cyan-200" : undefined}><CardContent className="flex items-start gap-4 p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === "amber" ? "bg-amber-100 text-amber-700" : tone === "teal" ? "bg-cyan-100 text-cyan-700" : "bg-muted text-foreground"}`}><Icon className="h-5 w-5" /></span><span><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span><strong className="mt-1 block text-2xl">{value}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></span></CardContent></Card>;

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FileText }) => <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"><Icon className="h-5 w-5 text-primary" /><span><span className="block text-xs text-muted-foreground">{label}</span><strong>{value}</strong></span></div>;
const EmptyState = ({ title, detail }: { title: string; detail: string }) => <div className="rounded-xl border border-dashed p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>;

export default Profile;
