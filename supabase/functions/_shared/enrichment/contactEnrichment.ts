// The one place that decides what public-web data may touch a CRM contact.
//
// Called by both the scheduled crm-enrich-contacts function and the Copilot's
// enrich_contact tool, so a manual enrichment and a nightly one obey identical
// rules — the same "one registry, two surfaces" seam as adminResources.ts.
//
// Policy:
//   * blank field  -> written silently, with provenance recorded
//   * non-blank    -> never written; recorded as pending_review for approval
//   * low confidence -> never written silently, even into a blank
//
// Two facts about this schema drive the field table below:
//   1. preserve_populated_crm_fields_on_innovations_sync reverts service-role
//      overwrites of admin-entered values. Blank-fill passes it; approved
//      corrections go through apply_contact_enrichment, which opts out.
//   2. contacts.country is NOT NULL DEFAULT 'Barbados', so it is never blank.
//      Blank-fill can never correct it — country always goes to approval.

import { fetchPlaceDetails, findPlaceForContact, type PlaceDetails } from "./googlePlaceDetails.ts";

export type EnrichableContact = {
  id: string;
  name: string | null;
  business_name: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  country_code: string | null;
  website: string | null;
  phone: string | null;
  google_place_id: string | null;
};

export type TriggerSource = "scheduled" | "manual" | "oncreate" | "copilot";

export type EnrichmentFinding = {
  id?: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  confidence: number;
  disposition: "applied" | "pending_review" | "unchanged";
};

export type EnrichmentResult = {
  contactId: string;
  contactLabel: string;
  outcome: "matched" | "no_match" | "ambiguous" | "error" | "skipped";
  placeId: string | null;
  confidence: number | null;
  sourceUrl: string | null;
  retrievedAt: string;
  attemptId: string | null;
  applied: EnrichmentFinding[];
  pendingReview: EnrichmentFinding[];
  detail?: string;
};

/** Below this, a value is never written without an administrator seeing it. */
const SILENT_APPLY_MIN_CONFIDENCE = 0.7;

const blank = (value: string | null | undefined) => !value || !value.trim();
const label = (contact: EnrichableContact) =>
  (contact.business_name ?? "").trim() || (contact.name ?? "").trim() || contact.id;

/**
 * Fields we are willing to source from a public listing.
 *
 * `alwaysReview` marks values that must never be written silently regardless of
 * how blank they look. `providerOwned` marks provider telemetry (rating, review
 * count, the place id itself) which is not admin-entered fact, so refreshing it
 * over an old value needs no approval.
 */
const FIELD_POLICY: {
  field: string;
  read: (details: PlaceDetails) => string | null;
  current: (contact: EnrichableContact) => string | null;
  alwaysReview?: boolean;
  providerOwned?: boolean;
}[] = [
  { field: "google_place_id", read: (d) => d.placeId, current: (c) => c.google_place_id, providerOwned: true },
  { field: "google_rating", read: (d) => (d.rating === null ? null : String(d.rating)), current: () => null, providerOwned: true },
  { field: "google_reviews_count", read: (d) => (d.reviewsCount === null ? null : String(d.reviewsCount)), current: () => null, providerOwned: true },
  { field: "website", read: (d) => d.website, current: (c) => c.website },
  { field: "phone", read: (d) => d.phone, current: (c) => c.phone },
  { field: "street", read: (d) => d.street, current: (c) => c.street },
  { field: "city", read: (d) => d.city, current: (c) => c.city },
  { field: "state", read: (d) => d.state, current: (c) => c.state },
  { field: "zip", read: (d) => d.zip, current: (c) => c.zip },
  // Never blank (NOT NULL DEFAULT 'Barbados'), and wrong on many rows.
  { field: "country", read: (d) => d.countryName, current: (c) => c.country, alwaysReview: true },
  { field: "country_code", read: (d) => d.countryCode, current: (c) => c.country_code },
];

/**
 * The query we send to Places. Country is included only when country_code is
 * set — `contacts.country` defaults to 'Barbados' for every row, and feeding a
 * wrong default country into the search is how you get a confident mismatch.
 */
export const buildPlaceQuery = (contact: EnrichableContact) => {
  const parts = [label(contact)];
  if (!blank(contact.city)) parts.push(contact.city!.trim());
  if (!blank(contact.country_code) && !blank(contact.country)) parts.push(contact.country!.trim());
  return parts.join(" ");
};

const readCountryCodeFinding = (
  contact: EnrichableContact,
  details: PlaceDetails,
): "skip" | "ok" => {
  // Filling country_code from a listing whose country disagrees with the stored
  // country would entrench the wrong country instead of correcting it.
  if (blank(contact.country) || blank(details.countryName)) return "ok";
  return contact.country!.trim().toLowerCase() === details.countryName!.trim().toLowerCase() ? "ok" : "skip";
};

