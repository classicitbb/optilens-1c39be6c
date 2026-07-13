/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface WelcomeProps { customerName?: string; siteUrl?: string; unsubscribeUrl?: string }

const WelcomeEmail = ({ customerName = 'there', siteUrl = 'https://classicvisions.lovable.app', unsubscribeUrl }: WelcomeProps) => (
  <ClassicVisionsEmailLayout preview="Welcome to Classic Visions - let's get started" title="Welcome aboard!" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {customerName}, we&apos;re glad to have you. Your Classic Visions account is ready - browse our lens catalog, place orders, and track everything from your portal.</Text>
    <Text style={text}>Here&apos;s what you can do right away:</Text>
    <Text style={listItem}>Browse our full lens and supplies catalog</Text>
    <Text style={listItem}>Place orders with fast checkout</Text>
    <Text style={listItem}>Track your order status in real time</Text>
    <Button style={button} href={`${siteUrl}/store`}>Start Shopping</Button>
    <Text style={footer}>Questions? Just reply to this email - we&apos;re here to help.</Text>
  </ClassicVisionsEmailLayout>
)

export default WelcomeEmail
export const template = { component: WelcomeEmail, subject: 'Welcome to Classic Visions!', displayName: 'Welcome Message', previewData: { customerName: 'Jane', siteUrl: 'https://classicvisions.lovable.app' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const listItem = { fontSize: '15px', color: '#0B1E35', lineHeight: '1.62', margin: '0 0 8px', paddingLeft: '4px' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
