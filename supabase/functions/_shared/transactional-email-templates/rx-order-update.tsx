/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

type RxOrderEvent = 'released' | 'shipped'
interface RxOrderUpdateProps { customerName?: string; quoteNumber?: string; patientName?: string; event?: RxOrderEvent; siteUrl?: string; unsubscribeUrl?: string }

const COPY: Record<RxOrderEvent, { title: string; eyebrow: string; body: string }> = {
  released: {
    title: 'Your Rx order is with the lab',
    eyebrow: 'Rx Order Update',
    body: 'We have checked your Rx order and sent it to our lab for production.',
  },
  shipped: {
    title: 'Your Rx order has shipped',
    eyebrow: 'Rx Order Update',
    body: 'Your Rx order has left the lab and is on its way to you.',
  },
}

const RxOrderUpdateEmail = ({ customerName = 'there', quoteNumber = '', patientName = '', event = 'released', siteUrl = 'https://classicvisions.net', unsubscribeUrl }: RxOrderUpdateProps) => {
  const copy = COPY[event] ?? COPY.released
  return (
    <ClassicVisionsEmailLayout preview={`${copy.title}${quoteNumber ? ` — ${quoteNumber}` : ''}`} eyebrow={copy.eyebrow} title={copy.title} unsubscribeUrl={unsubscribeUrl}>
      <Text style={text}>Hi {customerName}, {copy.body}</Text>
      <Section style={detailBox}>
        {quoteNumber && <><Text style={detailLabel}>Order</Text><Text style={detailValue}>{quoteNumber}</Text></>}
        {patientName && <><Text style={detailLabel}>Patient</Text><Text style={detailValue}>{patientName}</Text></>}
      </Section>
      <Button style={button} href={`${siteUrl}/profile/orders`}>View Your Orders</Button>
      <Hr style={divider} />
      <Text style={footer}>If you have any questions about this order, please reach out to our support team.</Text>
    </ClassicVisionsEmailLayout>
  )
}

export default RxOrderUpdateEmail
export const template = {
  component: RxOrderUpdateEmail,
  subject: (data: RxOrderUpdateProps) => `${(COPY[data?.event ?? 'released'] ?? COPY.released).title}${data?.quoteNumber ? ` — ${data.quoteNumber}` : ''}`,
  displayName: 'Rx Order Update',
  previewData: { customerName: 'Jane', quoteNumber: 'Q-1042', patientName: 'Marcus Grant', event: 'released', siteUrl: 'https://classicvisions.net' },
} satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const detailBox = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailLabel = { fontSize: '11px', color: '#1A8A9C', fontWeight: '700' as const, letterSpacing: '0.06em', margin: '0 0 2px', textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#0B1E35', margin: '0 0 12px', fontWeight: '600' as const }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const divider = { borderColor: '#ece9e0', margin: '24px 0 16px' }
const footer = { fontSize: '14px', color: '#3d4a57', lineHeight: '1.62', margin: '0' }
