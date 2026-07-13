/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface ErrorEntry { title: string; source: string; detail?: string; route?: string; timestamp: string }
interface AdminErrorNotificationProps { errorCount?: number; errors?: ErrorEntry[]; siteUrl?: string; reportedAt?: string; unsubscribeUrl?: string }

const AdminErrorNotificationEmail = ({ errorCount = 0, errors = [], siteUrl = 'https://optilens.lovable.app', reportedAt = new Date().toISOString(), unsubscribeUrl }: AdminErrorNotificationProps) => (
  <ClassicVisionsEmailLayout preview={`${errorCount} runtime error(s) detected on Classic Visions`} title={`${errorCount} Error${errorCount !== 1 ? 's' : ''} Detected`} eyebrow="System Alert" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>The following runtime errors were captured on {new Date(reportedAt).toLocaleString()}. Review them in the admin dashboard.</Text>
    {errors.map((err, i) => <Section key={i} style={errorCard}><Text style={errorTitle}>{err.title}</Text><Text style={errorMeta}>Source: {err.source}{err.route ? ` | Route: ${err.route}` : ''}</Text>{err.detail && <Text style={errorDetail}>{err.detail}</Text>}<Text style={errorTimestamp}>{new Date(err.timestamp).toLocaleString()}</Text></Section>)}
    <Button style={button} href={`${siteUrl}/admin/settings/runtime-errors`}>View Error Log</Button>
    <Text style={footer}>This is an automated notification from Classic Visions monitoring. Errors are stored locally and cleared on review.</Text>
  </ClassicVisionsEmailLayout>
)

export default AdminErrorNotificationEmail
export const template = { component: AdminErrorNotificationEmail, subject: (data: any) => `Alert: ${data?.errorCount ?? 0} runtime error(s) on Classic Visions`, displayName: 'Admin Error Notification', previewData: { errorCount: 2, errors: [{ title: 'Unhandled promise rejection', source: 'window.unhandledrejection', detail: 'TypeError: Cannot read properties of null', route: '/store', timestamp: '2026-03-25T10:30:00Z' }, { title: 'Failed to fetch pricing data', source: 'toast', route: '/admin/pricing', timestamp: '2026-03-25T10:32:00Z' }], siteUrl: 'https://optilens.lovable.app', reportedAt: '2026-03-25T10:35:00Z' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const errorCard = { backgroundColor: '#fdf2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', margin: '0 0 12px' }
const errorTitle = { fontSize: '14px', fontWeight: '700' as const, color: '#991b1b', margin: '0 0 4px' }
const errorMeta = { fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }
const errorDetail = { fontSize: '13px', color: '#374151', fontFamily: 'monospace', margin: '4px 0', wordBreak: 'break-all' as const }
const errorTimestamp = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '14px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
