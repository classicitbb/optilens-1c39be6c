/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ErrorEntry {
  title: string
  source: string
  detail?: string
  route?: string
  timestamp: string
}

interface AdminErrorNotificationProps {
  errorCount?: number
  errors?: ErrorEntry[]
  siteUrl?: string
  reportedAt?: string
}

const AdminErrorNotificationEmail = ({
  errorCount = 0,
  errors = [],
  siteUrl = 'https://optilens.lovable.app',
  reportedAt = new Date().toISOString(),
}: AdminErrorNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${errorCount} runtime error(s) detected on OptiLens`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={alertBanner}>
          <Text style={alertIcon}>⚠️</Text>
          <Heading style={h1}>{errorCount} Error{errorCount !== 1 ? 's' : ''} Detected</Heading>
        </Section>

        <Text style={text}>
          The following runtime errors were captured on {new Date(reportedAt).toLocaleString()}. Review them in the admin dashboard.
        </Text>

        {errors.map((err, i) => (
          <Section key={i} style={errorCard}>
            <Text style={errorTitle}>{err.title}</Text>
            <Text style={errorMeta}>
              Source: {err.source}{err.route ? ` · Route: ${err.route}` : ''}
            </Text>
            {err.detail && <Text style={errorDetail}>{err.detail}</Text>}
            <Text style={errorTimestamp}>{new Date(err.timestamp).toLocaleString()}</Text>
          </Section>
        ))}

        <Button style={button} href={`${siteUrl}/admin/settings/runtime-errors`}>
          View Error Log
        </Button>

        <Text style={footer}>
          This is an automated notification from OptiLens monitoring. Errors are stored locally and cleared on review.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AdminErrorNotificationEmail

export const template = {
  component: AdminErrorNotificationEmail,
  subject: (data: any) => `⚠️ ${data?.errorCount ?? 0} runtime error(s) on OptiLens`,
  displayName: 'Admin Error Notification',
  previewData: {
    errorCount: 2,
    errors: [
      { title: 'Unhandled promise rejection', source: 'window.unhandledrejection', detail: 'TypeError: Cannot read properties of null', route: '/store', timestamp: '2026-03-25T10:30:00Z' },
      { title: 'Failed to fetch pricing data', source: 'toast', route: '/admin/pricing', timestamp: '2026-03-25T10:32:00Z' },
    ],
    siteUrl: 'https://optilens.lovable.app',
    reportedAt: '2026-03-25T10:35:00Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const alertBanner = { backgroundColor: '#fef3cd', borderRadius: '12px', padding: '16px 20px', margin: '0 0 24px', textAlign: 'center' as const }
const alertIcon = { fontSize: '28px', margin: '0 0 4px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 24px' }
const errorCard = { backgroundColor: '#fdf2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', margin: '0 0 12px' }
const errorTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#991b1b', margin: '0 0 4px' }
const errorMeta = { fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }
const errorDetail = { fontSize: '13px', color: '#374151', margin: '4px 0', fontFamily: 'monospace', wordBreak: 'break-all' as const }
const errorTimestamp = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }
const button = { backgroundColor: '#3a4a5c', color: '#f5f8fa', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '12px 0 24px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0' }
