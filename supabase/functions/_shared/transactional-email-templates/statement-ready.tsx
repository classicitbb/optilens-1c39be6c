/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface StatementReadyProps {
  customerName?: string
  accountNumber?: string
  periodStart?: string
  periodEnd?: string
  closingBalance?: number
  dueDate?: string
  siteUrl?: string
}

const fmtDate = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const StatementReadyEmail = ({
  customerName = 'there',
  accountNumber = '',
  periodStart,
  periodEnd,
  closingBalance = 0,
  dueDate,
  siteUrl = 'https://classicvisions.net',
}: StatementReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your Classic Visions statement is ready — balance $${closingBalance.toFixed(2)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your statement is ready</Heading>
        <Text style={text}>
          Hi {customerName}, your Classic Visions account statement
          {accountNumber ? ` (${accountNumber})` : ''} for {fmtDate(periodStart)}
          {periodEnd ? ` – ${fmtDate(periodEnd)}` : ''} is now available to view online.
        </Text>

        <Section style={summarySection}>
          <Section style={summaryRow}>
            <Text style={summaryLabel}>Balance due</Text>
            <Text style={summaryValue}>${closingBalance.toFixed(2)}</Text>
          </Section>
          {dueDate && (
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Due date</Text>
              <Text style={summaryValue}>{fmtDate(dueDate)}</Text>
            </Section>
          )}
        </Section>

        <Button style={button} href={`${siteUrl}/profile/statements`}>
          View Statement
        </Button>

        <Hr style={divider} />
        <Text style={footer}>
          Sign in to your Classic Visions account to view the full statement, transaction detail, and payment options.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default StatementReadyEmail

export const template = {
  component: StatementReadyEmail,
  subject: (data: StatementReadyProps) =>
    `Your statement is ready — $${(data?.closingBalance ?? 0).toFixed(2)} due`,
  displayName: 'Statement Ready',
  previewData: {
    customerName: 'Jane',
    accountNumber: 'RETAIL',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    closingBalance: 4320.5,
    dueDate: '2026-07-30',
    siteUrl: 'https://classicvisions.net',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0B1E35', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 24px' }
const summarySection = { backgroundColor: '#F4F2ED', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const summaryRow = { display: 'flex' as const, justifyContent: 'space-between' as const, margin: '0 0 8px' }
const summaryLabel = { fontSize: '14px', color: '#5a7490', margin: '0' }
const summaryValue = { fontSize: '14px', color: '#0B1E35', fontWeight: '700' as const, margin: '0', textAlign: 'right' as const }
const divider = { borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const button = { backgroundColor: '#0B1E35', color: '#F4F2ED', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '0 0 8px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '0' }
