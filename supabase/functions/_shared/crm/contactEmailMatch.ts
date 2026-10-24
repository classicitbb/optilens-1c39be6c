// Pure helpers for matching an inbound email address to a CRM contact.
//
// `contacts.email` is one text field that may hold a list ("a@x.com, b@x.com";
// see src/lib/contactEmails.ts). A plain `ilike` on the whole field misses
// secondary addresses, treats `_` as a wildcard, and `.maybeSingle()` throws
// when duplicate emails exist. Callers fetch a bounded candidate set with
// `likePatternFor` and then pick the real match here.

/** Escape LIKE metacharacters so an address is matched literally. */
export const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`)

/** `%addr%` pattern for a case-insensitive "list contains" candidate query. */
export const likePatternFor = (email: string): string => `%${escapeLikePattern(email.trim())}%`

export const parseEmailList = (value: string | null | undefined): string[] => {
  const unique = new Map<string, string>()
  for (const part of (value ?? '').split(/[,;:\n]+/)) {
    const email = part.trim().toLowerCase()
    if (email && !unique.has(email)) unique.set(email, email)
  }
  return [...unique.values()]
}

export const emailListIncludes = (list: string | null | undefined, email: string): boolean =>
  parseEmailList(list).includes(email.trim().toLowerCase())

export interface MatchableContact {
  id: string
  email: string | null
  is_customer?: boolean | null
  is_archived?: boolean | null
  updated_at?: string | null
}

/**
 * Choose the contact an inbound email belongs to. Exact list membership only;
 * archived contacts lose to live ones, customers win ties, then the most
 * recently updated. Returns null when nothing matches.
 */
export const pickContactMatch = <T extends MatchableContact>(rows: T[], email: string): T | null => {
  const matches = rows.filter((row) => emailListIncludes(row.email, email))
  if (matches.length === 0) return null
  const rank = (row: T) => (row.is_archived ? 0 : 2) + (row.is_customer ? 1 : 0)
  return [...matches].sort((a, b) => {
    const byRank = rank(b) - rank(a)
    if (byRank !== 0) return byRank
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
  })[0]
}
