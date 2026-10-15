// `contacts.email` is a normalized text list ("a@x.com, b@x.com"); the CRM
// editor accepts , ; : and newlines as separators (see src/lib/contactEmails.ts).

const SEPARATORS = /[,;:\n]+/

export function parseEmailList(value: string | null | undefined): string[] {
  const unique = new Map<string, string>()
  for (const part of String(value ?? '').split(SEPARATORS)) {
    const email = part.trim()
    if (email && !unique.has(email.toLowerCase())) unique.set(email.toLowerCase(), email)
  }
  return [...unique.values()]
}

/**
 * Swap one address for another inside a contact's email list, keeping its
 * position (the first address is the primary). Returns null when `from` is not
 * in the list, so callers can tell a match from a no-op.
 */
export function replaceEmailInList(value: string | null | undefined, from: string, to: string): string | null {
  const target = from.trim().toLowerCase()
  const emails = parseEmailList(value)
  if (!emails.some((email) => email.toLowerCase() === target)) return null
  const replaced = emails.map((email) => (email.toLowerCase() === target ? to.trim() : email))
  // Re-dedupe: the corrected address may already be on the contact.
  return parseEmailList(replaced.join(',')).join(', ')
}
