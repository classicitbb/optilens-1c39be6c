/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Link, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from './classic-visions-layout.tsx'

interface EmailChangeEmailProps { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <ClassicVisionsEmailLayout preview={`Confirm your email change for ${siteName}`} title="Confirm your email change">
    <Text style={text}>
      You requested to change your email address for {siteName} from{' '}
      <Link href={`mailto:${email}`} style={link}>{email}</Link> to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
    </Text>
    <Text style={text}>Click the button below to confirm this change:</Text>
    <Button style={button} href={confirmationUrl}>Confirm Email Change</Button>
    <Text style={footer}>If you didn&apos;t request this change, please secure your account immediately.</Text>
  </ClassicVisionsEmailLayout>
)

export default EmailChangeEmail

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const link = { color: '#0B1E35', textDecoration: 'underline' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
