/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Classic Visions'
interface ContactInquiryNotificationProps { inquiryType?: string; name?: string; email?: string; phone?: string; businessName?: string; message?: string; pageSlug?: string; sourceChannel?: string; submittedAt?: string; notes?: string; unsubscribeUrl?: string }

const ContactInquiryNotificationEmail = ({ inquiryType = 'contact', name = 'Unknown', email = '', phone = '', businessName = '', message = '', pageSlug = '/', sourceChannel = 'website', submittedAt = new Date().toISOString(), notes = '', unsubscribeUrl }: ContactInquiryNotificationProps) => (
  <ClassicVisionsEmailLayout preview={`New ${inquiryType === 'website-design-lead' ? 'website design lead' : 'contact inquiry'} from ${name}`} title={inquiryType === 'website-design-lead' ? 'New Website Design Lead' : 'New Contact Inquiry'} unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>A new inquiry has been received on {SITE_NAME}.</Text>
    <Section style={detailCard}><Text style={detailRow}><strong>Name:</strong> {name}</Text><Text style={detailRow}><strong>Email:</strong> {email}</Text><Text style={detailRow}><strong>Phone:</strong> {phone || 'Not provided'}</Text><Text style={detailRow}><strong>Business:</strong> {businessName || 'Not provided'}</Text><Text style={detailRow}><strong>Page:</strong> {pageSlug}</Text><Text style={detailRow}><strong>Channel:</strong> {sourceChannel}</Text><Text style={detailRow}><strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}</Text></Section>
    {notes ? <><Text style={sectionLabel}>Additional Notes</Text><Text style={messageText}>{notes}</Text></> : null}
    <Hr style={hr}/><Text style={sectionLabel}>Message</Text><Text style={messageText}>{message}</Text>
    <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
  </ClassicVisionsEmailLayout>
)

export const template = { component: ContactInquiryNotificationEmail, subject: (data: any) => `${data?.inquiryType === 'website-design-lead' ? 'Website design lead' : 'Website contact inquiry'} from ${data?.name ?? 'someone'}`, displayName: 'Contact Inquiry Notification', previewData: { inquiryType: 'contact', name: 'Jane Doe', email: 'jane@example.com', phone: '+1 555 123 4567', businessName: 'Doe Opticians', message: 'Hi, I would like to enquire about your lens products for my practice.', pageSlug: '/contact', sourceChannel: 'website', submittedAt: '2026-04-09T10:00:00Z' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const detailCard = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#3d4a57', lineHeight: '1.5', margin: '4px 0' }
const sectionLabel = { color: '#1A8A9C', fontSize: '12px', fontWeight: '700' as const, letterSpacing: '0.08em', margin: '0 0 8px', textTransform: 'uppercase' as const }
const messageText = { color: '#3d4a57', fontSize: '15px', lineHeight: '1.62', margin: '0 0 20px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#ece9e0', margin: '20px 0' }
const footer = { fontSize: '14px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
