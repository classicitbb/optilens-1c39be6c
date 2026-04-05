/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeProps {
  customerName?: string
  siteUrl?: string
}

const WelcomeEmail = ({
  customerName = 'there',
  siteUrl = 'https://optilens.lovable.app',
}: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Classic Visions - let's get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome aboard!</Heading>
        <Text style={text}>
          Hi {customerName}, we&apos;re glad to have you. Your Classic Visions account is ready - browse our lens catalog, place orders, and track everything from your portal.
        </Text>
        <Text style={text}>
          Here&apos;s what you can do right away:
        </Text>
        <Text style={listItem}>Browse our full lens and supplies catalog</Text>
        <Text style={listItem}>Place orders with fast checkout</Text>
        <Text style={listItem}>Track your order status in real time</Text>

        <Button style={button} href={`${siteUrl}/store`}>
          Start Shopping
        </Button>

        <Text style={footer}>
          Questions? Just reply to this email - we&apos;re here to help.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Classic Visions!',
  displayName: 'Welcome Message',
  previewData: {
    customerName: 'Jane',
    siteUrl: 'https://optilens.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '15px', color: '#1f2d3d', lineHeight: '1.6', margin: '0 0 8px', paddingLeft: '4px' }
const button = { backgroundColor: '#3a4a5c', color: '#f5f8fa', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '12px 0 24px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0' }
