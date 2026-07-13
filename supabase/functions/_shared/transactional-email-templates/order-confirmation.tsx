/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface OrderItem { product_name: string; quantity: number; product_price: number }
interface OrderConfirmationProps { customerName?: string; orderId?: string; orderDate?: string; items?: OrderItem[]; totalAmount?: number; shippingAddress?: string; siteUrl?: string; unsubscribeUrl?: string }

const OrderConfirmationEmail = ({ customerName = 'Customer', orderId = 'ORD-000000', orderDate = new Date().toLocaleDateString(), items = [], totalAmount = 0, shippingAddress = '', siteUrl = 'https://classicvisions.lovable.app', unsubscribeUrl }: OrderConfirmationProps) => (
  <ClassicVisionsEmailLayout preview={`Your Classic Visions order #${orderId} has been confirmed`} title="Order Confirmed" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {customerName}, thanks for your order! We&apos;ve received your purchase and it&apos;s being processed.</Text>
    <Section style={detailBox}><Text style={detailLabel}>Order Number</Text><Text style={detailValue}>{orderId}</Text><Text style={detailLabel}>Order Date</Text><Text style={detailValue}>{orderDate}</Text></Section>
    {items.length > 0 && <Section style={itemsSection}><Text style={sectionTitle}>Items Ordered</Text>{items.map((item, i) => <Section key={i} style={itemRow}><Text style={itemName}>{item.product_name} x {item.quantity}</Text><Text style={itemPrice}>${(item.product_price * item.quantity).toFixed(2)}</Text></Section>)}<Hr style={divider}/><Section style={itemRow}><Text style={{ ...itemName, fontWeight: '700' as const }}>Total</Text><Text style={{ ...itemPrice, fontWeight: '700' as const }}>${totalAmount.toFixed(2)}</Text></Section></Section>}
    {shippingAddress && <Section style={detailBox}><Text style={detailLabel}>Shipping To</Text><Text style={detailValue}>{shippingAddress}</Text></Section>}
    <Button style={button} href={`${siteUrl}/profile/orders`}>View Your Orders</Button>
    <Text style={footer}>If you have any questions about your order, please reach out to our support team.</Text>
  </ClassicVisionsEmailLayout>
)

export default OrderConfirmationEmail
export const template = { component: OrderConfirmationEmail, subject: (data: any) => `Order Confirmed - #${data?.orderId ?? 'ORD-000000'}`, displayName: 'Order Confirmation', previewData: { customerName: 'Jane Doe', orderId: 'ORD-123456', orderDate: '25 Mar 2026', items: [{ product_name: 'Progressive Lens 1.67', quantity: 2, product_price: 89.99 }, { product_name: 'Anti-Reflective Coating', quantity: 2, product_price: 25 }], totalAmount: 229.98, shippingAddress: '123 Optical Lane, Cape Town, 8001', siteUrl: 'https://classicvisions.lovable.app' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const sectionTitle = { fontSize: '12px', fontWeight: '700' as const, color: '#1A8A9C', letterSpacing: '0.08em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const detailBox = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailLabel = { fontSize: '11px', color: '#1A8A9C', fontWeight: '700' as const, letterSpacing: '0.06em', margin: '0 0 2px', textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#0B1E35', margin: '0 0 12px', fontWeight: '600' as const }
const itemsSection = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const itemRow = { display: 'flex' as const, justifyContent: 'space-between', margin: '0 0 8px' }
const itemName = { fontSize: '14px', color: '#0B1E35', margin: '0' }
const itemPrice = { fontSize: '14px', color: '#0B1E35', margin: '0', textAlign: 'right' as const }
const divider = { borderColor: '#e2ddd2', margin: '12px 0' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '14px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
