/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from './classic-visions-layout.tsx'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <ClassicVisionsEmailLayout preview={`Your login link for ${siteName}`} title={`Sign in to ${siteName}`}>
    <Text style={text}>Click the button below to sign in. This link will expire shortly.</Text>
    <Button style={button} href={confirmationUrl}>Sign In</Button>
    <Text style={footer}>If you didn&apos;t request this link, you can safely ignore this email.</Text>
  </ClassicVisionsEmailLayout>
)

export default MagicLinkEmail

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
