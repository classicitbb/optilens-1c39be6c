import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

const migration = () => read("supabase/migrations/20260827140000_crm_contact_enrichment.sql");

describe("CRM contact enrichment", () => {
  it("lets an approved correction past the preserve-populated-fields trigger, and nothing else", () => {
    const sql = migration();

    // Without this opt-in an approved correction reports success and silently
    // changes nothing, because the trigger reverts every service-role write
    // over an admin-entered value.
    expect(sql).toContain("current_setting('app.crm_enrichment_write', true) = 'on'");
    // Only the apply RPC may set it, and only for its own transaction.
    expect(sql).toContain("PERFORM set_config('app.crm_enrichment_write', 'on', true);");
    // The Innovations receiver's protection must be untouched.
    expect(sql).toContain("IF auth.role() <> 'service_role' THEN");
    expect(sql).toContain("NEW.business_name := COALESCE(NULLIF(BTRIM(OLD.business_name), ''), NEW.business_name);");
  });

  it("keeps both enrichment RPCs service-role only", () => {
    const sql = migration();

    expect(sql).toContain("RAISE EXCEPTION 'select_contacts_for_enrichment requires the service role'");
    expect(sql).toContain("RAISE EXCEPTION 'apply_contact_enrichment requires the service role'");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.select_contacts_for_enrichment(integer, text) TO service_role;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.apply_contact_enrichment(uuid, uuid[]) TO service_role;");
    // A field name reaching format(%I) must be whitelisted first.
    expect(sql).toContain("RAISE EXCEPTION 'field % is not enrichable', v_field;");
  });

  it("records provenance for every proposed value and widens the action type", () => {
    const sql = migration();

    for (const column of ["source_url", "confidence", "retrieved_at", "old_value", "new_value"]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("disposition text NOT NULL CHECK (disposition IN ('applied', 'pending_review', 'rejected', 'unchanged'))");
    expect(sql).toContain("'apply_contact_enrichment'");
    // copilot_runs.workflow is an FK; without this row a run insert fails.
    expect(sql).toContain("('crm_enrichment', 'claude'");
  });

  it("never spends a lookup on an unsafe match", () => {
    const provider = read("supabase/functions/lead-intelligence/providers/googlePlaceDetails.ts");

    expect(provider).toContain("const MIN_SIMILARITY = 0.72;");
    expect(provider).toContain("const MIN_SEPARATION = 0.1;");
    expect(provider).toContain('return { kind: "ambiguous", candidates:');
    expect(provider).toContain('if (status === "ZERO_RESULTS") return { kind: "no_match", reason: "ZERO_RESULTS" };');
  });

  it("fills blanks silently but always routes country and conflicts to approval", () => {
    const core = read("supabase/functions/_shared/enrichment/contactEnrichment.ts");

    // contacts.country is NOT NULL DEFAULT 'Barbados', so it is never blank and
    // blank-fill can never correct it.
    expect(core).toContain('{ field: "country", read: (d) => d.countryName, current: (c) => c.country, alwaysReview: true }');
    expect(core).toContain("const SILENT_APPLY_MIN_CONFIDENCE = 0.7;");
    expect(core).toContain("isBlankFill && !policy.alwaysReview && confidence >= SILENT_APPLY_MIN_CONFIDENCE");
    // country_code must not be filled from a listing that disagrees on country.
    expect(core).toContain("readCountryCodeFinding");
    // Every write goes through the one RPC, so provenance can't be bypassed.
    expect(core).toContain('db.rpc("apply_contact_enrichment"');
  });

  it("does not use the admin-gated credential RPC from a service-role context", () => {
    const fn = read("supabase/functions/crm-enrich-contacts/index.ts");
    const tools = read("supabase/functions/_shared/copilot/enrichmentTools.ts");

    // get_lead_provider_credentials ends in has_role(auth.uid(),'admin') and
    // auth.uid() is NULL for the service role — it would return {} and make
    // every scheduled run a silent no-op.
    for (const source of [fn, tools]) {
      // The name may appear in a comment explaining why; it must not be called.
      expect(source).not.toContain('rpc("get_lead_provider_credentials"');
      expect(source).toContain('.from("lead_provider_credentials")');
    }
  });

  it("bounds public-lookup spend before the cron job can run", () => {
    const fn = read("supabase/functions/crm-enrich-contacts/index.ts");
    const sql = migration();
    const schedule = read("supabase/migrations/20260827140500_crm_contact_enrichment_schedule.sql");

    expect(fn).toContain("const DAILY_ATTEMPT_CAP = 150;");
    expect(fn).toContain('skipped: "daily_cap"');
    expect(sql).toContain("LIMIT least(greatest(p_limit, 1), 100);");
    expect(sql).toContain("a.last_at < now() - interval '30 days'");
    expect(schedule).toContain("crm_enrich_contacts_nightly");
    expect(schedule).toContain("crm_enrich_contacts_new");
    // Idempotent re-run, matching lead_strategy_learning_daily.
    expect(schedule).toContain("PERFORM cron.unschedule(jobid)");
  });

  it("separates scheduler auth from administrator auth", () => {
    const fn = read("supabase/functions/crm-enrich-contacts/index.ts");
    const config = read("supabase/config.toml");

    expect(fn).toContain('req.headers.get("x-scheduler-secret")');
    expect(fn).toContain('Deno.env.get("CRM_ENRICH_SCHEDULER_SECRET")');
    expect(fn).toContain('sourceFunction: "crm-enrich-contacts"');
    // A scheduled call must never be able to target one chosen contact.
    expect(fn).toContain('return reply(400, { error: "contactId is only accepted on an administrator request" });');
    expect(config).toContain("[functions.crm-enrich-contacts]");
  });

  it("routes approvals through the existing copilot action path", () => {
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const card = read("src/features/admin/copilot/ActionCard.tsx");
    const tools = read("supabase/functions/_shared/copilot/enrichmentTools.ts");

    expect(edge).toContain('if (action.action_type === "apply_contact_enrichment")');
    expect(edge).toContain('await db.rpc("apply_contact_enrichment"');
    // A rejected proposal must not be re-offered by the next sweep.
    expect(edge).toContain('.update({ disposition: "rejected" })');
    // Enrichment evidence is not an editable draft.
    expect(edge).toContain("Enrichment findings cannot be edited");
    expect(card).toContain('const isEnrichment = action.action_type === "apply_contact_enrichment";');
    expect(card).toContain("Apply fields");
    // Grouped per contact+attempt so country/country_code stay together.
    expect(tools).toContain("idempotency_key: `enrich:${key}`");
  });

  it("gives the Copilot the enrichment tools and surfaces queued cards in the same turn", () => {
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const tools = read("supabase/functions/_shared/copilot/enrichmentTools.ts");

    expect(edge).toContain("ENRICHMENT_TOOLS");
    expect(edge).toContain("dispatchEnrichmentTool(db, use.name as string, input, actorUserId)");
    // A cron-created run has no conversation, so loadState cannot see it until
    // the queueing turn attaches one.
    expect(edge).toContain('await db.from("copilot_runs").update({ conversation_id: chatConversation.id })');
    for (const name of ["enrich_contact", "list_enrichment_findings", "queue_enrichment_approvals"]) {
      expect(tools).toContain(name);
    }
  });

  it("offers enrichment from the leads bulk actions and a single contact", () => {
    const leads = read("src/pages/admin/leads/MyLeadsPage.tsx");
    const contacts = read("src/pages/admin/erp/ContactsPage.tsx");
    const hook = read("src/features/admin/crm/hooks/useContactEnrichment.ts");

    expect(leads).toContain("enrichContacts.mutate({ limit: 25 })");
    expect(contacts).toContain("enrichContact.mutate({ contactId: editContact.id! })");
    expect(hook).toContain('supabase.functions.invoke("crm-enrich-contacts"');
    // Applied and needs-approval counts must stay distinguishable to the user.
    expect(hook).toContain("need approval in the Copilot");
  });
});
