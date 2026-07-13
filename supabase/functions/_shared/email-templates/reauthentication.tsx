/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from './classic-visions-layout.tsx'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <ClassicVisionsEmailLayout preview="Your verification code" title="Verify your identity">
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={footer}>This code will expire shortly. If you didn&apos;t request this, you can safely ignore this email.</Text>
  </ClassicVisionsEmailLayout>
)

export default ReauthenticationEmail

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const codeStyle = { color: '#0B1E35', fontFamily: "'Plus Jakarta Sans', Courier, monospace", fontSize: '28px', fontWeight: '800' as const, letterSpacing: '4px', margin: '0 0 16px' }
const footer = { fontSize: '15px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
