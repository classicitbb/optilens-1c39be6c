// Pure assembler for the hot-lead email ("dossier"). No I/O: callers gather the
// rows (see gather.ts) and pass them in, so every section and every
// missing-data case can be unit tested.

export const SALES_INQUIRY_TYPES = ['trade_account', 'price_list', 'auth_onboarding_interest'] as const
export type SalesInquiryType = (typeof SALES_INQUIRY_TYPES)[number]

export const isSalesInquiry = (type: string): type is SalesInquiryType =>
  (SALES_INQUIRY_TYPES as readonly string[]).includes(type)

/** Hours within which a hot lead should get a human reply (business hours). */
export const RESPOND_WITHIN_BUSINESS_HOURS = 4

const KIND_LABELS: Record<SalesInquiryType, string> = {
  trade_account: 'Trade account request',
  price_list: 'Price list request',
  auth_onboarding_interest: 'Portal signup',
}

export interface DossierContact {
  id: string
  name: string | null
  businessName: string | null
  stage: string | null
  pipeline: string | null
  isCustomer: boolean
  website: string | null
  city: string | null
  country: string | null
  googleRating: number | null
  googleReviewsCount: number | null
  leadScore: number | null
  salesperson: string | null
  leadSource: string | null
}

export interface DossierInput {
  inquiry: {
    id: string
    type: SalesInquiryType
    name: string
    email: string
    phone: string
    businessName: string
    message: string
    notes: string
    pageSlug: string
    sourceChannel: string
    submittedAt: string
  }
  contact: DossierContact | null
  contactWasCreated: boolean
  history: {
    priorInquiries: number
    ticketsOnFile: number
    lastOutreachAt: string | null
  }
  ticket: { id: string; number: string } | null
  adminBaseUrl: string
}

export interface DossierRow { label: string; value: string }
export interface DossierAction { label: string; href: string }

export interface Dossier {
  subject: string
  preview: string
  kindLabel: string
  headline: string
  respondBy: string
  respondByLabel: string
  told: DossierRow[]
  fit: DossierRow[]
  history: DossierRow[]
  nextMove: { action: string; reason: string }
  contactActions: DossierAction[]
  adminActions: DossierAction[]
  message: string
}

/** "Key: value" lines (trade form) or a JSON object (portal signup). */
export const parseInquiryNotes = (notes: string): Record<string, string> => {
  const out: Record<string, string> = {}
  const trimmed = notes.trim()
  if (!trimmed) return out
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      for (const [key, value] of Object.entries(parsed)) {
        if (value === null || value === undefined || typeof value === 'object') continue
        const text = String(value).trim()
        if (text) out[key.toLowerCase()] = text
      }
      return out
    } catch { /* fall through to line parsing */ }
  }
  for (const line of trimmed.split('\n')) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_')
    const value = line.slice(idx + 1).trim()
    if (key && value) out[key] = value
  }
  return out
}

const BARBADOS_OFFSET_HOURS = -4 // America/Barbados, no daylight saving
const DAY_START_HOUR = 9
const DAY_END_HOUR = 17

/**
 * Add business hours (Mon-Fri 09:00-17:00 Barbados time) to an instant.
 * Pure arithmetic on a shifted clock so it does not depend on the host zone.
 */
export const addBusinessHours = (startIso: string, hours: number): Date => {
  const shiftMs = BARBADOS_OFFSET_HOURS * 3600_000
  let local = new Date(new Date(startIso).getTime() + shiftMs) // UTC fields now read as Barbados local
  let remaining = hours * 60 // minutes

  const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6
  const startOfDay = (d: Date, hour: number) => {
    const copy = new Date(d)
    copy.setUTCHours(hour, 0, 0, 0)
    return copy
  }
  const nextBusinessMorning = (d: Date) => {
    let copy = startOfDay(d, DAY_START_HOUR)
    if (copy.getTime() <= d.getTime()) copy = new Date(copy.getTime() + 86400_000)
    while (isWeekend(copy)) copy = new Date(copy.getTime() + 86400_000)
    return copy
  }

  // Move into working time first.
  if (isWeekend(local) || local.getUTCHours() >= DAY_END_HOUR) local = nextBusinessMorning(local)
  else if (local.getUTCHours() < DAY_START_HOUR) local = startOfDay(local, DAY_START_HOUR)

  while (remaining > 0) {
    const endOfDay = startOfDay(local, DAY_END_HOUR)
    const availableMin = Math.round((endOfDay.getTime() - local.getTime()) / 60000)
    if (remaining <= availableMin) {
      local = new Date(local.getTime() + remaining * 60000)
      remaining = 0
    } else {
      remaining -= availableMin
      local = nextBusinessMorning(endOfDay)
    }
  }
  return new Date(local.getTime() - shiftMs)
}

const formatBarbados = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Barbados',
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)

const digitsOnly = (value: string) => value.replace(/\D+/g, '')

/** WhatsApp link only when the number carries its own country code; never guess one. */
export const whatsappHref = (phone: string): string | null => {
  const trimmed = phone.trim()
  const digits = digitsOnly(trimmed)
  if (digits.length < 10 || digits.length > 15) return null
  const hasCountryCode = trimmed.startsWith('+') || trimmed.startsWith('00') || (digits.length === 11 && digits.startsWith('1'))
  return hasCountryCode ? `https://wa.me/${digits.replace(/^00/, '')}` : null
}

const place = (contact: DossierContact | null): string =>
  [contact?.city, contact?.country].filter((part) => part && part.trim()).join(', ')

const row = (rows: DossierRow[], label: string, value: string | null | undefined) => {
  if (value && value.trim()) rows.push({ label, value: value.trim() })
}

