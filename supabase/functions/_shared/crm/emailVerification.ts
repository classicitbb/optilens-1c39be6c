// Pure helpers for CRM email verification. The provider call and the database
// writes live in the crm-email-verify edge function; the decisions live here so
// they can be unit-tested.

export type EmailCheckStatus = 'verified' | 'catch_all' | 'invalid' | 'unknown'

/**
 * Map a verifier's status word to ours. Anything unrecognised is 'unknown', never
 * 'verified', so a provider adding a status can only make us more cautious.
 * The word list follows Reoon's documented statuses; confirm against a real
 * response before the first send.
 */
export const mapVerifierStatus = (raw: string | null | undefined): EmailCheckStatus => {
  switch (String(raw ?? '').trim().toLowerCase()) {
    case 'safe':
    case 'valid':
      return 'verified'
    case 'catch_all':
    case 'catch-all':
      return 'catch_all'
    case 'invalid':
    case 'disabled':
    case 'disposable':
    case 'spamtrap':
      return 'invalid'
    default:
      return 'unknown'
  }
}

/** Whether a checked address may be emailed. Catch-alls are opt-in. */
export const isSendable = (status: EmailCheckStatus | null | undefined, allowCatchAll: boolean): boolean =>
  status === 'verified' || (status === 'catch_all' && allowCatchAll)

/** Addresses on a contact that have no check yet, or whose check is older than `maxAgeDays`. */
export const addressesNeedingCheck = (
  addresses: string[],
  checks: { email: string; checked_at: string }[],
  now: Date,
  maxAgeDays = 90,
): string[] => {
  const latest = new Map<string, number>()
  for (const c of checks) latest.set(c.email.toLowerCase(), new Date(c.checked_at).getTime())
  const cutoff = now.getTime() - maxAgeDays * 86_400_000
  return addresses.filter((a) => (latest.get(a.toLowerCase()) ?? 0) < cutoff)
}

/** Basic shape check, so obviously malformed text never costs a provider credit. */
export const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
