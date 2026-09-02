// CRM enrichment tools for the Portal Copilot.
//
// Kept OUT of lookupTools.ts on purpose: these are not read-only. enrich_contact
// spends a Google Places call and may write blank fields on the contact. The
// blank-fill/approval policy itself lives in
// _shared/enrichment/contactEnrichment.ts and is shared with the scheduled
// crm-enrich-contacts function, so a Copilot-initiated enrichment obeys exactly
// the same rules as a nightly one.

import { enrichContact, type EnrichableContact } from "../enrichment/contactEnrichment.ts";

export const ENRICHMENT_TOOLS = [
  {
    name: "enrich_contact",
    description:
      "Look up one OpticAdmin CRM contact on Google Places and fill in blank public business details — website, phone, street, city, state, postal code, place id, rating and review count — recording the source URL, retrieval date and confidence for every field written. Values that CONTRADICT something already on the contact are never written; they come back as proposals for the administrator to approve. Use this when the admin asks to enrich, research, verify or complete a contact's public details.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "The contact's id (uuid). Use search_contacts first if you only have a name." },
      },
      required: ["contactId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_enrichment_findings",
    description:
      "List CRM enrichment findings waiting for review — cases where a public listing contradicts a value already stored on a contact, so the nightly sweep did not write it. Returns the contact, field, current value, proposed value, source URL and confidence. Use this when the admin asks what enrichment is pending or what was found overnight.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Optional — restrict to one contact." },
        limit: { type: "number", description: "Maximum findings to return. Default 15, maximum 50." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "queue_enrichment_approvals",
    description:
      "Turn pending CRM enrichment findings into approval cards the administrator can act on in this chat. Use this after list_enrichment_findings when the admin says to queue, propose, review or action them. One card is created per contact, grouping that contact's findings so related fields (such as country and country code) are applied together. This creates no change to any contact by itself — approving the card does.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Optional — queue only this contact's findings." },
        findingIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional — queue only these specific findings, from list_enrichment_findings.",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

export const ENRICHMENT_TOOL_NAMES = new Set(ENRICHMENT_TOOLS.map((tool) => tool.name));

const CONTACT_COLUMNS = "id,name,business_name,street,city,state,zip,country,country_code,website,phone,google_place_id";

/**
 * The Copilot runs with the admin client, so RLS is bypassed and the
 * admin-gated get_lead_provider_credentials RPC cannot be used here either.
 */
const resolvePlacesKey = async (db: any): Promise<string> => {
  const { data } = await db
    .from("lead_provider_credentials")
    .select("credential")
    .eq("tenant_key", "default")
    .eq("provider", "google_places")
    .maybeSingle();
  const stored = typeof data?.credential === "string" ? data.credential.trim() : "";
  return stored || (Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "").trim();
};

export const dispatchEnrichmentTool = async (
  db: any,
  name: string,
  input: Record<string, unknown>,
  actorUserId: string,
) => {
  if (name === "queue_enrichment_approvals") {
    const contactId = typeof input.contactId === "string" ? input.contactId.trim() : "";
    const findingIds = Array.isArray(input.findingIds)
      ? input.findingIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    let query = db
      .from("contact_enrichment_findings")
      .select("id,contact_id,attempt_id,field,old_value,new_value,source,source_url,confidence,retrieved_at,contacts(name,business_name)")
      .eq("disposition", "pending_review")
      .order("created_at", { ascending: false })
      .limit(200);
    if (contactId) query = query.eq("contact_id", contactId);
    if (findingIds.length) query = query.in("id", findingIds);
    const { data: findings, error: findingsError } = await query;
    if (findingsError) throw new Error(findingsError.message);
    if (!findings?.length) return { ok: true, queued: 0, note: "There are no enrichment findings waiting for review." };

    // One card per contact per attempt, so a country/country_code pair cannot
    // be approved inconsistently and the idempotency key stays stable.
    const groups = new Map<string, any[]>();
    for (const finding of findings) {
      const key = `${finding.contact_id}:${finding.attempt_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(finding);
    }

    const { data: run, error: runError } = await db.from("copilot_runs").insert({
      workflow: "crm_enrichment",
      command_text: "Queue CRM enrichment findings for approval",
      input_mode: "text",
      autonomy_level: 4,
      status: "prepared",
      source_system: "google_places",
      source_snapshot_at: new Date().toISOString(),
      requested_by: actorUserId,
      summary: { contacts: groups.size, findings: findings.length },
    }).select("id").single();
    if (runError) throw new Error(runError.message);

    const rows = [...groups.entries()].map(([key, group]) => {
      const first = group[0];
      const contactLabel = first.contacts?.business_name || first.contacts?.name || first.contact_id;
      return {
        run_id: run.id,
        contact_id: first.contact_id,
        action_type: "apply_contact_enrichment",
        // Customer-facing data correction — always an explicit approval.
        risk_level: 4,
        status: "pending_approval",
        title: `Update ${group.length} field${group.length === 1 ? "" : "s"} on ${contactLabel}`,
        summary: `A public listing disagrees with ${group.map((f: any) => f.field).join(", ")} on this contact. Nothing has been changed.`,
        payload: {
          contactId: first.contact_id,
          contactLabel,
          source: first.source,
          sourceUrl: first.source_url,
          retrievedAt: first.retrieved_at,
          matchConfidence: Number(first.confidence),
          findings: group.map((f: any) => ({
            findingId: f.id,
            field: f.field,
            oldValue: f.old_value,
            newValue: f.new_value,
            confidence: Number(f.confidence),
          })),
        },
        idempotency_key: `enrich:${key}`,
      };
    });

    // Re-queuing the same attempt must not fail; the key is UNIQUE.
    const { data: inserted, error: insertError } = await db
      .from("copilot_actions")
      .upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true })
      .select("id");
    if (insertError) throw new Error(insertError.message);

    return {
      ok: true,
      runId: run.id,
      queued: inserted?.length ?? 0,
      contacts: groups.size,
      note: "Approval cards are now in this conversation. Nothing changes until the administrator approves each card.",
    };
  }

  if (name === "list_enrichment_findings") {
    const requested = Number(input.limit);
    const limit = Math.min(Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 15, 50);
    let query = db
      .from("contact_enrichment_findings")
      .select("id,contact_id,field,old_value,new_value,source_url,confidence,retrieved_at,contacts(name,business_name)")
      .eq("disposition", "pending_review")
      .order("created_at", { ascending: false })
      .limit(limit);
    const contactId = typeof input.contactId === "string" ? input.contactId.trim() : "";
    if (contactId) query = query.eq("contact_id", contactId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return {
      pendingReview: (data ?? []).map((row: any) => ({
        findingId: row.id,
        contactId: row.contact_id,
        contact: row.contacts?.business_name || row.contacts?.name || row.contact_id,
        field: row.field,
        currentValue: row.old_value,
        proposedValue: row.new_value,
        sourceUrl: row.source_url,
        confidence: row.confidence,
        retrievedAt: row.retrieved_at,
      })),
      note: "These need an administrator's approval. Offer to queue them as approval cards; do not describe them as already applied.",
    };
  }

  if (name !== "enrich_contact") throw new Error(`Unsupported enrichment tool: ${name}`);

  const contactId = typeof input.contactId === "string" ? input.contactId.trim() : "";
  if (!contactId) throw new Error("contactId is required");

  const apiKey = await resolvePlacesKey(db);
  if (!apiKey) {
    return { ok: false, error: "Google Places is not configured. An administrator can add a google_places credential under Leads → Settings." };
  }

  const { data: contact, error: contactError } = await db
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", contactId)
    .maybeSingle();
  if (contactError) throw new Error(contactError.message);
  if (!contact) return { ok: false, error: `No contact with id ${contactId}` };

  const result = await enrichContact(db, apiKey, contact as EnrichableContact, "copilot");

  return {
    ok: true,
    contactId: result.contactId,
    contact: result.contactLabel,
    outcome: result.outcome,
    matchConfidence: result.confidence,
    sourceUrl: result.sourceUrl,
    retrievedAt: result.retrievedAt,
    attemptId: result.attemptId,
    filled: result.applied.map((finding) => ({ field: finding.field, value: finding.newValue })),
    needsApproval: result.pendingReview.map((finding) => ({
      findingId: finding.id,
      field: finding.field,
      currentValue: finding.oldValue,
      proposedValue: finding.newValue,
      confidence: finding.confidence,
    })),
    detail: result.detail ?? null,
    note: result.pendingReview.length
      ? "Blank fields were filled. The listed conflicts were NOT written — offer to queue them for approval."
      : "Only blank fields were filled; nothing existing was overwritten.",
  };
};
