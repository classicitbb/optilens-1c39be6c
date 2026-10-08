// Pure CRM matching for Lead Finder, free of Deno APIs so it can be unit tested.
//
// Rules, in order of trust:
//   1. A previously confirmed link for the same business identity (alias).
//   2. Exact normalised business name + same city.
//   3. Website host, only with supporting name/location evidence and only when
//      the host belongs to exactly one CRM record.
// Anything weaker (fuzzy names, shared domains, name-only) is a suggestion for
// the operator to confirm, never an automatic association.

export type CrmContact = {
  id: string;
  name: string | null;
  business_name: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  parent_id: string | null;
  is_customer: boolean | null;
  linked_customer_id: number | null;
  is_archived?: boolean | null;
};

export type CrmCustomerAccount = { id: number; name: string; contact_id: string | null };

export type ConfirmedLink = {
  identity_key: string;
  normalized_name: string;
  city: string | null;
  link_kind: "contact" | "customer_mark";
  contact_id: string | null;
};

export type LeadIdentityInput = {
  name: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
};

export type MatchBasis = "confirmed_link" | "name_location" | "website";

export type CrmMatch = {
  contactId: string;
  contactName: string;
  businessName: string | null;
  isCustomer: boolean;
  basis: MatchBasis;
  /** True when an operator confirmed this link; false for an automatic association. */
  confirmed: boolean;
  reason: string;
};

export type CrmSuggestion = {
  contactId: string;
  contactName: string;
  businessName: string | null;
  isCustomer: boolean;
  reason: string;
};

export type CrmAnnotation = {
  identityKey: string;
  normalizedName: string;
  /** "unavailable" when the CRM could not be read; saves must be blocked. */
  status: "matched" | "suggested" | "customer_marked" | "none" | "unavailable";
  match: CrmMatch | null;
  suggestions: CrmSuggestion[];
  isCurrentCustomer: boolean;
  customerSource: "crm_record" | "customer_account" | "manual_mark" | null;
};

const LEGAL_SUFFIXES = new Set([
  "ltd", "limited", "inc", "incorporated", "llc", "co", "company", "corp", "corporation", "srl", "sa", "the",
]);

const GENERIC_HOSTS = new Set([
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "yelp.com", "tripadvisor.com",
  "google.com", "wixsite.com", "wordpress.com", "business.site", "sites.google.com", "linktr.ee",
  "yellowpages.com", "youtube.com", "tiktok.com",
]);

const clean = (value: string | null | undefined) =>
  (value ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim();

export const normalizeBusinessName = (value: string | null | undefined): string =>
  clean(value).split(" ").filter((token) => token && !LEGAL_SUFFIXES.has(token)).join(" ");

export const normalizeCity = (value: string | null | undefined): string => clean(value);

export const websiteHost = (website: string | null | undefined): string | null => {
  if (!website) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
};

const isGenericHost = (host: string) =>
  [...GENERIC_HOSTS].some((generic) => host === generic || host.endsWith(`.${generic}`));

/** Stable across searches: same business, same key. */
export const buildIdentityKey = (lead: LeadIdentityInput): string => {
  const name = normalizeBusinessName(lead.name);
  const place = normalizeCity(lead.city) || normalizeCity(lead.country);
  return `name:${name}|${place}`;
};

const tokens = (normalized: string) => normalized.split(" ").filter((token) => token.length > 1);

/** Looser than equality: one name contains the other, or most tokens overlap. */
export const namesSimilar = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= 5 && (` ${longer} `).includes(` ${shorter} `)) return true;
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return false;
  let shared = 0;
  for (const token of ta) if (tb.has(token)) shared += 1;
  return shared / Math.max(ta.size, tb.size) >= 0.6 && shared >= 2;
};

type Entity = {
  contactId: string;
  displayName: string;
  businessName: string | null;
  names: string[];
  city: string;
  host: string | null;
  isCustomer: boolean;
  customerSource: "crm_record" | "customer_account" | null;
};

export type CrmIndex = {
  entities: Entity[];
  hostCounts: Map<string, number>;
  byId: Map<string, Entity>;
  customerOnly: Array<{ id: number; normalizedName: string }>;
};

