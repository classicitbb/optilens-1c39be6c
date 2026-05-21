/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomePricelistProps {
  customerName?: string
  pricelistName?: string
  siteUrl?: string
  loginUrl?: string
}

const WelcomePricelistEmail = ({
  customerName = 'Customer',
  pricelistName = 'Standard Pricelist',
  siteUrl = 'https://classicvisions.net',
  loginUrl = 'https://classicvisions.net/login',
}: WelcomePricelistProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Classic Visions pricelist is ready — log in to view it</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Classic Visions</Heading>

        <Text style={text}>
          Hi {customerName}, your account is set up and your pricelist is ready.
        </Text>

        <Section style={pricelistBox}>
          <Text style={pricelistLabel}>Your assigned pricelist</Text>
          <Text style={pricelistName_style}>{pricelistName}</Text>
        </Section>

        <Text style={text}>
          Log in to your account to view your full pricelist, place orders, and manage your profile.
        </Text>

        <Button style={button} href={loginUrl}>
          View My Pricelist
        </Button>

        <Hr style={divider} />

        <Text style={footer}>
          Questions? Reply to this email or contact us at{' '}
          <span style={footerLink}>support@classicvisions.net</span>.
          You can view our full catalogue at{' '}
          <span style={footerLink}>{siteUrl}</span>.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomePricelistEmail

export const template: TemplateEntry = {
  component: WelcomePricelistEmail,
  subject: (_data: any) => 'Your Classic Visions pricelist is ready',
  displayName: 'Welcome — Pricelist',
  previewData: {
    customerName: 'Jane Doe',
    pricelistName: 'Standard Pricelist 2026',
    siteUrl: 'https://classicvisions.net',
    loginUrl: 'https://classicvisions.net/login',
  },
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
}

const container = {
  padding: '40px 32px',
  maxWidth: '560px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1f2d3d',
  margin: '0 0 20px',
}

const text = {
  fontSize: '15px',
  color: '#5c6a7a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const pricelistBox = {
  backgroundColor: '#f0f4f8',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const pricelistLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  color: '#8a96a6',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '0 0 4px',
}

const pricelistName_style = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#1f2d3d',
  margin: '0',
}

const button = {
  backgroundColor: '#3a4a5c',
  color: '#f5f8fa',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}

const divider = {
  borderColor: '#e8edf2',
  margin: '32px 0 20px',
}

const footer = {
  fontSize: '13px',
  color: '#8a96a6',
  lineHeight: '1.5',
  margin: '0',
}

const footerLink = {
  color: '#5c6a7a',
}
