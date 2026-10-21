/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import type { Dossier, DossierRow } from '../leads/dossier.ts'

interface LeadAlertProps { dossier?: Dossier; unsubscribeUrl?: string }

const Rows = ({ rows }: { rows: DossierRow[] }) => (
  <Section style={card}>
    {rows.map((r) => (
      <Text key={r.label} style={detailRow}><strong>{r.label}:</strong> {r.value}</Text>
    ))}
  </Section>
)

const LeadAlertEmail = ({ dossier, unsubscribeUrl }: LeadAlertProps) => {
  if (!dossier) return null
  return (
    <ClassicVisionsEmailLayout preview={dossier.preview} title={dossier.headline} eyebrow={dossier.kindLabel} unsubscribeUrl={unsubscribeUrl}>
      <Section style={deadline}>
        <Text style={deadlineText}><strong>Reply by {dossier.respondByLabel}</strong></Text>
      </Section>

      <Section style={moveBox}>
        <Text style={label}>Next move</Text>
        <Text style={moveAction}>{dossier.nextMove.action}</Text>
        <Text style={moveReason}>{dossier.nextMove.reason}</Text>
      </Section>

      <Section>
        {dossier.contactActions.map((a, i) => (
          <Button key={a.label} style={i === 0 ? primaryButton : secondaryButton} href={a.href}>{a.label}</Button>
        ))}
      </Section>

      {dossier.told.length ? <><Text style={label}>What they told us</Text><Rows rows={dossier.told} /></> : null}
      <Text style={label}>Their message</Text>
      <Text style={messageText}>{dossier.message}</Text>
      {dossier.fit.length ? <><Text style={label}>Fit</Text><Rows rows={dossier.fit} /></> : null}
      {dossier.history.length ? <><Text style={label}>History</Text><Rows rows={dossier.history} /></> : null}

      <Hr style={hr} />
      <Text style={label}>Work it</Text>
      <Text style={linkLine}>
        {dossier.adminActions.map((a, i) => (
          <React.Fragment key={a.label}>{i ? ' · ' : ''}<Link href={a.href} style={link}>{a.label}</Link></React.Fragment>
        ))}
      </Text>
      <Text style={footer}>Automated lead summary. Do not quote prices, discounts or delivery dates from this email.</Text>
    </ClassicVisionsEmailLayout>
  )
}

const previewDossier: Dossier = {
  subject: 'Trade account request: Specs Optical (Bridgetown)',
  preview: 'Trade account request from Jane Doe. Reply by Tue 21 Oct, 13:00.',
  kindLabel: 'Trade account request',
  headline: 'Specs Optical (Bridgetown)',
  respondBy: '2026-10-21T17:00:00Z',
  respondByLabel: 'Tue 21 Oct, 13:00 (Barbados time)',
  told: [
    { label: 'Contact', value: 'Jane Doe' },
    { label: 'Business', value: 'Specs Optical' },
    { label: 'Business type', value: 'Independent optical' },
    { label: 'Monthly volume', value: '50-100 jobs' },
    { label: 'Came from', value: '/professionals/trade-account (website)' },
  ],
  fit: [
    { label: 'Customer?', value: 'Not yet' },
    { label: 'Location', value: 'Bridgetown, Barbados' },
    { label: 'Google rating', value: '4.6 (88 reviews)' },
  ],
  history: [
    { label: 'CRM record', value: 'Created just now from this request' },
    { label: 'Earlier requests', value: 'First request' },
  ],
  nextMove: {
    action: 'Review the details, approve the account, then send the welcome kit from their rep.',
    reason: 'They asked for a trade account.',
  },
  contactActions: [
    { label: 'Reply by email', href: 'mailto:jane@example.com' },
    { label: 'WhatsApp', href: 'https://wa.me/12465551234' },
  ],
  adminActions: [
    { label: 'Open CRM contact', href: 'https://admin.classicvisions.net/admin/crm/contacts?contact=1' },
    { label: 'Review pending approvals', href: 'https://admin.classicvisions.net/admin/website/portals?status=pending_approval' },
  ],
  message: 'New trade account request submitted.',
}

export const template = {
  component: LeadAlertEmail,
  subject: (data: any) => data?.dossier?.subject ?? 'New lead',
  displayName: 'Lead Alert',
  previewData: { dossier: previewDossier },
} satisfies TemplateEntry

const label = { color: '#1A8A9C', fontSize: '12px', fontWeight: '700' as const, letterSpacing: '0.08em', margin: '18px 0 8px', textTransform: 'uppercase' as const }
const card = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '12px 18px', margin: '0 0 8px' }
const detailRow = { fontSize: '14px', color: '#3d4a57', lineHeight: '1.5', margin: '4px 0' }
const deadline = { backgroundColor: '#0B1E35', borderRadius: '8px', padding: '10px 18px', margin: '0 0 14px' }
const deadlineText = { color: '#ffffff', fontSize: '14px', margin: '0' }
const moveBox = { border: '1px solid #C89130', borderRadius: '8px', padding: '12px 18px', margin: '0 0 14px' }
const moveAction = { color: '#0B1E35', fontSize: '16px', fontWeight: '600' as const, lineHeight: '1.45', margin: '0 0 4px' }
const moveReason = { color: '#3d4a57', fontSize: '14px', lineHeight: '1.5', margin: '0' }
const primaryButton = { backgroundColor: '#C89130', color: '#0B1E35', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '700' as const, textDecoration: 'none', marginRight: '8px', marginBottom: '8px', display: 'inline-block' }
const secondaryButton = { backgroundColor: '#ffffff', color: '#0B1E35', border: '1px solid #0B1E35', borderRadius: '6px', padding: '9px 16px', fontSize: '14px', textDecoration: 'none', marginRight: '8px', marginBottom: '8px', display: 'inline-block' }
const messageText = { color: '#3d4a57', fontSize: '15px', lineHeight: '1.62', margin: '0 0 8px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#ece9e0', margin: '20px 0 0' }
const linkLine = { fontSize: '14px', lineHeight: '1.8', margin: '0 0 12px' }
const link = { color: '#1A8A9C' }
const footer = { fontSize: '13px', color: '#6b7785', fontStyle: 'italic' as const, lineHeight: '1.5', margin: '10px 0 0' }
