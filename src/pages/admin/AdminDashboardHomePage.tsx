import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarPlus,
  DollarSign,
  Eye,
  Globe,
  History,
  LifeBuoy,
  Maximize2,
  Megaphone,
  Package,
  Target,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsiteAnalyticsOverview } from "@/features/admin/dashboard/hooks/useWebsiteAnalyticsOverview";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import { useRecentModules } from "@/features/admin/core/hooks/useRecentModules";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADMIN_APPS, type AppKey } from "@/features/admin/core/config/apps";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";
import { capitalizeDisplayName, resolveUserFullName } from "@/lib/profileData";
import { cn } from "@/lib/utils";

const appTiles = [
  {
    title: "Pricing",
    description: "Configure product pricing, lens catalogs, imports, and costing workflows.",
    route: "/admin/pricing/catalog",
    icon: DollarSign,
    featurePrefix: "pricing",
    appKey: "pricing" as AppKey,
  },
  {
    title: "Contacts",
    description: "Maintain customer records, tags, and industry segmentation data.",
    route: "/admin/contacts",
    icon: Users,
    featurePrefix: "contacts",
    appKey: "contacts" as AppKey,
  },
  {
    title: "Leads",
    description: "Find prospects, run campaigns, and monitor lead quality with AI-assisted tools.",
    route: "/admin/leads",
    icon: Megaphone,
    featurePrefix: "leads",
    appKey: "leads" as AppKey,
  },
  {
    title: "CRM",
    description: "Track opportunities, proposals, pipeline performance, and scheduled sales activities.",
    route: "/admin/crm/dashboard",
    icon: Target,
    featurePrefix: "crm",
    appKey: "crm" as AppKey,
  },
  {
    title: "Helpdesk",
    description: "Resolve support requests, manage SLAs, and keep customer operations smooth.",
    route: "/admin/helpdesk/overview",
    icon: LifeBuoy,
    featurePrefix: "helpdesk",
    appKey: "helpdesk" as AppKey,
  },
  {
    title: "Website",
    description: "Update website content and manage storefront products, quotations, and orders.",
    route: "/admin/website/portals",
    icon: Globe,
    featurePrefix: "website",
    appKey: "website" as AppKey,
  },
  {
    title: "Knowledge Base",
    description: "Browse and maintain internal wiki articles, process docs, and shared references.",
    route: "/admin/knowledge/wiki",
    icon: BookOpen,
    featurePrefix: "knowledge",
    appKey: "knowledge" as AppKey,
  },
  {
    title: "Function Status",
    description: "Review live edge-function readiness, the latest smoke result, and any active failures.",
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
    description: "Start a prescription lens order for a customer.",
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
    description: "Take an exact card payment through Scotia’s hosted page.",
    icon: DollarSign,
    href: "/admin/settings/walk-in-payments",
    featurePrefix: "integrations" as const,
    requiresEdit: true,
  },
] as const;

