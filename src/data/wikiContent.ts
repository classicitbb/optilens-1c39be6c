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
  LifeBuoy,
  Rocket,
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
      { id: "release-notes-md", title: "Release Notes (Markdown)", content: releaseNotesMarkdown },
      { id: "changelog-md", title: "Changelog (Markdown)", content: changelogMarkdown },
      { id: "delivery-plan-md", title: "Delivery Plan (Markdown)", content: deliveryPlanMarkdown },
    ],
  },
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      {
        id: "platform-overview",
        title: "Platform Overview & Navigation",
        content: `## Purpose
This help desk supports route-based training for every operational area in the platform.

## Navigation model
1. Use the App Launcher to enter a business app.
2. Use app sidebar links to open route-level pages.
3. Open the Help panel on each page for context-specific guidance.

## Which routes need help articles?
Routes need a dedicated article when they are one of the following:
- A CRUD workflow where users create, edit, or publish data.
- A workflow checkpoint (import, approval, assignment, export, print, configuration).
- A page where user permissions or compliance actions matter.
- A dashboard where action interpretation is required.

Routes that are simple redirects/placeholders can remain covered by a parent "module overview" article.`,
      },
      {
        id: "route-coverage-matrix",
        title: "Route Help Desk Coverage Matrix",
        content: `## Coverage standard used
- **Dedicated article required**: unique workflow, settings, reports, or role-sensitive actions.
- **Shared article acceptable**: aliases, redirects, or "coming soon" placeholders.

## Admin route families that require articles
### Pricing
- /admin/pricing/catalog
- /admin/pricing/rx-lenses
- /admin/pricing/stock-lenses
- /admin/pricing/supplies
- /admin/pricing/publisher
- /admin/pricing/costings, /new, /:id, /reports
- /admin/pricing/reference
- /admin/pricing/imports
- /admin/pricing/settings

### Sales
- /admin/sales/proposals
- /admin/sales/quotations
- /admin/sales/quotations/:id
- /admin/sales/quotations/:id/print-preview
- web-orders and rx-orders (when enabled)

### Contacts, Leads, CRM
- /admin/contacts and config routes
- /admin/leads, /finder, /campaigns, /reports, /ai, /settings
- /admin/crm/dashboard, /pipeline, /activities

### Helpdesk, Website, Knowledge, Settings
- /admin/helpdesk/tickets, /teams, /sla
- /admin/website/content
- /admin/knowledge/wiki
- /admin/settings/company, /users, /roles, /audit, /integrations, /runtime-errors

### Moonshot
- /admin/moonshot/dashboard
- /admin/moonshot/workspace
- /admin/moonshot/meetings, /meetings/new, /meetings/:meetingId
- /admin/moonshot/scorecards
- /admin/moonshot/rocks
- /admin/moonshot/todos
- /admin/moonshot/issues
- /admin/moonshot/business-plan
- /admin/moonshot/tools
- /admin/moonshot/users
- /admin/moonshot/settings`,
      },
      {
        id: "daily-rhythm",
        title: "Daily Workflow (End-to-End)",
        content: `## Recommended operator rhythm
1. **Lead discovery** in Leads Finder.
2. **Qualification** in My Leads and CRM Pipeline.
3. **Offer assembly** in Proposals and Quotations.
4. **Delivery operations** in Pricing, Imports, and Costings.
5. **Support and governance** in Helpdesk and Settings.
6. **Execution cadence** in Moonshot meetings, scorecards, and rocks.

## Use-case scenario
- A team finds a target clinic in Lead Finder.
- Sales creates a proposal and formal quote.
- Operations checks catalog and import costings before final commitment.
- Helpdesk tracks onboarding tickets.
- Leadership reviews weekly accountability in Moonshot.`,
      },
    ],
  },
  {
    id: "pricing-app",
    icon: DollarSign,
    title: "Pricing App",
    articles: [
      {
        id: "pricing-workflow",
        title: "Pricing Workflow: Catalog to Costings",
        content: `## Step-by-step
1. Maintain SKUs and structures in **Product Catalog**.
2. Validate channel pricing in **RX / Stock / Supplies** pages.
3. Use **Reference** for shared taxonomy and dependency data.
4. Run **Imports** to bulk load changes.
5. Audit landed economics in **Costings** and **Reports**.
6. Finalize controls in **Pricing Settings**.

## Best practice
Always adjust catalog/reference first, then prices, then imports, then reports. This prevents mismatched pricing state.`,
      },
      {
        id: "proposals-workflow",
        title: "Proposals Workflow (Sales Bridge)",
        content: `## Route
/admin/sales/proposals

## How to use
1. Open proposal list and create/select a proposal.
2. Add products from approved catalog entries.
3. Structure content blocks (problem, recommendation, offer, next steps).
4. Validate numbers and narrative consistency.
5. Export/share and link to CRM opportunity.

## Use case
Use this when you need a consultative, presentation-style offer before formal quotation.`,
      },
    ],
  },
  {
    id: "sales-app",
    icon: ShoppingCart,
    title: "Sales App",
    articles: [
      {
        id: "quotations-lifecycle",
        title: "Quotations Lifecycle",
        content: `## Step-by-step
1. Create quote from proposal/opportunity context.
2. Complete identification, frame, lens, Rx, and add-ons.
3. Review totals, discounts, and margin-sensitive line items.
4. Save draft and align pipeline stage.
5. Send quote and track response.

## Scenario
A buyer asks for two plan options. Create separate quote variants and use notes to explain tradeoffs.`,
      },
      {
        id: "quote-print-preview-guide",
        title: "Print / PDF Preview Workflow",
        content: `## Route
/admin/sales/quotations/:id/print-preview

## How to use
1. Finish quote inputs in editor.
2. Open **Print / Preview**.
3. Validate pagination, customer data, pricing blocks, and notes.
4. Set paper size/orientation and export PDF.
5. Return to editor if layout or values require correction.

## Troubleshooting
- Disable browser headers/footers for clean output.
- Keep scale at 100% unless a client template requires otherwise.`,
      },
    ],
  },
  {
    id: "contacts-app",
    icon: Users,
    title: "Contacts App",
    articles: [
      {
        id: "contacts-and-config",
        title: "Contacts, Tags, and Industries Setup",
        content: `## Workflow
1. Create/clean contact master records.
2. Apply tags for segmentation and campaign targeting.
3. Configure industries to standardize reporting slices.
4. Confirm downstream CRM/Leads records remain linked.

## Scenario
Before a new regional campaign, normalize all industry values and tags so lead routing and reports are accurate.`,
      },
    ],
  },
  {
    id: "leads-app",
    icon: Search,
    title: "Leads App",
    articles: [
      {
        id: "lead-finder-playbook",
        title: "Lead Finder to CRM Conversion",
        content: `## Step-by-step
1. Search and score targets in **Lead Finder**.
2. Save qualified records to **My Leads**.
3. Run outreach/campaign actions where approved.
4. Use **Save to CRM** to convert high-potential leads.
5. Track conversion and follow-up in CRM activities.

## Scenario
Use this when growth teams need repeatable prospecting with closed-loop pipeline execution.`,
      },
      {
        id: "ai-assistant-workflow",
        title: "AI Assistant & Campaign Assets",
        content: `## Route
/admin/leads/ai

## How to use
1. Provide account context and target persona.
2. Generate outreach copy (email, WhatsApp, social).
3. Edit for compliance and tone.
4. Publish assets into campaign workflow.
5. Track response quality in reports.

## Guardrail
Always human-review generated copy before customer send.`,
      },
    ],
  },
  {
    id: "crm-app",
    icon: Target,
    title: "CRM App",
    articles: [
      {
        id: "pipeline-and-activities",
        title: "Pipeline + Activities Operating Procedure",
        content: `## Pipeline workflow
1. Keep stages current for each opportunity.
2. Use card actions to open proposals/quotes quickly.
3. Log next action with owner and due date.

## Activities workflow
1. Record call/email/meeting outcomes.
2. Set due dates to avoid opportunity drift.
3. Use dashboard trends for management review.

## Scenario
If a deal stalls, first check missing activity due dates, then correct stage accuracy.`,
      },
    ],
  },
  {
    id: "helpdesk-app",
    icon: LifeBuoy,
    title: "Helpdesk App",
    articles: [
      {
        id: "helpdesk-tickets-workflow",
        title: "Tickets Workflow",
        content: `## Route
/admin/helpdesk/tickets

## Step-by-step
1. Create ticket with requester, priority, and issue summary.
2. Assign team and stage.
3. Track SLA badge status and due targets.
4. Update stage until closure with resolution notes.
5. Reopen/escalate if validation fails.

## Scenario
Use this for onboarding, incident triage, and internal support requests with accountable ownership.`,
      },
      {
        id: "helpdesk-configuration",
        title: "Teams and SLA Policy Configuration",
        content: `## Routes
- /admin/helpdesk/teams
- /admin/helpdesk/sla

## How to configure
1. Create active teams aligned to service domains.
2. Define SLA response and resolution windows by priority.
3. Test with sample tickets.
4. Monitor breaches and tune policy thresholds.

## Outcome
Consistent escalation behavior and measurable support performance.`,
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
        title: "Website Content Governance",
        content: `## Route
/admin/website/content

## Step-by-step
1. Draft/update content blocks by section.
2. Validate claims and policy-sensitive language.
3. Review formatting consistency.
4. Publish and confirm live route behavior.
5. Log major content changes in release notes.

## Scenario
Use when launching a new offer page and needing approved messaging + clean formatting.`,
      },
    ],
  },
  {
    id: "moonshot-app",
    icon: Rocket,
    title: "Moonshot",
    articles: [
      {
        id: "moonshot-operating-system",
        title: "Moonshot Operating System (Weekly Cadence)",
        content: `## Core routes and purpose
- **Dashboard**: executive pulse.
- **Workspace**: central operating board.
- **Meetings**: schedule and run meeting agenda.
- **Scorecards**: weekly KPI accountability.
- **Rocks / Todos / Issues**: quarterly priorities and execution blockers.
- **Business Plan**: long-horizon strategy.
- **Tools, Users, Settings**: governance and configuration.

## Weekly execution workflow
1. Review scorecards before weekly meeting.
2. Update rocks and todos by owner.
3. Log and prioritize issues.
4. Run meeting and capture actions.
5. Align business plan assumptions monthly.

## Scenario
Leadership team uses Moonshot to move from reactive updates to structured execution.`,
      },
      {
        id: "moonshot-meeting-runbook",
        title: "Moonshot Meetings Runbook",
        content: `## Routes
- /admin/moonshot/meetings
- /admin/moonshot/meetings/new
- /admin/moonshot/meetings/:meetingId

## How to run
1. Create meeting and invite required owners.
2. Prepare agenda from scorecards, rocks, todos, and issues.
3. During meeting, record decisions and owners live.
4. Close with due dates and accountability checks.
5. Review completion status in next meeting prep.

## Quality checklist
- Every action has one owner.
- Every owner has a due date.
- Every issue has a disposition (solve, delegate, defer).`,
      },
    ],
  },
  {
    id: "knowledge-app",
    icon: BookMarked,
    title: "Knowledge App",
    articles: [
      {
        id: "wiki-article-standard",
        title: "Help Article Formatting Standard",
        content: `## Required structure for every help article
1. **Purpose / Route**
2. **Step-by-step workflow**
3. **Use-case scenario**
4. **Best practices / guardrails**
5. **Troubleshooting** (when relevant)

## Formatting rules
- Use clear markdown headings (## / ###).
- Prefer numbered steps for procedural actions.
- Keep paragraphs short and operational.
- Avoid architecture-only text without user actions.

## Completion definition
An article is complete when a new operator can execute the workflow end-to-end without external coaching.`,
      },
    ],
  },
  {
    id: "settings-app",
    icon: Settings,
    title: "Settings App",
    articles: [
      {
        id: "settings-governance",
        title: "Company, Users, Roles, Audit, Integrations",
        content: `## Workflow
1. Update company defaults and required policy settings.
2. Provision users and assign least-privilege roles.
3. Validate role impact through feature visibility checks.
4. Monitor audit log for high-risk changes.
5. Maintain integrations and runtime error monitoring.

## Scenario
Before onboarding a new operations team, configure roles first, then test route access and audit trails.`,
      },
    ],
  },
];
