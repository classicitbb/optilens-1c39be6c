import { useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  CalendarPlus,
  DollarSign,
  Eye,
  FileEdit,
  Globe,
  History,
  LifeBuoy,
  Megaphone,
  Package,
  Search,
  Settings,
  Target,
  Ticket,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsiteAnalyticsOverview } from "@/features/admin/dashboard/hooks/useWebsiteAnalyticsOverview";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import { useRecentModules } from "@/features/admin/core/hooks/useRecentModules";
import { ADMIN_APPS, type AppKey } from "@/features/admin/core/config/apps";
import { appColor } from "@/features/admin/core/config/appColors";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";
import { capitalizeDisplayName, resolveUserFullName } from "@/lib/profileData";

const appTiles = [
  {
    title: "Pricing",
    description: "Product pricing, lens catalogs, imports, and costing.",
    route: "/admin/pricing/catalog",
    icon: DollarSign,
    featurePrefix: "pricing",
    appKey: "pricing" as AppKey,
  },
  {
    title: "Contacts",
    description: "Customer records, tags, and industry segmentation.",
    route: "/admin/contacts",
    icon: Users,
    featurePrefix: "contacts",
    appKey: "contacts" as AppKey,
  },
  {
    title: "Leads",
    description: "Find prospects, run campaigns, and monitor lead quality.",
    route: "/admin/leads",
    icon: Megaphone,
    featurePrefix: "leads",
    appKey: "leads" as AppKey,
  },
  {
    title: "CRM",
    description: "Opportunities, proposals, pipeline, and sales activities.",
    route: "/admin/crm/dashboard",
    icon: Target,
    featurePrefix: "crm",
    appKey: "crm" as AppKey,
  },
  {
    title: "Helpdesk",
    description: "Support requests, SLAs, and customer operations.",
    route: "/admin/helpdesk/overview",
    icon: LifeBuoy,
    featurePrefix: "helpdesk",
    appKey: "helpdesk" as AppKey,
  },
  {
    title: "Website",
    description: "Site content, storefront products, quotations, and orders.",
    route: "/admin/website/portals",
    icon: Globe,
    featurePrefix: "website",
    appKey: "website" as AppKey,
  },
  {
    title: "Doc Studio",
    description: "Design and generate customer-facing documents.",
    route: "/admin/docs/studio",
    icon: FileEdit,
    featurePrefix: "website",
    appKey: "docstudio" as AppKey,
  },
  {
    title: "Copilot Workspace",
    description: "AI-assisted portal operations with approval controls.",
    route: "/copilot",
    icon: Bot,
    featurePrefix: "copilot",
    appKey: "copilot" as AppKey,
  },
  {
    title: "Knowledge Base",
    description: "Internal wiki, process docs, and shared references.",
    route: "/admin/knowledge/wiki",
    icon: BookOpen,
    featurePrefix: "knowledge",
    appKey: "knowledge" as AppKey,
  },
  {
    title: "Settings",
    description: "Company, users, permissions, and integrations.",
    route: "/admin/settings/company",
    icon: Settings,
    featurePrefix: "settings",
    appKey: "settings" as AppKey,
  },
  {
    title: "Function Status",
    description: "Edge-function readiness, latest smoke result, and failures.",
    route: "/admin/settings/edge-functions",
    icon: Activity,
    featurePrefix: "settings",
    appKey: null,
  },
] as const;

const QUICK_ACTIONS = [
  {
    key: "rx-order",
    title: "New Rx Order",
    description: "Start a prescription lens order.",
    icon: Eye,
    href: "/admin/website/quotations/new-rx",
    featurePrefix: "website" as const,
  },
  {
    key: "stock-order",
    title: "Stock Order",
    description: "Build a bulk stock lens order.",
    icon: Package,
    href: "/admin/website/stock-orders",
    featurePrefix: "website" as const,
  },
  {
    key: "log-activity",
    title: "Log Activity",
    description: "Add a task, call, or note to CRM.",
    icon: CalendarPlus,
    href: "?createActivity=1",
    featurePrefix: "crm" as const,
  },
  {
    key: "create-ticket",
    title: "Create Ticket",
    description: "Open a new support ticket.",
    icon: Ticket,
    href: "/admin/helpdesk/tickets?createTicket=1",
    featurePrefix: "helpdesk" as const,
    requiresEdit: true,
  },
  {
    key: "walk-in-payment",
    title: "Walk-in Payment",
    description: "Take a card payment via Scotia.",
    icon: DollarSign,
    href: "/admin/settings/walk-in-payments",
    featurePrefix: "integrations" as const,
    requiresEdit: true,
  },
] as const;

const MAX_INLINE_TOOLS = 4;

const openGlobalSearch = () => {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
};

