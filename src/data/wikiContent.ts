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
  ScrollText,
} from "lucide-react";

import changelogMarkdown from "../../CHANGELOG.md?raw";
import deliveryPlanMarkdown from "../../docs/phase2-phase3-delivery.md?raw";
import releaseNotesMarkdown from "../../docs/release-notes.md?raw";

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  context_slugs?: string[];
}

export interface WikiCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  articles: WikiArticle[];
}

export const wikiCategories: WikiCategory[] = [
  {
    id: "release-ledger",
    icon: ScrollText,
    title: "Release Ledger",
    articles: [
      {
        id: "release-notes-md",
        title: "Release Notes (Markdown)",
        content: releaseNotesMarkdown,
      },
      {
        id: "changelog-md",
        title: "Changelog (Markdown)",
        content: changelogMarkdown,
      },
      {
        id: "delivery-plan-md",
        title: "Delivery Plan (Markdown)",
        content: deliveryPlanMarkdown,
      },
    ],
  },
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      {
        id: "platform-overview",
        title: "Platform Overview",
        content:
          "OpticAdmin is organized by business apps (Pricing, Sales, Contacts, Leads, CRM, Website, Knowledge, Settings) under `/admin/<app>/...` routes.\n\nUse the App Launcher (grid icon) to switch apps quickly, then use the app-specific sidebar for page-level navigation.\n\n**Workflow principle:** start in Leads/CRM to identify opportunities, use Pricing/Lens Catalog Builder to build offers, and close in Sales/Quotations.",
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
          "1) **Lead Finder**: discover and score opportunities.\n2) **My Leads / CRM**: convert promising leads into opportunities and track stage.\n3) **Proposals**: build custom packages/proposals and export PDF.\n4) **Sales / Quotations**: formalize quote and manage outcomes.\n5) **Knowledge/Wiki**: capture learnings so the team compounds improvements.",
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
          "Pricing app includes Product Catalog, RX/Stock/Supplies pricing, Lens Catalog Builder, Costings, Reference, Imports, and Pricing Settings.\n\nUse Product Catalog + pricing pages to keep source data clean before proposal/quote generation.",
      },
      {
        id: "catalog-publisher-v2",
        title: "Proposals Workflow",
        content:
          "Proposals is available at `/admin/sales/proposals`.\n\n**Typical flow:**\n1. Open Proposals from Sales or from Leads/CRM 'Build Package' buttons.\n2. Add products from `price_catalog`.\n3. Refine section copy (Executive Snapshot → Offer + Next Step).\n4. Export clinical proposal PDF.\n5. Attach to opportunity for CRM continuity.",
      },
      {
        id: "publisher-legacy-access",
        title: "Legacy Publisher Access",
        content:
          "Lens Catalog Builder is available at `/admin/pricing/publisher` and is admin-only.\n\nUse it only for migration parity checks while v2 remains the primary path.",
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
        id: "quote-print-preview-guide",
        title: "Quote Print / Preview Guide",
        content: `Use the dedicated Print / Preview page from the RX Add-ons step to confirm final layout before sharing with customers.

Route: /admin/sales/quotations/:id/print-preview

**What this page is for**
1. Validate print pagination and spacing
2. Print or Save as PDF
3. Save recalculated totals
4. Return to editor or close back to list

**How to use it**
1. In an RX quote, complete Identification → Frame → Lens → Prescription → Add-ons.
2. Click **Print / Preview** at the end of Add-ons.
3. Review the full page preview, including customer, frame, line items, prescription, totals, and notes.
4. Adjust print settings in the preview chrome (paper/orientation/margins/spacing/table scale).
5. Click **Print / Save as PDF** when ready.

**Important behavior**
- Prescription details are no longer forced onto a new page; they flow naturally based on available space.
- For framed edged jobs, the standard edging fee remains included in displayed grand total logic.`,
      },
      {
        id: "quote-print-preview-troubleshooting",
        title: "Quote Preview & Print Troubleshooting",
        content: `If preview and print differ, check these first:

1) Browser print dialog
- Disable browser headers/footers
- Use 100% scale
- Keep margins set to default unless using app-controlled margins

2) App print settings
- Verify paper size (A4 vs Letter)
- Verify orientation (Portrait vs Landscape)
- Increase/decrease section spacing and table scale for dense quotes

3) Content checks
- Ensure prescription values are saved before printing
- Confirm quote notes and line item descriptions are final
- Reopen Print / Preview after major edits to refresh layout

4) Page break expectations
- Long line-item tables still break across pages naturally
- RX prescription blocks are kept together when possible, but no longer hard-forced to a new page`,
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
          "CRM pipeline surfaces opportunities by stage and provides quick stage updates.\n\nUse 'Build Package' directly from pipeline cards to launch Proposals with opportunity context.",
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

## 2026-02-28 — Admin E2E Runtime Hardening (Lead Finder graceful fallback)

### Plan
- Run end-to-end admin checks across key pages and watch for runtime failures.
- Prevent Lead Finder from hard-failing when Edge Function connectivity is unavailable.
- Surface operator-friendly fallback messaging instead of destructive runtime behavior.

### Release Notes
- Lead Finder now degrades gracefully when the \`lead-intelligence\` Edge Function cannot be reached.
- Users receive a clear in-page warning and non-crashing diagnostics state instead of repeated fatal runtime failure behavior.
- Search action now catches unexpected failures and reports a controlled toast error.

### Technical Changelog
- Updated \`src/features/admin/leads/hooks/useLeadFinder.ts\` to return a safe fallback payload when function-invoke transport failures occur.
- Updated \`src/pages/admin/leads/LeadFinderPage.tsx\` to use \`mutateAsync\` with explicit try/catch and warning-surface handling.
- Retained existing diagnostics panel contract by providing fallback diagnostics values when providers are unreachable.

## 2026-02-28 — Contacts/CRM Location UX Upgrade (Country→State/City constrained dropdowns)

### Plan
- Replace free-text country/state/city fields with guided dropdowns in Contacts edit flow.
- Apply the same constrained location selection model to CRM Manual Opportunity Intake.
- Keep persistence backward compatible with existing contact/opportunity records.

### Release Notes
- Contacts edit dialog now shows Country first, with State and City dropdown options constrained by selected country.
- CRM Manual Opportunity Intake now uses Country, State, and City dropdowns with country-constrained options.
- Existing saved location values continue to display and remain selectable even if legacy/custom text was used previously.

### Technical Changelog
- Added \`src/lib/locationOptions.ts\` with country/state/city option helpers and backward-compatible option hydration (\`ensureOption\`).
- Updated \`src/pages/admin/erp/ContactsPage.tsx\` to swap address free-text fields for constrained \`Select\` controls and reorder country above state/city.
- Updated \`src/pages/admin/crm/CrmPipelinePage.tsx\` intake form to use constrained location dropdowns.
- Updated \`src/features/admin/crm/hooks/useOpportunities.ts\` to persist optional \`state\` into contact upsert payload during manual intake.

## 2026-02-28 — Product Catalog Regression Fix (Row Scroll + Working Filters)

### Plan
- Restore vertical row scrolling in product catalog segment tables while keeping headers visible.
- Fix the filter popover interaction regression so selections actually apply.
- Re-validate catalog behavior with credentialed UI checks and smoke tests.

### Release Notes
- Product catalog table rows now scroll again inside their table frames.
- Filter popovers now stay interactive after opening, so option selection and apply behavior work as expected.
- "Select All" in filter popovers is now directly clickable to clear narrowed selections quickly.

### Technical Changelog
- Updated \`src/components/ui/table.tsx\` table wrapper to fill available height (\`h-full\`) so internal row scrolling works in flex layouts.
- Updated \`src/components/admin/MultiSelectFilter.tsx\` to track both trigger and portal menu refs for outside-click handling, preventing immediate close on menu interaction.
- Wired the popover "Select All" row to call \`selectAll\` directly.

## 2026-02-28 — Product Catalog Table UX Fixes (Sticky Headers + Filter Overlay + Tab Counts)

### Plan
- Keep product catalog table headers pinned while row data scrolls underneath.
- Ensure column-filter dialogs render above table content instead of appearing hidden.
- Add filter-tab impact counts so users can see constrained record totals before switching tabs.

### Release Notes
- Product catalog segment tables now keep one sticky header layer, preventing header cells from drifting out of frame while rows scroll.
- Column filter popovers now render in a top-level portal with fixed positioning and stronger z-index stacking, so they appear above rows and sticky headers.
- Lens, Add-ons, and Supplies filter tabs now display live counts (e.g., \`Active (42)\`) based on the current search and column-filter context.

### Technical Changelog
- Updated \`src/components/admin/AddonDataTable.tsx\` and \`src/components/admin/SupplyDataTable.tsx\` to remove redundant per-column sticky classes and add computed tab-count labels.
- Updated \`src/components/admin/LensDataTable.tsx\` to compute status counts from base-filtered records and show count-bearing tab labels.
- Updated \`src/components/admin/MultiSelectFilter.tsx\` to use \`createPortal\` with dynamic fixed positioning for reliable popover layering.

## 2026-02-28 — E2E Stability Pass (Help Panel + Wiki Keying)

### Plan
- Execute credentialed end-to-end navigation across core admin surfaces.
- Fix runtime loops and React key warnings surfaced by browser-console checks.
- Re-run smoke harness to confirm regressions are closed.

### Release Notes
- Fixed an update-loop issue in Help Panel expansion state initialization.
- Fixed duplicate-key warning in wiki section table-of-contents generation for repeated headings.
- Re-validated core admin route smoke checks and credentialed browser flow.

### Technical Changelog
- \`src/components/admin/HelpPanel.tsx\`: guarded \`setExpandedIds\` to avoid unnecessary state updates that triggered maximum update-depth warnings.
- \`src/components/admin/wikiFormatting.tsx\`: added deterministic unique section IDs for duplicate heading labels.
- Added credentialed browser verification artifacts for wiki/admin navigation console-health.

## 2026-02-28 — Admin CRM Homepage + Wiki Markdown Visibility

### Plan
- Route admin homepage to CRM pipeline for users with CRM access.
- Make changelog, release notes, and delivery plan visible in Help/Wiki in markdown form.
- Improve wiki markdown rendering for clearer human-readable headings and code blocks.

### Release Notes
- \`/admin\` now redirects admins/operators/viewers to \`/admin/crm/pipeline\`.
- Help/Wiki now includes a dedicated **Release Ledger** section with markdown-backed Release Notes, Changelog, and Delivery Plan articles.
- Wiki content renderer now supports markdown headings (\`#\`, \`##\`, \`###\`) and fenced code blocks.

### Technical Changelog
- Added \`src/components/admin/AdminHomeRedirect.tsx\` and wired admin index route to it.
- Added raw markdown imports in \`src/data/wikiContent.ts\` from \`CHANGELOG.md\`, \`docs/release-notes.md\`, and \`docs/phase2-phase3-delivery.md\`.
- Added \`docs/release-notes.md\` and enhanced \`src/components/admin/wikiFormatting.tsx\` parsing/rendering logic.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Plan
- Prevent false-positive smoke passes when Vite reports transform/startup errors.
- Validate credentialed login flow and protected-route redirect behavior.
- Keep release ledger process synchronized between repo changelog and in-app wiki.

### Release Notes

### Technical Changelog
- Added dev-server diagnostic pattern capture and failure gating in \`scripts/admin_smoke_and_error_checks.mjs\`.
- Kept runtime logging format/wiring checks and auth/admin route smoke checks intact.
- Aligned date-stamped update governance across \`CHANGELOG.md\` and wiki ledger article.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Plan
- Strengthen smoke coverage for login/auth and high-traffic admin routes.
- Add stricter assertions for runtime error logging wiring across app/page surfaces.
- Enforce stable one-line runtime-error output contract for downstream automation.

### Release Notes

### Technical Changelog
- Updated \`scripts/admin_smoke_and_error_checks.mjs\` with additional route and snippet assertions.
- Preserved runtime log format contract checks for \`[runtime-error] <timestamp> | <source> | <title> | <detail> | <route>\`.
- Added this date-stamped changelog structure for future major updates.

### Update Rule (Required)
For each major feature update, append a new entry with:
- Date (\`YYYY-MM-DD\`)
- Plan (3–5 bullets)
- Release Notes (what shipped)
- Technical Changelog (what changed technically)`,
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
