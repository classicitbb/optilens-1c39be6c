/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Classic Visions'

interface InquiryConfirmationProps {
  name?: string
  inquiryType?: string
  siteUrl?: string
}

const INQUIRY_LABELS: Record<string, { heading: string; description: string }> = {
  contact: {
    heading: 'We received your message',
    description: 'Thank you for getting in touch. Our team will review your inquiry and respond as soon as possible.',
  },
  trade_account: {
    heading: 'Trade account application received',
    description: 'We have received your trade account application. Our sales team will review your details and be in touch within 1\u20132 business days.',
  },
  price_list: {
    heading: 'Price list request received',
    description: 'Thank you for requesting our wholesale pricing. Our sales team will send you the latest price lists shortly.',
  },
  zenvue_wholesale: {
    heading: 'Wholesale application received',
    description: 'Thank you for your ZenVue wholesale application. We will review your details and follow up within 1\u20132 business days.',
  },
  'website-design-lead': {
    heading: 'Quote request received',
    description: 'We have received your optical website design inquiry. Our team will prepare a detailed quote and get back to you shortly.',
  },
  assistant_request: {
    heading: 'Support request received',
    description: 'Thank you for reaching out. We have logged your request and our support team will follow up soon.',
  },
}

const DEFAULT_LABEL = {
  heading: 'We received your inquiry',
  description: 'Thank you for contacting us. Our team will review your submission and respond shortly.',
}

const InquiryConfirmationEmail = ({
  name = 'there',
  inquiryType = 'contact',
  siteUrl = 'https://classicvisions.lovable.app',
}: InquiryConfirmationProps) => {
  const label = INQUIRY_LABELS[inquiryType] ?? DEFAULT_LABEL

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{label.heading} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{label.heading}</Heading>
          <Text style={text}>
            Hi {name}, {label.description.charAt(0).toLowerCase()}{label.description.slice(1)}
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              If you need to follow up before we respond, you can reply directly to this email or contact us at support@classicvisions.net.
            </Text>
          </Section>

          <Button style={button} href={siteUrl}>
            Visit {SITE_NAME}
          </Button>

          <Text style={footer}>
            Best regards,{'\n'}The {SITE_NAME} Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InquiryConfirmationEmail

export const template = {
  component: InquiryConfirmationEmail,
  subject: (data: any) => {
    const label = INQUIRY_LABELS[data?.inquiryType] ?? DEFAULT_LABEL
    return label.heading
  },
  displayName: 'Inquiry Confirmation',
  previewData: {
    name: 'Jane Doe',
    inquiryType: 'contact',
    siteUrl: 'https://classicvisions.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 24px' }
const infoBox = { backgroundColor: '#f5f7fa', borderRadius: '12px', padding: '16px 20px', margin: '0 0 24px' }
const infoText = { fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#3a4a5c', color: '#f5f8fa', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '0 0 24px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0', whiteSpace: 'pre-wrap' as const }