const AdminDashboardHomePage = () => {
  const analyticsOverview = useWebsiteAnalyticsOverview();
  const { user } = useAuth();
  const { hasAppAccess, canEditFeature } = useRolePermissions();
  const recentPaths = useRecentModules();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const greetingText = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return {
      greeting: greetingText,
      dateLabel: now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    };
  }, []);
  const firstName = capitalizeDisplayName(resolveUserFullName(user).split(" ")[0]) || "there";

  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((action) =>
        "requiresEdit" in action && action.requiresEdit ? canEditFeature(action.featurePrefix as Feature) : hasAppAccess(action.featurePrefix),
      ),
    [canEditFeature, hasAppAccess],
  );

  const visibleAppTiles = useMemo(
    () =>
      appTiles
        .filter((tile) => hasAppAccess(tile.featurePrefix))
        .map((tile) => {
          const subItems = tile.appKey ? ADMIN_APPS[tile.appKey].sidebarItems : [];
          return { ...tile, subItems: subItems.length > 1 ? subItems : [] };
        }),
    [hasAppAccess],
  );

  const recentItems = useMemo(() => {
    return recentPaths
      .map((path) => {
        for (const app of Object.values(ADMIN_APPS)) {
          const item = app.sidebarItems.find((sidebarItem) => sidebarItem.route === path);
          if (item) return { path, label: item.label, appTitle: app.title, appKey: app.key, icon: item.icon };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 6);
  }, [recentPaths]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-1 pb-6 pt-1">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(188 65% 45% / 0.3), transparent)" }}
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{dateLabel}</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Start a task, pick up where you left off, or open any application below.
            </p>
          </div>
          <button
            type="button"
            onClick={openGlobalSearch}
            className="group inline-flex w-full items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground md:w-72"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Search modules, wiki, settings…</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl K</kbd>
          </button>
        </div>

        {recentItems.length > 0 && (
          <div className="relative mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Continue where you left off
            </p>
            <div className="flex flex-wrap gap-2">
              {recentItems.map((item) => {
                const Icon = item.icon;
                const color = appColor(item.appKey);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 py-1 pl-1.5 pr-3 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-muted"
                  >
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    {item.label}
                    <span className="text-muted-foreground/70">· {item.appTitle}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {quickActions.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const cardClassName =
                "group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
              const cardContent = (
                <>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{action.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{action.description}</span>
                  </span>
                </>
              );

              return action.key === "create-ticket" ? (
                <button key={action.key} type="button" onClick={() => setCreateTicketOpen(true)} className={cardClassName}>
                  {cardContent}
                </button>
              ) : (
                <Link key={action.key} to={action.href} className={cardClassName}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <CreateHelpdeskTicketDialog open={createTicketOpen} onOpenChange={setCreateTicketOpen} />

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Applications</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAppTiles.map((tile) => {
            const Icon = tile.icon;
            const color = appColor(tile.appKey ?? "settings");
            const inlineTools = tile.subItems.slice(0, MAX_INLINE_TOOLS);
            const remaining = tile.subItems.length - inlineTools.length;

            return (
              <article
                key={tile.title}
                style={{ "--app-accent": color } as CSSProperties}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:shadow-md"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ background: color }} />
                <Link to={tile.route} className="flex items-start gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold leading-tight">{tile.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{tile.description}</span>
                  </span>
                </Link>

                {inlineTools.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-3">
                    {inlineTools.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.route}
                          to={item.route}
                          className="inline-flex items-center gap-1 rounded-md border border-transparent bg-muted/60 px-2 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-border hover:bg-muted"
                        >
                          <ItemIcon className="h-3 w-3 text-muted-foreground" />
                          {item.label}
                        </Link>
                      );
                    })}
                    {remaining > 0 && (
                      <Link
                        to={tile.route}
                        className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        +{remaining} more
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <Accordion type="single" collapsible className="w-full rounded-xl border border-border/70 bg-card px-4">
          <AccordionItem value="website-analytics" className="border-none">
            <AccordionTrigger className="py-4 text-left hover:no-underline">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-base font-semibold tracking-tight">Website Analytics</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {analyticsOverview.isLoading ? (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="border-border/70">
                      <CardHeader className="space-y-2 p-4 pb-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-24" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <Skeleton className="h-3 w-28" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : analyticsOverview.error ? (
                <Card className="border-border/70">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive">{analyticsOverview.error.message}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
                  {analyticsOverview.data?.metrics.map((metric) => (
                    <Card key={metric.label} className="border-border/70">
                      <CardHeader className="space-y-1 p-4 pb-1.5">
                        <CardDescription className="text-xs">{metric.label}</CardDescription>
                        <CardTitle className="text-2xl leading-none">{metric.value}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{metric.trend}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
};

export default AdminDashboardHomePage;
