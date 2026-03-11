import { ArrowRight, BarChart3, BookOpen, DollarSign, Globe, LifeBuoy, Megaphone, Rocket, Settings, ShoppingCart, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const appTiles = [
  {
    title: "Pricing",
    description: "Configure product pricing, lens catalogs, imports, and costing workflows.",
    route: "/admin/pricing/catalog",
    icon: DollarSign,
  },
  {
    title: "Sales",
    description: "Manage proposals, quotations, and order workflows across all channels.",
    route: "/admin/sales/proposals",
    icon: ShoppingCart,
  },
  {
    title: "Contacts",
    description: "Maintain customer records, tags, and industry segmentation data.",
    route: "/admin/contacts",
    icon: Users,
  },
  {
    title: "Leads",
    description: "Find prospects, run campaigns, and monitor lead quality with AI-assisted tools.",
    route: "/admin/leads",
    icon: Megaphone,
  },
  {
    title: "CRM",
    description: "Track opportunities, pipeline performance, and scheduled sales activities.",
    route: "/admin/crm/dashboard",
    icon: Target,
  },
  {
    title: "Helpdesk",
    description: "Resolve support requests, manage SLAs, and keep customer operations smooth.",
    route: "/admin/helpdesk/overview",
    icon: LifeBuoy,
  },
  {
    title: "Website",
    description: "Update website content and manage feature pages and storefront touchpoints.",
    route: "/admin/website/content",
    icon: Globe,
  },
  {
    title: "Knowledge Base",
    description: "Browse and maintain internal wiki articles, process docs, and shared references.",
    route: "/admin/knowledge/wiki",
    icon: BookOpen,
  },
  {
    title: "Settings",
    description: "Manage company settings, users, permissions, integrations, and audit controls.",
    route: "/admin/settings/company",
    icon: Settings,
  },
  {
    title: "Moonshot",
    description: "Run strategic planning with scorecards, meetings, rocks, and execution tools.",
    route: "/admin/moonshot/dashboard",
    icon: Rocket,
  },
];

const metrics = [
  { label: "Visitors", value: "48,302", trend: "+12.6% vs last week" },
  { label: "Bounce Rate", value: "34.2%", trend: "-3.1% improvement" },
  { label: "Abandoned Carts", value: "219", trend: "-8.4% vs last week" },
  { label: "Conversion Rate", value: "4.9%", trend: "+0.7% uplift" },
  { label: "Avg. Session Time", value: "3m 42s", trend: "+18 seconds" },
  { label: "Returning Users", value: "11,804", trend: "+9.2% growth" },
];

const AdminDashboardHomePage = () => {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-1 pb-4 pt-1 md:space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-primary/15 via-background to-slate-500/10 p-5 shadow-sm md:p-6">
        <div className="absolute right-3 top-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">Launch Pad Home</Badge>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Welcome</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">OpticAdmin</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Your ERP command center for managing sales, customer relationships, service operations, and website performance in one unified workspace.
          This dashboard is a placeholder that will evolve into live operational and analytics insights.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Website Analytics (Placeholder Metrics)</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((metric) => (
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Applications</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
          {appTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Card key={tile.title} className="flex h-full flex-col border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="space-y-1.5 p-4 pb-2">
                  <div className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{tile.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{tile.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto p-4 pt-1">
                  <Button asChild className="h-9 w-full text-sm">
                    <Link to={tile.route}>
                      Open {tile.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardHomePage;