/** Customer status from existing CRM fields: flag, linked account, parent company, or owning account. */
export function buildCrmIndex(contacts: CrmContact[], customers: CrmCustomerAccount[]): CrmIndex {
  const customerContactIds = new Set(customers.map((c) => c.contact_id).filter((id): id is string => !!id));
  const byContactId = new Map(contacts.map((c) => [c.id, c]));

  const isCustomerRecord = (contact: CrmContact) =>
    contact.is_customer === true || contact.linked_customer_id != null || customerContactIds.has(contact.id);

  const entities: Entity[] = [];
  for (const contact of contacts) {
    if (contact.is_archived) continue;
    const parent = contact.parent_id ? byContactId.get(contact.parent_id) : undefined;
    const isCustomer = isCustomerRecord(contact) || (parent ? isCustomerRecord(parent) : false);
    const names = [normalizeBusinessName(contact.business_name), normalizeBusinessName(contact.name)]
      .filter((name, i, all) => name && all.indexOf(name) === i);
    if (names.length === 0) continue;
    entities.push({
      contactId: contact.id,
      displayName: contact.name?.trim() || contact.business_name?.trim() || "(unnamed)",
      businessName: contact.business_name?.trim() || null,
      names,
      city: normalizeCity(contact.city),
      host: websiteHost(contact.website),
      isCustomer,
      customerSource: isCustomer ? "crm_record" : null,
    });
  }

  const hostCounts = new Map<string, number>();
  for (const entity of entities) {
    if (entity.host) hostCounts.set(entity.host, (hostCounts.get(entity.host) ?? 0) + 1);
  }

  const linkedContactIds = new Set(contacts.map((c) => c.id));
  const customerOnly = customers
    .filter((account) => !account.contact_id || !linkedContactIds.has(account.contact_id))
    .map((account) => ({ id: account.id, normalizedName: normalizeBusinessName(account.name) }))
    .filter((account) => account.normalizedName);

  return { entities, hostCounts, byId: new Map(entities.map((e) => [e.contactId, e])), customerOnly };
}

const toSuggestion = (entity: Entity, reason: string): CrmSuggestion => ({
  contactId: entity.contactId,
  contactName: entity.displayName,
  businessName: entity.businessName,
  isCustomer: entity.isCustomer,
  reason,
});

const MAX_SUGGESTIONS = 5;

