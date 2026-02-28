import {
  BookOpen,
  DollarSign,
  ShoppingCart,
  Users,
  Search,
  Target,
  BookMarked,
  Globe,
  Settings,
} from "lucide-react";

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
}

export interface WikiCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  articles: WikiArticle[];
}

export const wikiCategories: WikiCategory[] = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      {
        id: "platform-overview",
        title: "Platform Overview",
        content:
          "OpticAdmin is organized by business apps (Pricing, Sales, Contacts, Leads, CRM, Website, Knowledge, Settings) under `/admin/<app>/...` routes.\n\nUse the App Launcher (grid icon) to switch apps quickly, then use the app-specific sidebar for page-level navigation.\n\n**Workflow principle:** start in Leads/CRM to identify opportunities, use Pricing/Catalog Publisher to build offers, and close in Sales/Quotations.",
      },
      {
        id: "roles-and-visibility",
        title: "Roles & Visibility Rules",
        content:
          "Role behavior is enforced across all apps:\n• **Admin**: full control, can access legacy admin-only tools.\n• **Operator**: operational edits, governed by feature permissions.\n• **Viewer**: read-only, no edit actions.\n• **Customer**: external read-only and scoped access.\n\nCost-sensitive data should remain hidden for Viewer/Customer paths where required.",
      },
      {
        id: "daily-rhythm",
        title: "Suggested Daily Workflow",
        content:
          "1) **Lead Finder**: discover and score opportunities.\n2) **My Leads / CRM**: convert promising leads into opportunities and track stage.\n3) **Catalog Publisher**: build custom package/proposal and export PDF.\n4) **Sales / Quotations**: formalize quote and manage outcomes.\n5) **Knowledge/Wiki**: capture learnings so the team compounds improvements.",
      },
    ],
  },
  {
    id: "pricing-app",
    icon: DollarSign,
    title: "Pricing App",
    articles: [
      {
        id: "pricing-pages",
        title: "Pricing Pages & What They Do",
        content:
          "Pricing app includes Product Catalog, RX/Stock/Supplies pricing, Catalog Publisher, Costings, Reference, Imports, and Pricing Settings.\n\nUse Product Catalog + pricing pages to keep source data clean before proposal/quote generation.",
      },
      {
        id: "catalog-publisher-v2",
        title: "Catalog Publisher v2 Workflow",
        content:
          "Catalog Publisher v2 is the canonical route at `/admin/pricing/publisher`.\n\n**Typical flow:**\n1. Open publisher from Pricing or from Leads/CRM 'Build Custom Package' buttons.\n2. Add products from `price_catalog`.\n3. Refine section copy (Executive Snapshot → Offer + Next Step).\n4. Export clinical proposal PDF.\n5. Attach to opportunity for CRM continuity.",
      },
      {
        id: "publisher-legacy-access",
        title: "Legacy Publisher Access",
        content:
          "Legacy publisher is available at `/admin/pricing/publisher-old` and is admin-only.\n\nUse it only for migration parity checks while v2 remains the primary path.",
      },
    ],
  },
  {
    id: "sales-app",
    icon: ShoppingCart,
    title: "Sales App",
    articles: [
      {
        id: "quotations-workflow",
        title: "Quotations Workflow",
        content:
          "Use Sales/Quotations to convert opportunity context into customer-ready pricing documents.\n\nBest practice: keep CRM stage and quote status synchronized so pipeline health remains accurate.",
      },
      {
        id: "sales-placeholder-roadmap",
        title: "Web Orders & RX Orders (Roadmap)",
        content:
          "`/admin/sales/web-orders` and `/admin/sales/rx-orders` are planned surfaces.\n\nUntil complete, use Quotations + CRM activities to track intent and follow-up.",
      },
    ],
  },
  {
    id: "contacts-app",
    icon: Users,
    title: "Contacts App",
    articles: [
      {
        id: "contacts-source-of-truth",
        title: "Contacts as Source of Truth",
        content:
          "Contacts remain the anchor entity for lead/opportunity relationships.\n\nWhen saving leads to CRM, contact records are created/updated first, then opportunity and notes are linked.",
      },
      {
        id: "tags-and-industry",
        title: "Tags & Industry Configuration",
        content:
          "Use Contacts config pages to keep segmentation clean.\n\nConsistent tags improve targeting for campaigns, sequence personalization, and reporting.",
      },
    ],
  },
  {
    id: "leads-app",
    icon: Search,
    title: "Leads App",
    articles: [
      {
        id: "lead-finder-deep",
        title: "Lead Finder: High-Value Prospecting",
        content:
          "Lead Finder supports query + location search and scoring, with Smart Batch prioritizing top opportunities.\n\nUse filters (rating/reviews/website) to focus on accounts with strongest conversion potential.",
      },
      {
        id: "my-leads-command-centre",
        title: "My Leads Command Centre",
        content:
          "Use table view for fast scanning and kanban view for stage progression (Lead → Contacted → Meeting → Proposal).\n\nBulk actions (Enrich, Audits, Sequence, IG Posts) are the multiplier features for team throughput.",
      },
      {
        id: "ai-assistant-instagram",
        title: "AI Assistant + Instagram Pack",
        content:
          "AI Assistant helps generate outreach artifacts (WhatsApp openers, email copy, proposal support text, and Instagram packs).\n\nUse these outputs to reduce content preparation time while keeping brand voice consistent.",
      },
      {
        id: "save-to-crm",
        title: "Save to CRM: What Happens",
        content:
          "Save to CRM action should:\n1. Upsert contact\n2. Create/update opportunity\n3. Append summary note\n4. Refresh Leads + CRM views\n\nThis keeps lead discovery and pipeline execution connected.",
      },
    ],
  },
  {
    id: "crm-app",
    icon: Target,
    title: "CRM App",
    articles: [
      {
        id: "pipeline-management",
        title: "Pipeline Management",
        content:
          "CRM pipeline surfaces opportunities by stage and provides quick stage updates.\n\nUse 'Build Package' directly from pipeline cards to launch Catalog Publisher with opportunity context.",
      },
      {
        id: "activities-discipline",
        title: "Activities Discipline",
        content:
          "CRM Activities is the operational heartbeat. Log actions with due dates and status so no opportunity stalls silently.\n\nA clean activities stream improves follow-up reliability and forecasting confidence.",
      },
    ],
  },
  {
    id: "website-app",
    icon: Globe,
    title: "Website App",
    articles: [
      {
        id: "content-governance",
        title: "Content Governance",
        content:
          "Website Content page controls customer-facing messaging.\n\nDocument pricing-related claims carefully so public messaging matches current commercial policy.",
      },
    ],
  },
  {
    id: "knowledge-app",
    icon: BookMarked,
    title: "Knowledge App",
    articles: [
      {
        id: "wiki-usage",
        title: "How to Use This Wiki",
        content:
          "This wiki should mirror current route architecture and real workflows.\n\nWhen pages/routes change, update headings first, then refresh how-to articles with practical, repeatable procedures.",
      },
      {
        id: "writing-standard",
        title: "Article Writing Standard",
        content:
          "Keep articles action-oriented:\n• What page is for\n• When to use it\n• Step-by-step flow\n• How it improves speed, quality, or conversion\n\nAvoid stale architecture references.",
      },
      {
        id: "major-update-ledger",
        title: "Major Update Ledger (Plan + Release Notes + Changelog)",
        content: `Use this date-stamped format for every major feature release so operators can review plan, outcome, and key changes in one place.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Plan
1. Strengthen smoke coverage for auth/admin entry points.
2. Enforce runtime-error logging wiring and output contract checks.
3. Keep docs synchronized with a human-readable changelog.

### Release Notes
- Added smoke coverage for \`/auth\` in the QA harness.
- Added static wiring checks for Auth page login UX strings and runtime logging pathways.
- Preserved route smoke checks for leads, CRM pipeline, runtime errors, and publisher pages.

### Changelog (Human-readable)
- QA harness now validates auth route availability and key login copy.
- Runtime logging contract checks remain enforced for one-line error capture format.
- Changelog now uses date-stamped entries for major updates.

### Update Rule (Required)
For each major feature update, append a new entry with:
- Date (\`YYYY-MM-DD\`)
- Plan (3–5 bullets)
- Release Notes (what shipped)
- Changelog (what changed technically)`,
      },
    ],
  },
  {
    id: "settings-app",
    icon: Settings,
    title: "Settings App",
    articles: [
      {
        id: "admin-controls",
        title: "Company, Users, Roles, Audit",
        content:
          "Settings centralizes governance.\n\nUse Users/Roles to control capability boundaries and Audit to validate important operational changes.",
      },
      {
        id: "integration-keys",
        title: "Integration Keys & Compliance",
        content:
          "Store and rotate API keys for Google Places / Facebook / Instagram integrations in controlled settings surfaces.\n\nApply compliance toggles for outreach policies before scaling automated campaigns.",
      },
    ],
  },
];
