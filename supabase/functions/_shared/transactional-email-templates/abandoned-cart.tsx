/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CartItem {
  product_name: string
  quantity: number
  product_price: number
}

interface AbandonedCartProps {
  customerName?: string
  totalItems?: number
  totalAmount?: number
  cartSnapshot?: CartItem[]
  siteUrl?: string
}

const AbandonedCartEmail = ({
  customerName = 'there',
  totalItems = 0,
  totalAmount = 0,
  cartSnapshot = [],
  siteUrl = 'https://optilens.lovable.app',
}: AbandonedCartProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You left {totalItems} item(s) in your cart</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Still interested?</Heading>
        <Text style={text}>
          Hi {customerName}, you left {totalItems} item(s) worth ${totalAmount.toFixed(2)} in your cart. They're still waiting for you!
        </Text>

        {cartSnapshot.length > 0 && (
          <Section style={itemsSection}>
            {cartSnapshot.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Text style={itemName}>{item.product_name} × {item.quantity}</Text>
                <Text style={itemPrice}>${(item.product_price * item.quantity).toFixed(2)}</Text>
              </Section>
            ))}
            <Hr style={divider} />
            <Section style={itemRow}>
              <Text style={{ ...itemName, fontWeight: '700' as const }}>Total</Text>
              <Text style={{ ...itemPrice, fontWeight: '700' as const }}>${totalAmount.toFixed(2)}</Text>
            </Section>
          </Section>
        )}

        <Button style={button} href={`${siteUrl}/store`}>
          Complete Your Order
        </Button>

        <Text style={footer}>
          If you've already completed your purchase or no longer need these items, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AbandonedCartEmail

export const template = {
  component: AbandonedCartEmail,
  subject: "You left items in your cart — complete your order",
  displayName: 'Abandoned Cart Recovery',
  previewData: {
    customerName: 'Jane',
    totalItems: 3,
    totalAmount: 254.97,
    cartSnapshot: [
      { product_name: 'Progressive Lens 1.67', quantity: 2, product_price: 89.99 },
      { product_name: 'Blue Light Filter', quantity: 1, product_price: 74.99 },
    ],
    siteUrl: 'https://optilens.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 24px' }
const itemsSection = { backgroundColor: '#f5f7fa', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const itemRow = { display: 'flex' as const, justifyContent: 'space-between' as const, margin: '0 0 8px' }
const itemName = { fontSize: '14px', color: '#1f2d3d', margin: '0' }
const itemPrice = { fontSize: '14px', color: '#1f2d3d', margin: '0', textAlign: 'right' as const }
const divider = { borderTop: '1px solid #e2e8f0', margin: '12px 0' }
const button = { backgroundColor: '#3a4a5c', color: '#f5f8fa', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '0 0 24px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0' }
