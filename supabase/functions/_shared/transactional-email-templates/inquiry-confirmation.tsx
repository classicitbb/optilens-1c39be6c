/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Classic Visions'
interface InquiryConfirmationProps { name?: string; inquiryType?: string; message?: string; siteUrl?: string; unsubscribeUrl?: string }
const INQUIRY_LABELS: Record<string, { heading: string; description: string }> = {
  contact: { heading: 'We received your message', description: 'Thank you for getting in touch. Our team will review your inquiry and respond as soon as possible.' },
  trade_account: { heading: 'Trade account application received', description: 'We have received your trade account application. Our sales team will review your details and be in touch within 1–2 business days.' },
  price_list: { heading: 'Price list request received', description: 'Thank you for requesting our wholesale pricing. Our sales team will send you the latest price lists shortly.' },
  zenvue_wholesale: { heading: 'Wholesale application received', description: 'Thank you for your ZenVue wholesale application. We will review your details and follow up within 1–2 business days.' },
  'website-design-lead': { heading: 'Quote request received', description: 'We have received your optical website design inquiry. Our team will prepare a detailed quote and get back to you shortly.' },
  assistant_request: { heading: 'Support request received', description: 'Thank you for reaching out. We have logged your request and our support team will follow up soon.' },
}
const DEFAULT_LABEL = { heading: 'We received your inquiry', description: 'Thank you for contacting us. Our team will review your submission and respond shortly.' }

const InquiryConfirmationEmail = ({ name = 'there', inquiryType = 'contact', message = '', siteUrl = 'https://classicvisions.lovable.app', unsubscribeUrl }: InquiryConfirmationProps) => {
  const label = INQUIRY_LABELS[inquiryType] ?? DEFAULT_LABEL
  return <ClassicVisionsEmailLayout preview={`${label.heading} — ${SITE_NAME}`} title={label.heading} unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {name}, {label.description.charAt(0).toLowerCase()}{label.description.slice(1)}</Text>
    {message ? <Section style={detailsBox}><Text style={detailsLabel}>Your submission details</Text><Text style={detailsText}>{message}</Text></Section> : null}
    <Section style={infoBox}><Text style={infoText}>If you need to follow up before we respond, you can reply directly to this email or contact us at support@classicvisions.net.</Text></Section>
    <Button style={button} href={siteUrl}>Visit {SITE_NAME}</Button>
    <Text style={footer}>Best regards,{"\n"}The {SITE_NAME} Team</Text>
  </ClassicVisionsEmailLayout>
}

export default InquiryConfirmationEmail
export const template = { component: InquiryConfirmationEmail, subject: (data: any) => (INQUIRY_LABELS[data?.inquiryType] ?? DEFAULT_LABEL).heading, displayName: 'Inquiry Confirmation', previewData: { name: 'Jane Doe', inquiryType: 'website-design-lead', message: 'Selected features:\n- Custom branding setup ($350)\n- Appointment booking integration ($500)\n\nUpfront website estimate: $1,950\n\nInfrastructure (always included):\n- Domain registration ($15/yr)\n- Hosting & DNS / Vercel Pro ($20/mo)', siteUrl: 'https://classicvisions.lovable.app' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const detailsBox = { backgroundColor: '#F4F2ED', borderLeft: '3px solid #C89130', borderRadius: '4px', padding: '16px 20px', margin: '0 0 20px' }
const detailsLabel = { color: '#1A8A9C', fontSize: '11px', fontWeight: '700' as const, letterSpacing: '0.08em', margin: '0 0 10px', textTransform: 'uppercase' as const }
const detailsText = { color: '#3d4a57', fontSize: '13px', lineHeight: '1.7', margin: '0', whiteSpace: 'pre-wrap' as const }
const infoBox = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const infoText = { color: '#3d4a57', fontSize: '14px', lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { color: '#3d4a57', fontSize: '14px', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0', whiteSpace: 'pre-wrap' as const }
