/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface StatementReadyProps { customerName?: string; accountNumber?: string; periodStart?: string; periodEnd?: string; closingBalance?: number; dueDate?: string; siteUrl?: string; unsubscribeUrl?: string }
const fmtDate = (value?: string) => { if (!value) return ''; const d = new Date(value); return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

const StatementReadyEmail = ({ customerName = 'there', accountNumber = '', periodStart, periodEnd, closingBalance = 0, dueDate, siteUrl = 'https://classicvisions.net', unsubscribeUrl }: StatementReadyProps) => (
  <ClassicVisionsEmailLayout preview={`Your Classic Visions statement is ready — balance $${closingBalance.toFixed(2)}`} eyebrow="Account Statement" title="Your statement is ready" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {customerName}, your Classic Visions account statement{accountNumber ? ` (${accountNumber})` : ''} for {fmtDate(periodStart)}{periodEnd ? ` – ${fmtDate(periodEnd)}` : ''} is now available to view online.</Text>
    <Section style={summarySection}><Section style={summaryRow}><Text style={summaryLabel}>Balance due</Text><Text style={summaryValue}>${closingBalance.toFixed(2)}</Text></Section>{dueDate && <Section style={summaryRow}><Text style={summaryLabel}>Due date</Text><Text style={summaryValue}>{fmtDate(dueDate)}</Text></Section>}</Section>
    <Button style={button} href={`${siteUrl}/profile/statements`}>View Statement</Button>
    <Hr style={divider} />
    <Text style={footer}>Sign in to your Classic Visions account to view the full statement, transaction detail, and payment options.</Text>
  </ClassicVisionsEmailLayout>
)

export default StatementReadyEmail
export const template = { component: StatementReadyEmail, subject: (data: StatementReadyProps) => `Your statement is ready — $${(data?.closingBalance ?? 0).toFixed(2)} due`, displayName: 'Statement Ready', previewData: { customerName: 'Jane', accountNumber: 'RETAIL', periodStart: '2026-06-01', periodEnd: '2026-06-30', closingBalance: 4320.5, dueDate: '2026-07-30', siteUrl: 'https://classicvisions.net' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
// Mirrors the light account-summary panel used by the printable Doc Studio and
// portal statement, while keeping this notification concise for email clients.
const summarySection = { backgroundColor: '#f2f6f8', border: '1px solid #dde3ea', borderLeft: '3px solid #C89130', borderRadius: '4px', padding: '16px 20px', margin: '0 0 20px' }
const summaryRow = { display: 'flex' as const, justifyContent: 'space-between', margin: '0 0 8px' }
const summaryLabel = { fontSize: '14px', color: '#3d4a57', margin: '0' }
const summaryValue = { fontSize: '14px', color: '#0B1E35', fontWeight: '700' as const, margin: '0', textAlign: 'right' as const }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const divider = { borderColor: '#ece9e0', margin: '24px 0 16px' }
const footer = { fontSize: '14px', color: '#3d4a57', lineHeight: '1.62', margin: '0' }
