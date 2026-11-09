// Deterministic quality gate for AI outreach drafts. Prompts are a floor, not a
// guarantee: every generated draft is checked here before it reaches the outbox,
// so a bad generation is flagged (or retried) instead of waiting for a human to
// notice. Pure and dependency-free so it can be unit-tested outside Deno.

export type OutreachChannel = 'email' | 'whatsapp'

/** Spam-filter and AI-tell phrases that should never appear in outreach. */
export const BANNED_PHRASES = [
  'act now', 'buy now', 'click here', 'limited time', 'limited offer',
  'exclusive deal', 'special offer', 'risk-free', 'no obligation', '100% free',
  'guaranteed results', 'congratulations',
  'i hope this finds you well', 'hope this email finds you well',
  'in today\'s fast-paced world', 'game-changer', 'game changer',
  'cutting-edge', 'revolutionize', 'unlock your', 'supercharge',
  'as an ai', 'i\'m an ai', 'as a language model',
] as const

const LIMITS = {
  email: { subject: 90, words: 140, links: 1 },
  whatsapp: { subject: 0, words: 60, links: 1 },
} as const

const MERGE_TAG = /\{\{\s*\w+\s*\}\}|\[\s*(?:name|company|business|first name)\s*\]/i
const URL = /https?:\/\/\S+/gi
const QUESTION_OR_ASK = /\?|\b(?:would you|could we|can we|can i|are you open|shall we|let me know|happy to)\b/i

export interface GateResult {
  ok: boolean
  reasons: string[]
}

export const wordCount = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0)

export const checkOutreachDraft = (
  draft: { subject?: string | null; body: string },
  channel: OutreachChannel,
): GateResult => {
  const limit = LIMITS[channel]
  const reasons: string[] = []
  const subject = (draft.subject ?? '').trim()
  const body = draft.body.trim()
  const haystack = `${subject}\n${body}`.toLowerCase()

  if (!body) reasons.push('Body is empty.')
  if (channel === 'email' && !subject) reasons.push('Email has no subject line.')
  if (subject.length > limit.subject && channel === 'email') reasons.push(`Subject is over ${limit.subject} characters.`)
  if (wordCount(body) > limit.words) reasons.push(`Body is over ${limit.words} words (${wordCount(body)}).`)

  const hits = BANNED_PHRASES.filter((phrase) => haystack.includes(phrase))
  if (hits.length) reasons.push(`Contains banned phrase: ${hits.join(', ')}.`)

  if (MERGE_TAG.test(`${subject}\n${body}`)) reasons.push('Contains an unfilled merge placeholder.')
  if ((body.match(URL) ?? []).length > limit.links) reasons.push('Contains more than one link.')
  if (body && !QUESTION_OR_ASK.test(body)) reasons.push('No clear ask or question for the reader.')
  if (/[—–]/.test(`${subject}${body}`)) reasons.push('Uses dashes as punctuation, a common AI tell.')
  if ((body.match(/!/g) ?? []).length > 1) reasons.push('Uses more than one exclamation mark.')

  return { ok: reasons.length === 0, reasons }
}
