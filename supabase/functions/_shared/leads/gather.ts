// Thin I/O around the lead dossier and CRM matching. Every lookup degrades to
// "unknown" instead of throwing: a failed lookup must never stop the owner from
// being told about a new lead.

import { likePatternFor, pickContactMatch } from '../crm/contactEmailMatch.ts'
import type { DossierContact } from './dossier.ts'

// deno-lint-ignore no-explicit-any
type Db = any

const CONTACT_COLUMNS =
  'id,name,business_name,email,stage,pipeline,is_customer,is_archived,updated_at,website,city,country,google_rating,google_reviews_count,lead_score,salesperson,lead_source'

export interface ContactMatch {
  contact: DossierContact | null
  created: boolean
}

// deno-lint-ignore no-explicit-any
const toDossierContact = (row: any): DossierContact => ({
  id: row.id,
  name: row.name ?? null,
  businessName: row.business_name ?? null,
  stage: row.stage ?? null,
  pipeline: row.pipeline ?? null,
  isCustomer: Boolean(row.is_customer),
  website: row.website ?? null,
  city: row.city ?? null,
  country: row.country ?? null,
  googleRating: row.google_rating ?? null,
  googleReviewsCount: row.google_reviews_count ?? null,
  leadScore: row.lead_score ?? null,
  salesperson: row.salesperson ?? null,
  leadSource: row.lead_source ?? null,
})

/** Find the contact for an email, list-aware. Returns null on no match or error. */
export const findContactByEmail = async (db: Db, email: string) => {
  try {
    const { data, error } = await db
      .from('contacts')
      .select(CONTACT_COLUMNS)
      .ilike('email', likePatternFor(email))
      .limit(25)
    if (error) throw error
    return pickContactMatch(data ?? [], email)
  } catch (error) {
    console.error('Contact lookup failed (non-fatal)', error instanceof Error ? error.message : error)
    return null
  }
}

export interface SalesLeadInput {
  name: string
  email: string
  phone: string | null
  businessName: string | null
  inquiryType: string
}

/**
 * Match or create the CRM contact for a sales inquiry. Never throws.
 * An established customer keeps their lifecycle; a contact with no pipeline yet
 * is linked unchanged; unknown senders become new qualifying leads.
 */
export const matchOrCreateSalesContact = async (db: Db, lead: SalesLeadInput): Promise<ContactMatch> => {
  try {
    const existing = await findContactByEmail(db, lead.email)
    const now = new Date().toISOString()
    if (existing) {
      // An unauthenticated submission must never change an existing contact's
      // pipeline or stage; staff advance existing contacts from the CRM.
      return { contact: toDossierContact(existing), created: false }
    }

    const { data: lead_row, error } = await db
      .from('contacts')
      .insert({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        business_name: lead.businessName || null,
        type: 'individual',
        status: 'lead',
        pipeline_stage: 'Qualified',
        pipeline: 'opticals',
        stage: 'qualifying',
        stage_entered_at: now,
        is_customer: false,
        lead_source: `website:${lead.inquiryType}`,
      })
      .select(CONTACT_COLUMNS)
      .single()
    if (error) throw error
    return { contact: toDossierContact(lead_row), created: true }
  } catch (error) {
    console.error('Sales contact match/create failed (non-fatal)', error instanceof Error ? error.message : error)
    return { contact: null, created: false }
  }
}

export interface LeadHistory {
  priorInquiries: number
  ticketsOnFile: number
  lastOutreachAt: string | null
}

export const gatherLeadHistory = async (
  db: Db,
  args: { email: string; contactId: string | null; inquiryId: string; ticketId: string | null },
): Promise<LeadHistory> => {
  const history: LeadHistory = { priorInquiries: 0, ticketsOnFile: 0, lastOutreachAt: null }
  try {
    const { count } = await db
      .from('public_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('email', args.email)
      .neq('id', args.inquiryId)
    history.priorInquiries = count ?? 0
  } catch (error) {
    console.error('Prior inquiry count failed (non-fatal)', error instanceof Error ? error.message : error)
  }
  if (args.contactId) {
    try {
      let query = db
        .from('helpdesk_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('partner_contact_id', args.contactId)
      if (args.ticketId) query = query.neq('id', args.ticketId)
      const { count } = await query
      history.ticketsOnFile = count ?? 0
    } catch (error) {
      console.error('Ticket count failed (non-fatal)', error instanceof Error ? error.message : error)
    }
    try {
      const { data } = await db
        .from('outreach_outbox')
        .select('sent_at')
        .eq('contact_id', args.contactId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
      history.lastOutreachAt = data?.[0]?.sent_at ?? null
    } catch (error) {
      console.error('Outreach lookup failed (non-fatal)', error instanceof Error ? error.message : error)
    }
  }
  return history
}
