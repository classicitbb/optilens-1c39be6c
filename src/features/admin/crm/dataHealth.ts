/**
 * Finds contact records that look wrong and recommends a fix. Pure functions over
 * a contact list so they can be tested without a database. Nothing here writes.
 *
 * Companies and people are different records on purpose (a person row points at its
 * company with parent_id), so a company and its person sharing an email or business
 * name is NOT a duplicate. Duplicates are same-kind records for the same thing.
 */

export interface DataHealthContact {
  id: string;
  name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  is_company: boolean | null;
  parent_id: string | null;
  linked_customer_id: number | null;
  innovations_parent_customer_id: number | null;
  pipeline: string | null;
  stage: string | null;
  notes: string | null;
  created_at: string;
}

export type FindingKind = "duplicate_company" | "duplicate_person" | "unlinked_person" | "email_format";

export interface Finding {
  /** Stable across reloads, so a dismissal survives. */
  key: string;
  kind: FindingKind;
  /** Records involved. For duplicates the first is the recommended survivor. */
  contacts: DataHealthContact[];
  /** unlinked_person only: the company to attach to. */
  company?: DataHealthContact;
  detail: string;
}

const LEGAL = new Set(["ltd", "limited", "inc", "incorporated", "llc", "co", "company", "corp", "corporation", "srl", "sa", "the"]);

export const normName = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/\(#?\d+\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim()
    .split(" ").filter((t) => t && !LEGAL.has(t)).join("");

const normEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** Higher = better survivor. The ERP-synced, classified, richer record wins. */
export const survivorScore = (c: DataHealthContact): number =>
  (c.linked_customer_id != null ? 4 : 0) +
  (c.innovations_parent_customer_id != null ? 2 : 0) +
  (/imported innovations/i.test(c.notes ?? "") ? 4 : 0) +
  (c.stage ? 2 : 0) +
  (c.business_name ? 1 : 0) +
  (normEmail(c.email) ? 1 : 0) +
  (c.phone?.trim() ? 1 : 0);

const bySurvivor = (a: DataHealthContact, b: DataHealthContact) =>
  survivorScore(b) - survivorScore(a) || a.created_at.localeCompare(b.created_at);

function groupBy<T>(items: T[], key: (item: T) => string): T[][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

/** Merge overlapping groups so one record never appears in two findings. */
function unionGroups(groups: DataHealthContact[][]): DataHealthContact[][] {
  const result: Set<string>[] = [];
  const byId = new Map<string, DataHealthContact>();
  for (const group of groups) {
    group.forEach((c) => byId.set(c.id, c));
    const ids = new Set(group.map((c) => c.id));
    const overlapping = result.filter((existing) => [...ids].some((id) => existing.has(id)));
    for (const o of overlapping) {
      o.forEach((id) => ids.add(id));
      result.splice(result.indexOf(o), 1);
    }
    result.push(ids);
  }
  return result.map((ids) => [...ids].map((id) => byId.get(id)!).sort(bySurvivor));
}

const BAD_EMAIL = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

export function findDataHealthIssues(contacts: DataHealthContact[]): Finding[] {
  const findings: Finding[] = [];
  const companies = contacts.filter((c) => c.is_company);
  const people = contacts.filter((c) => !c.is_company);

  for (const group of unionGroups(groupBy(companies, (c) => normName(c.name)))) {
    findings.push({
      key: `dc:${group.map((c) => c.id).sort().join(",")}`,
      kind: "duplicate_company",
      contacts: group,
      detail: `${group.length} company records with the same name`,
    });
  }

  const companyKey = (c: DataHealthContact) => c.parent_id ?? `b:${normName(c.business_name)}`;
  const personGroups = [
    ...groupBy(people, (c) => (normName(c.name) ? `${normName(c.name)}|${companyKey(c)}` : "")),
    ...groupBy(people, (c) => (normName(c.name) && normEmail(c.email) ? `${normName(c.name)}|${normEmail(c.email)}` : "")),
  ];
  for (const group of unionGroups(personGroups)) {
    findings.push({
      key: `dp:${group.map((c) => c.id).sort().join(",")}`,
      kind: "duplicate_person",
      contacts: group,
      detail: `${group.length} records for the same person`,
    });
  }

  const companiesByName = new Map<string, DataHealthContact[]>();
  for (const c of companies) {
    const k = normName(c.name);
    if (k) companiesByName.set(k, [...(companiesByName.get(k) ?? []), c]);
  }
  for (const person of people) {
    if (person.parent_id) continue;
    const matches = companiesByName.get(normName(person.business_name)) ?? [];
    if (matches.length !== 1) continue; // none, or ambiguous (resolve the duplicate company first)
    findings.push({
      key: `up:${person.id}`,
      kind: "unlinked_person",
      contacts: [person],
      company: matches[0],
      detail: `Works at "${person.business_name}" but is not linked to that company`,
    });
  }

  for (const c of contacts) {
    const email = (c.email ?? "").trim();
    if (!email) continue;
    const multi = /[,;\s]/.test(email);
    if (multi || !BAD_EMAIL.test(email)) {
      findings.push({
        key: `ef:${c.id}`,
        kind: "email_format",
        contacts: [c],
        detail: multi ? "More than one address in the email field" : "Email address looks invalid",
      });
    }
  }

  return findings;
}