const daysSince = (iso: string, nowIso: string): number =>
  Math.max(0, Math.floor((new Date(nowIso).getTime() - new Date(iso).getTime()) / 86400_000))

export const buildDossier = (input: DossierInput): Dossier => {
  const { inquiry, contact, history, ticket } = input
  const kindLabel = KIND_LABELS[inquiry.type]
  const business = inquiry.businessName || contact?.businessName || ''
  const who = business || inquiry.name
  const city = contact?.city?.trim()
  const notes = parseInquiryNotes(inquiry.notes)
  const repeat = history.priorInquiries > 0
  const isCustomer = Boolean(contact?.isCustomer)

  const respondDate = addBusinessHours(inquiry.submittedAt, RESPOND_WITHIN_BUSINESS_HOURS)

  // What they told us
  const told: DossierRow[] = []
  row(told, 'Contact', inquiry.name)
  row(told, 'Business', business)
  row(told, 'Business type', notes.business_type)
  row(told, 'Monthly volume', notes.monthly_volume)
  row(told, 'Website', notes.website || contact?.website || '')
  row(told, 'Country', notes.country)
  row(told, 'Trade / tax ID', notes.tax_id)
  row(told, 'Came from', inquiry.pageSlug === '/' ? inquiry.sourceChannel : `${inquiry.pageSlug} (${inquiry.sourceChannel})`)
  const extra = notes.notes
  if (extra) row(told, 'Their notes', extra)

  // Fit
  const fit: DossierRow[] = []
  if (contact) {
    row(fit, 'Customer?', isCustomer ? 'Yes, existing customer' : 'Not yet')
    row(fit, 'Location', place(contact))
    if (contact.googleRating !== null) {
      row(fit, 'Google rating', `${contact.googleRating.toFixed(1)}${contact.googleReviewsCount ? ` (${contact.googleReviewsCount} reviews)` : ''}`)
    }
    if (contact.leadScore) row(fit, 'Lead score', String(contact.leadScore))
    row(fit, 'Salesperson', contact.salesperson)
  } else {
    row(fit, 'CRM', 'No matching contact (could not create one)')
  }

  // History
  const hist: DossierRow[] = []
  if (contact) {
    row(hist, 'CRM record', input.contactWasCreated ? 'Created just now from this request' : `Existing${contact.stage ? `, stage: ${contact.stage}` : ''}${contact.pipeline ? ` (${contact.pipeline})` : ''}`)
    row(hist, 'Lead source', contact.leadSource)
  }
  row(hist, 'Earlier requests', repeat ? `${history.priorInquiries} before this one` : 'First request')
  if (history.ticketsOnFile > 0) row(hist, 'Tickets on file', String(history.ticketsOnFile))
  if (history.lastOutreachAt) row(hist, 'Last outreach sent', `${daysSince(history.lastOutreachAt, inquiry.submittedAt)} days ago`)

  // Next move: deterministic rules; never promises prices, discounts or dates.
  let nextMove: Dossier['nextMove']
  if (isCustomer) {
    nextMove = {
      action: 'Reply from their account manager and check recent orders and tickets.',
      reason: 'They are already a customer, so this is service, not acquisition.',
    }
  } else if (inquiry.type === 'auth_onboarding_interest') {
    nextMove = {
      action: `Check the trade ID${notes.tax_id ? ` (${notes.tax_id})` : ''} and approve the portal account.`,
      reason: 'They finished signup and are waiting for approval.',
    }
  } else if (inquiry.type === 'trade_account') {
    nextMove = {
      action: 'Review the details, approve the account, then send the welcome kit from their rep.',
      reason: 'They asked for a trade account.',
    }
  } else {
    nextMove = {
      action: 'Confirm they are an eligible trade buyer, then send the price list.',
      reason: 'They asked for wholesale pricing.',
    }
  }
  if (repeat) nextMove.reason += ` This is request number ${history.priorInquiries + 1}, so reply today.`

  // Actions
  const base = input.adminBaseUrl.replace(/\/+$/, '')
  const contactActions: DossierAction[] = [
    { label: 'Reply by email', href: `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${kindLabel} - Classic Visions`)}` },
  ]
  const wa = inquiry.phone ? whatsappHref(inquiry.phone) : null
  if (wa) contactActions.push({ label: 'WhatsApp', href: wa })
  if (inquiry.phone) contactActions.push({ label: `Call ${inquiry.phone}`, href: `tel:${inquiry.phone.replace(/[^\d+]/g, '')}` })

  const adminActions: DossierAction[] = []
  if (contact) adminActions.push({ label: 'Open CRM contact', href: `${base}/admin/crm/contacts?contact=${encodeURIComponent(contact.id)}` })
  if (ticket) adminActions.push({ label: `Open ticket ${ticket.number}`, href: `${base}/admin/helpdesk/tickets?ticket=${encodeURIComponent(ticket.id)}` })
  if (!isCustomer && (inquiry.type === 'trade_account' || inquiry.type === 'auth_onboarding_interest')) {
    adminActions.push({ label: 'Review pending approvals', href: `${base}/admin/website/portals?status=pending_approval` })
  }

  const headline = `${who}${city ? ` (${city})` : ''}`
  return {
    subject: `${repeat ? 'Repeat: ' : ''}${kindLabel}: ${headline}`,
    preview: `${kindLabel} from ${inquiry.name}. Reply by ${formatBarbados(respondDate)}.`,
    kindLabel,
    headline,
    respondBy: respondDate.toISOString(),
    respondByLabel: `${formatBarbados(respondDate)} (Barbados time)`,
    told,
    fit,
    history: hist,
    nextMove,
    contactActions,
    adminActions,
    message: inquiry.message,
  }
}
