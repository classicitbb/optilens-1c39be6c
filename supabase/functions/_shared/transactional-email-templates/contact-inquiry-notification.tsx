/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Classic Visions'

interface ContactInquiryNotificationProps {
  inquiryType?: string
  name?: string
  email?: string
  phone?: string
  businessName?: string
  message?: string
  pageSlug?: string
  sourceChannel?: string
  submittedAt?: string
  notes?: string
}

const ContactInquiryNotificationEmail = ({
  inquiryType = 'contact',
  name = 'Unknown',
  email = '',
  phone = '',
  businessName = '',
  message = '',
  pageSlug = '/',
  sourceChannel = 'website',
  submittedAt = new Date().toISOString(),
  notes = '',
}: ContactInquiryNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New ${inquiryType === 'website-design-lead' ? 'website design lead' : 'contact inquiry'} from ${name}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {inquiryType === 'website-design-lead' ? 'New Website Design Lead' : 'New Contact Inquiry'}
        </Heading>
        <Text style={text}>A new inquiry has been received on {SITE_NAME}.</Text>

        <Section style={detailCard}>
          <Text style={detailRow}><strong>Name:</strong> {name}</Text>
          <Text style={detailRow}><strong>Email:</strong> {email}</Text>
          <Text style={detailRow}><strong>Phone:</strong> {phone || 'Not provided'}</Text>
          <Text style={detailRow}><strong>Business:</strong> {businessName || 'Not provided'}</Text>
          <Text style={detailRow}><strong>Page:</strong> {pageSlug}</Text>
          <Text style={detailRow}><strong>Channel:</strong> {sourceChannel}</Text>
          <Text style={detailRow}><strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}</Text>
        </Section>

        {notes ? (
          <>
            <Text style={sectionLabel}>Additional Notes</Text>
            <Text style={messageText}>{notes}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={sectionLabel}>Message</Text>
        <Text style={messageText}>{message}</Text>

        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactInquiryNotificationEmail,
  subject: (data: any) =>
    `${data?.inquiryType === 'website-design-lead' ? 'Website design lead' : 'Website contact inquiry'} from ${data?.name ?? 'someone'}`,
  displayName: 'Contact Inquiry Notification',
  previewData: {
    inquiryType: 'contact',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123 4567',
    businessName: 'Doe Opticians',
    message: 'Hi, I would like to enquire about your lens products for my practice.',
    pageSlug: '/contact',
    sourceChannel: 'website',
    submittedAt: '2026-04-09T10:00:00Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 20px' }
const detailCard = { backgroundColor: '#f7f9fb', borderRadius: '10px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const sectionLabel = { fontSize: '13px', fontWeight: '600' as const, color: '#1f2d3d', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 8px' }
const messageText = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0' }
