/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface OrderItem {
  product_name: string
  quantity: number
  product_price: number
}

interface OrderConfirmationProps {
  customerName?: string
  orderId?: string
  orderDate?: string
  items?: OrderItem[]
  totalAmount?: number
  shippingAddress?: string
  siteUrl?: string
}

const OrderConfirmationEmail = ({
  customerName = 'Customer',
  orderId = 'ORD-000000',
  orderDate = new Date().toLocaleDateString(),
  items = [],
  totalAmount = 0,
  shippingAddress = '',
  siteUrl = 'https://optilens.lovable.app',
}: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Classic Visions order #{orderId} has been confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Order Confirmed</Heading>
        <Text style={text}>
          Hi {customerName}, thanks for your order! We&apos;ve received your purchase and it&apos;s being processed.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Order Number</Text>
          <Text style={detailValue}>{orderId}</Text>
          <Text style={detailLabel}>Order Date</Text>
          <Text style={detailValue}>{orderDate}</Text>
        </Section>

        {items.length > 0 && (
          <Section style={itemsSection}>
            <Text style={sectionTitle}>Items Ordered</Text>
            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Text style={itemName}>{item.product_name} x {item.quantity}</Text>
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

        {shippingAddress && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Shipping To</Text>
            <Text style={detailValue}>{shippingAddress}</Text>
          </Section>
        )}

        <Button style={button} href={`${siteUrl}/profile/orders`}>
          View Your Orders
        </Button>

        <Text style={footer}>
          If you have any questions about your order, please reach out to our support team.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OrderConfirmationEmail

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: any) => `Order Confirmed - #${data?.orderId ?? 'ORD-000000'}`,
  displayName: 'Order Confirmation',
  previewData: {
    customerName: 'Jane Doe',
    orderId: 'ORD-123456',
    orderDate: '25 Mar 2026',
    items: [
      { product_name: 'Progressive Lens 1.67', quantity: 2, product_price: 89.99 },
      { product_name: 'Anti-Reflective Coating', quantity: 2, product_price: 25.00 },
    ],
    totalAmount: 229.98,
    shippingAddress: '123 Optical Lane, Cape Town, 8001',
    siteUrl: 'https://optilens.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f2d3d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5c6a7a', lineHeight: '1.6', margin: '0 0 24px' }
const sectionTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#1f2d3d', margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailBox = { backgroundColor: '#f5f7fa', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const detailLabel = { fontSize: '12px', color: '#8a96a6', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue = { fontSize: '15px', color: '#1f2d3d', margin: '0 0 12px', fontWeight: '500' as const }
const itemsSection = { margin: '0 0 24px' }
const itemRow = { display: 'flex' as const, justifyContent: 'space-between' as const, margin: '0 0 8px' }
const itemName = { fontSize: '14px', color: '#1f2d3d', margin: '0' }
const itemPrice = { fontSize: '14px', color: '#1f2d3d', margin: '0', textAlign: 'right' as const }
const divider = { borderTop: '1px solid #e2e8f0', margin: '12px 0' }
const button = { backgroundColor: '#3a4a5c', color: '#f5f8fa', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block', margin: '0 0 24px' }
const footer = { fontSize: '13px', color: '#8a96a6', margin: '24px 0 0' }