export function annotateLead(
  lead: LeadIdentityInput,
  index: CrmIndex,
  links: ConfirmedLink[],
): CrmAnnotation {
  const normalizedName = normalizeBusinessName(lead.name);
  const city = normalizeCity(lead.city);
  const host = websiteHost(lead.website);
  const identityKey = buildIdentityKey(lead);

  const base = {
    identityKey,
    normalizedName,
    match: null as CrmMatch | null,
    suggestions: [] as CrmSuggestion[],
    isCurrentCustomer: false,
    customerSource: null as CrmAnnotation["customerSource"],
  };

  // 1. Operator-confirmed decision for this business, or for a confirmed alias of it.
  const confirmed = links.find((link) =>
    link.identity_key === identityKey ||
    (link.normalized_name === normalizedName && normalizedName && (link.city ?? "") === city)
  );
  if (confirmed?.link_kind === "customer_mark") {
    return { ...base, status: "customer_marked", isCurrentCustomer: true, customerSource: "manual_mark" };
  }
  if (confirmed?.link_kind === "contact" && confirmed.contact_id) {
    const entity = index.byId.get(confirmed.contact_id);
    if (entity) {
      return {
        ...base,
        status: "matched",
        match: {
          contactId: entity.contactId,
          contactName: entity.displayName,
          businessName: entity.businessName,
          isCustomer: entity.isCustomer,
          basis: "confirmed_link",
          confirmed: true,
          reason: "You linked this business to this contact earlier.",
        },
        isCurrentCustomer: entity.isCustomer,
        customerSource: entity.customerSource,
      };
    }
  }

  const nameHits = index.entities.filter((entity) => entity.names.includes(normalizedName) && normalizedName);
  const exactWithLocation = nameHits.filter((entity) => city && entity.city === city);

  // 2. Exact name + location, only when it points to a single record.
  if (exactWithLocation.length === 1) {
    const entity = exactWithLocation[0];
    return {
      ...base,
      status: "matched",
      match: {
        contactId: entity.contactId,
        contactName: entity.displayName,
        businessName: entity.businessName,
        isCustomer: entity.isCustomer,
        basis: "name_location",
        confirmed: false,
        reason: "Same business name in the same city.",
      },
      isCurrentCustomer: entity.isCustomer,
      customerSource: entity.customerSource,
    };
  }

  const suggestions = new Map<string, CrmSuggestion>();
  const suggest = (entity: Entity, reason: string) => {
    if (!suggestions.has(entity.contactId)) suggestions.set(entity.contactId, toSuggestion(entity, reason));
  };

  // 3. Website host: needs supporting evidence and an unshared host to be automatic.
  if (host && !isGenericHost(host)) {
    const hostHits = index.entities.filter((entity) => entity.host === host);
    const supported = hostHits.filter((entity) =>
      entity.names.some((name) => name === normalizedName) ||
      (city && entity.city === city && entity.names.some((name) => namesSimilar(name, normalizedName)))
    );
    if (hostHits.length === 1 && supported.length === 1 && (index.hostCounts.get(host) ?? 0) === 1) {
      const entity = supported[0];
      return {
        ...base,
        status: "matched",
        match: {
          contactId: entity.contactId,
          contactName: entity.displayName,
          businessName: entity.businessName,
          isCustomer: entity.isCustomer,
          basis: "website",
          confirmed: false,
          reason: `Website ${host} matches, and the name or location agrees.`,
        },
        isCurrentCustomer: entity.isCustomer,
        customerSource: entity.customerSource,
      };
    }
    for (const entity of hostHits) {
      suggest(
        entity,
        (index.hostCounts.get(host) ?? 0) > 1
          ? `Shares website ${host} with other CRM records.`
          : `Same website (${host}), but the name does not clearly match.`,
      );
    }
  }

  for (const entity of nameHits) {
    suggest(entity, city && entity.city && entity.city !== city
      ? "Same business name, different city."
      : exactWithLocation.length > 1
        ? "Same name and city as several CRM records."
        : "Same business name; location is missing or unconfirmed.");
  }
  for (const entity of index.entities) {
    if (suggestions.has(entity.contactId)) continue;
    if (entity.names.some((name) => namesSimilar(name, normalizedName))) {
      suggest(entity, city && entity.city === city ? "Similar name in the same city." : "Similar business name.");
    }
  }

  // A customer account with no CRM contact still marks the business as a customer.
  const accountHit = index.customerOnly.find((account) => account.normalizedName === normalizedName);
  const list = [...suggestions.values()].slice(0, MAX_SUGGESTIONS);
  if (accountHit) {
    return {
      ...base,
      status: "customer_marked",
      suggestions: list,
      isCurrentCustomer: true,
      customerSource: "customer_account",
    };
  }

  return { ...base, status: list.length > 0 ? "suggested" : "none", suggestions: list };
}

/** Annotates every lead, then removes current customers before any result limit is applied. */
export function applyCrmMatching<T extends LeadIdentityInput>(
  leads: T[],
  index: CrmIndex,
  links: ConfirmedLink[],
  options: { showCurrentCustomers: boolean },
): { leads: Array<T & { crm: CrmAnnotation }>; excludedCustomerCount: number; totalMatched: number } {
  const annotated = leads.map((lead) => ({ ...lead, crm: annotateLead(lead, index, links) }));
  const customers = annotated.filter((lead) => lead.crm.isCurrentCustomer);
  return {
    leads: options.showCurrentCustomers ? annotated : annotated.filter((lead) => !lead.crm.isCurrentCustomer),
    excludedCustomerCount: options.showCurrentCustomers ? 0 : customers.length,
    totalMatched: annotated.length,
  };
}

/** Annotation used when the CRM could not be read; never excludes, never allows saves. */
export function unavailableAnnotation(lead: LeadIdentityInput): CrmAnnotation {
  return {
    identityKey: buildIdentityKey(lead),
    normalizedName: normalizeBusinessName(lead.name),
    status: "unavailable",
    match: null,
    suggestions: [],
    isCurrentCustomer: false,
    customerSource: null,
  };
}
