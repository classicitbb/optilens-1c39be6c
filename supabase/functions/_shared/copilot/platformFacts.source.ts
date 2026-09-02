// Hand-maintained inputs for the Copilot's self-knowledge.
//
// Everything derivable from code (routes, modules, resource capabilities) is
// generated instead — see scripts/generate_copilot_platform_facts.mjs. This
// file holds only what code cannot tell us: business terminology and where the
// platform actually runs. Deno-safe: no imports, no I/O at module scope.
//
// When you change anything here, run `npm run copilot:facts` to regenerate
// platformFacts.generated.ts, and bump `lastVerified`.

export const PLATFORM_TERMINOLOGY = `Terminology you must use correctly:
- "ERP" refers to OpticAdmin itself and its Innovations-synced data (customers.innovations_customer_id, the innovations-sync pipeline) — never an external ERP product.
- "Contacts" always means the CRM contacts stored in OpticAdmin's own \`contacts\` table — never Google Contacts, Outlook, or any other external address book.
- "Customers" means OpticAdmin's \`customers\` table (ERP/billing identity — account number, credit terms, Innovations link), distinct from a \`contacts\` row (CRM identity — pipeline, stage, lead score). A contact and a customer can be linked, but they are different records.
- "Orders" or "web orders" means orders placed through the Classic Visions website/portal (OpticAdmin's \`orders\` table) — not ERP-synced order statistics.`;

export const PLATFORM_FACTS = {
  // Bump when you re-check that every line below is still true.
  lastVerified: "2026-08-27",
  facts: [
    { label: "Hosting", detail: "Vite + React + TypeScript + Tailwind + shadcn/ui, hosted on Vercel and deployed through Lovable — a git push alone does not publish a build." },
    { label: "Data", detail: "Supabase Postgres behind row-level security, plus Supabase Auth, Storage and the Deno Edge Functions behind every server operation." },
    { label: "ERP source", detail: "ERP records come from Innovations, an Actian Zen database on the Classic Visions network, pushed in by the on-premises OptiLens agent through innovations-sync." },
    { label: "Email", detail: "SMTP via the docstudio-api email/send endpoint, drained by the process-email-queue worker; every transactional message carries an unsubscribe token." },
    { label: "AI", detail: "This Copilot runs on Anthropic Claude via the portal-copilot function; voice notes go through voice-transcribe. Some lead and outreach features use the Lovable AI gateway." },
    { label: "Public-web data", detail: "Lead discovery and contact enrichment use Google Places and Firecrawl, keyed from lead_provider_credentials." },
    { label: "Integrations", detail: "An MCP server at /functions/v1/mcp exposes this same admin data to external AI clients. Bank payment portals, OneDrive document storage and Doc Studio templates are also wired in." },
    { label: "Storefront", detail: "The same app serves the public site and customer portal: storefront, Rx order form, stock order builder, quotations, statements and support tickets, gated by portal account membership." },
  ],
} as const;
