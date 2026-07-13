/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Link, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from './classic-visions-layout.tsx'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <ClassicVisionsEmailLayout preview={`You've been invited to join ${siteName}`} title="You&apos;ve been invited">
    <Text style={text}>
      You&apos;ve been invited to join <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>. Click the button below to accept the invitation and set up your account.
    </Text>
    <Button style={button} href={confirmationUrl}>Accept Invitation</Button>
    <Text style={footer}>If you weren&apos;t expecting this invitation, you can safely ignore this email.</Text>
  </ClassicVisionsEmailLayout>
)

export default InviteEmail

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const link = { color: '#0B1E35', textDecoration: 'underline' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