const AdminDashboardHomePage = () => {
  const analyticsOverview = useWebsiteAnalyticsOverview();
  const { user } = useAuth();
  const { hasAppAccess, canEditFeature } = useRolePermissions();
  const recentPaths = useRecentModules();
  const isMobile = useIsMobile();
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [expandedTile, setExpandedTile] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const openTile = (title: string) => {
    setExpandedTile(title);
    setExpanded(true);
  };
  const cancelPendingOpen = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };
  const closeTile = () => {
    cancelPendingOpen();
    setExpanded(false);
  };
  const scheduleOpenOnHover = (title: string) => {
    if (isMobile) return;
    cancelPendingOpen();
    hoverTimeoutRef.current = window.setTimeout(() => openTile(title), 700);
  };

  useEffect(() => () => cancelPendingOpen(), []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
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

  const activeTile = visibleAppTiles.find((tile) => tile.title === expandedTile) ?? null;

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTile();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded]);

  useEffect(() => {
    if (!isMobile || !expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (gridRef.current && !gridRef.current.contains(event.target as Node)) closeTile();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobile, expanded]);

  const recentItems = useMemo(() => {
    return recentPaths
      .map((path) => {
        for (const app of Object.values(ADMIN_APPS)) {
          const item = app.sidebarItems.find((sidebarItem) => sidebarItem.route === path);
          if (item) return { path, label: item.label, appTitle: app.title, icon: item.icon };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 6);
  }, [recentPaths]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-1 pb-4 pt-1 md:space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-primary/15 via-background to-slate-500/10 p-5 shadow-sm md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{greeting}</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">{firstName}, welcome back</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Jump straight into a task below, pick up where you left off, or browse all applications.
        </p>
      </section>

      {quickActions.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const cardClassName = "group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md";
              const cardContent = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-[18px] w-[18px] text-primary" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{action.description}</p>
                  </div>
                </>
              );

              return action.key === "create-ticket" ? (
                <button key={action.key} type="button" onClick={() => setCreateTicketOpen(true)} className={cardClassName}>
                  {cardContent}
                </button>
              ) : (
                <Link
                  key={action.key}
                  to={action.href}
                  className={cardClassName}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <CreateHelpdeskTicketDialog open={createTicketOpen} onOpenChange={setCreateTicketOpen} />

      {recentItems.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Continue where you left off
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {item.label}
                  <span className="text-muted-foreground/70">· {item.appTitle}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Applications</h2>
        <div
          ref={gridRef}
          className="relative"
          onMouseLeave={() => !isMobile && closeTile()}
          onBlur={(event) => {
            if (!gridRef.current?.contains(event.relatedTarget as Node)) closeTile();
          }}
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleAppTiles.map((tile) => {
              const Icon = tile.icon;
              const isExpandable = tile.subItems.length > 0;

              if (!isExpandable) {
                return (
                  <Link
                    key={tile.title}
                    to={tile.route}
                    className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-2 text-lg font-semibold">{tile.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tile.description}</p>
                  </Link>
                );
              }

              const isActive = expandedTile === tile.title;
              return (
                <div
                  key={tile.title}
                  role="button"
                  tabIndex={0}
                  aria-haspopup="true"
                  aria-expanded={isActive && expanded}
                  onMouseEnter={() => scheduleOpenOnHover(tile.title)}
                  onMouseLeave={cancelPendingOpen}
                  onFocus={() => openTile(tile.title)}
                  onClick={() => {
                    if (!isMobile) return;
                    isActive && expanded ? closeTile() : openTile(tile.title);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openTile(tile.title);
                    }
                  }}
                  className={cn(
                    "group flex h-full cursor-pointer flex-col rounded-xl border border-border/70 bg-card p-4 outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30",
                    isActive && expanded && "opacity-0",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-2 text-lg font-semibold">{tile.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tile.description}</p>
                  <p className="mt-auto flex items-center gap-1 pt-2 text-[11px] font-medium text-primary/80">
                    <Maximize2 className="h-3 w-3" />
                    {isMobile ? `Tap for ${tile.subItems.length} tools` : `Hover for ${tile.subItems.length} tools`}
                  </p>
                </div>
              );
            })}
          </div>

          {activeTile && (
            <div
              onMouseEnter={() => setExpanded(true)}
              onMouseLeave={() => !isMobile && closeTile()}
              className={cn(
                "absolute inset-0 z-30 flex flex-col rounded-xl border border-primary/40 bg-card p-5 shadow-2xl transition-all duration-200 ease-out",
                expanded ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <activeTile.icon className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <Link to={activeTile.route} onClick={closeTile} className="text-xl font-semibold tracking-tight hover:underline">
                      {activeTile.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{activeTile.description}</p>
                  </div>
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={closeTile}
                    aria-label="Close"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {activeTile.subItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.route}
                      to={item.route}
                      onClick={closeTile}
                      className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted"
                    >
                      <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <Accordion type="single" collapsible className="w-full rounded-xl border border-border/70 bg-card px-4">
          <AccordionItem value="website-analytics" className="border-none">
            <AccordionTrigger className="py-4 text-left hover:no-underline">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold tracking-tight">Website Analytics</span>
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