export const enrichContact = async (
  db: any,
  apiKey: string,
  contact: EnrichableContact,
  triggerSource: TriggerSource,
  options: { batchId?: string | null; dryRun?: boolean } = {},
): Promise<EnrichmentResult> => {
  const retrievedAt = new Date().toISOString();
  const base: EnrichmentResult = {
    contactId: contact.id,
    contactLabel: label(contact),
    outcome: "error",
    placeId: null,
    confidence: null,
    sourceUrl: null,
    retrievedAt,
    attemptId: null,
    applied: [],
    pendingReview: [],
  };

  const recordAttempt = async (patch: Partial<EnrichmentResult> & { error?: string }) => {
    const { data, error } = await db.from("contact_enrichment_attempts").insert({
      contact_id: contact.id,
      batch_id: options.batchId ?? null,
      trigger_source: triggerSource,
      provider: "google_places",
      outcome: patch.outcome ?? "error",
      place_id: patch.placeId ?? null,
      match_confidence: patch.confidence ?? null,
      error: patch.error ?? null,
      attempted_at: retrievedAt,
    }).select("id").single();
    if (error) throw error;
    return data.id as string;
  };

  let match;
  try {
    match = await findPlaceForContact(apiKey, buildPlaceQuery(contact));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "lookup failed";
    return { ...base, outcome: "error", detail, attemptId: await recordAttempt({ outcome: "error", error: detail }) };
  }

  if (match.kind === "no_match") {
    return { ...base, outcome: "no_match", detail: match.reason, attemptId: await recordAttempt({ outcome: "no_match" }) };
  }
  if (match.kind === "ambiguous") {
    const detail = `Several possible matches: ${match.candidates.join("; ")}`;
    return { ...base, outcome: "ambiguous", detail, attemptId: await recordAttempt({ outcome: "ambiguous", error: detail }) };
  }

  let details: PlaceDetails;
  try {
    details = await fetchPlaceDetails(apiKey, match.placeId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "details lookup failed";
    return { ...base, outcome: "error", detail, placeId: match.placeId, attemptId: await recordAttempt({ outcome: "error", placeId: match.placeId, error: detail }) };
  }

  // Name similarity carries most of the signal; a city that shows up in the
  // formatted address is corroboration, not proof.
  const cityCorroborates = !blank(contact.city)
    && (details.formattedAddress ?? "").toLowerCase().includes(contact.city!.trim().toLowerCase());
  const confidence = Number((0.6 * match.similarity + 0.4 * (cityCorroborates ? 1 : 0.5)).toFixed(2));

  const attemptId = await recordAttempt({ outcome: "matched", placeId: match.placeId, confidence });

  const applied: EnrichmentFinding[] = [];
  const pendingReview: EnrichmentFinding[] = [];
  const rows: Record<string, unknown>[] = [];

  for (const policy of FIELD_POLICY) {
    const proposed = policy.read(details);
    if (blank(proposed)) continue;
    if (policy.field === "country_code" && readCountryCodeFinding(contact, details) === "skip") continue;

    const current = policy.current(contact);
    if (!blank(current) && current!.trim() === proposed!.trim()) continue;

    const isBlankFill = blank(current);
    const silent = policy.providerOwned
      // Provider telemetry is not admin-entered fact, so refreshing it is safe.
      ? true
      : isBlankFill && !policy.alwaysReview && confidence >= SILENT_APPLY_MIN_CONFIDENCE;

    const disposition: EnrichmentFinding["disposition"] = options.dryRun
      ? "unchanged"
      : silent
      ? "applied"
      : "pending_review";

    const finding: EnrichmentFinding = {
      field: policy.field,
      oldValue: current,
      newValue: proposed!,
      confidence,
      disposition,
    };
    rows.push({
      contact_id: contact.id,
      attempt_id: attemptId,
      field: policy.field,
      old_value: current,
      new_value: proposed,
      source: "google_places",
      source_url: details.mapsUrl,
      confidence,
      retrieved_at: retrievedAt,
      // Silent fills are inserted as pending_review and flipped to applied by
      // apply_contact_enrichment, so that RPC stays the only write path.
      disposition: options.dryRun ? "unchanged" : "pending_review",
    });
    (disposition === "applied" ? applied : pendingReview).push(finding);
  }

  if (rows.length) {
    const { data: inserted, error } = await db.from("contact_enrichment_findings").insert(rows).select("id,field");
    if (error) throw error;
    const idByField = new Map<string, string>((inserted ?? []).map((row: { id: string; field: string }) => [row.field, row.id]));
    for (const finding of [...applied, ...pendingReview]) finding.id = idByField.get(finding.field);
  }

  if (applied.length && !options.dryRun) {
    const ids = applied.map((finding) => finding.id).filter(Boolean);
    const { error } = await db.rpc("apply_contact_enrichment", { p_contact_id: contact.id, p_finding_ids: ids });
    if (error) throw error;
  }

  return {
    ...base,
    outcome: "matched",
    placeId: match.placeId,
    confidence,
    sourceUrl: details.mapsUrl,
    attemptId,
    applied,
    pendingReview,
  };
};
