/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Link, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from './classic-visions-layout.tsx'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <ClassicVisionsEmailLayout preview={`Confirm your email for ${siteName}`} title={`Welcome to ${siteName}!`}>
    <Text style={text}>
      Thanks for signing up. Please confirm your email address ({' '}
      <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) to get started.
    </Text>
    <Button style={button} href={confirmationUrl}>Verify Email</Button>
    <Text style={footer}>If you didn&apos;t create an account, you can safely ignore this email.</Text>
  </ClassicVisionsEmailLayout>
)

export default SignupEmail

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const link = { color: '#0B1E35', textDecoration: 'underline' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
