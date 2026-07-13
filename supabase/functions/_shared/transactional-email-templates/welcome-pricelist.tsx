/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface WelcomePricelistProps { customerName?: string; pricelistName?: string; siteUrl?: string; loginUrl?: string; unsubscribeUrl?: string }

const WelcomePricelistEmail = ({ customerName = 'Customer', pricelistName = 'Standard Pricelist', siteUrl = 'https://classicvisions.net', loginUrl = 'https://classicvisions.net/login', unsubscribeUrl }: WelcomePricelistProps) => (
  <ClassicVisionsEmailLayout preview="Your Classic Visions pricelist is ready — log in to view it" title="Welcome to Classic Visions" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {customerName}, your account is set up and your pricelist is ready.</Text>
    <Section style={pricelistBox}><Text style={pricelistLabel}>Your assigned pricelist</Text><Text style={pricelistNameStyle}>{pricelistName}</Text></Section>
    <Text style={text}>Log in to your account to view your full pricelist, place orders, and manage your profile.</Text>
    <Button style={button} href={loginUrl}>View My Pricelist</Button>
    <Hr style={divider} />
    <Text style={footer}>Questions? Reply to this email or contact us at support@classicvisions.net. You can view our full catalogue at {siteUrl}.</Text>
  </ClassicVisionsEmailLayout>
)

export default WelcomePricelistEmail
export const template: TemplateEntry = { component: WelcomePricelistEmail, subject: () => 'Your Classic Visions pricelist is ready', displayName: 'Welcome — Pricelist', previewData: { customerName: 'Jane Doe', pricelistName: 'Standard Pricelist 2026', siteUrl: 'https://classicvisions.net', loginUrl: 'https://classicvisions.net/login' } }

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const pricelistBox = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const pricelistLabel = { fontSize: '11px', fontWeight: '700' as const, color: '#1A8A9C', letterSpacing: '0.08em', margin: '0 0 4px', textTransform: 'uppercase' as const }
const pricelistNameStyle = { fontSize: '16px', fontWeight: '700' as const, color: '#0B1E35', margin: '0' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const divider = { borderColor: '#ece9e0', margin: '28px 0 16px' }
const footer = { fontSize: '14px', color: '#3d4a57', lineHeight: '1.62', margin: '0' }
