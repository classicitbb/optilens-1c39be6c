/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'
import { ClassicVisionsEmailLayout } from '../email-templates/classic-visions-layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface CartItem { product_name: string; quantity: number; product_price: number }
interface AbandonedCartProps { customerName?: string; totalItems?: number; totalAmount?: number; cartSnapshot?: CartItem[]; siteUrl?: string; unsubscribeUrl?: string }

const AbandonedCartEmail = ({ customerName = 'there', totalItems = 0, totalAmount = 0, cartSnapshot = [], siteUrl = 'https://classicvisions.lovable.app', unsubscribeUrl }: AbandonedCartProps) => (
  <ClassicVisionsEmailLayout preview={`You left ${totalItems} item(s) in your cart`} title="Still interested?" unsubscribeUrl={unsubscribeUrl}>
    <Text style={text}>Hi {customerName}, you left {totalItems} item(s) worth ${totalAmount.toFixed(2)} in your cart. They&apos;re still waiting for you!</Text>
    {cartSnapshot.length > 0 && <Section style={itemsSection}>{cartSnapshot.map((item, i) => <Section key={i} style={itemRow}><Text style={itemName}>{item.product_name} × {item.quantity}</Text><Text style={itemPrice}>${(item.product_price * item.quantity).toFixed(2)}</Text></Section>)}<Hr style={divider}/><Section style={itemRow}><Text style={{ ...itemName, fontWeight: '700' as const }}>Total</Text><Text style={{ ...itemPrice, fontWeight: '700' as const }}>${totalAmount.toFixed(2)}</Text></Section></Section>}
    <Button style={button} href={`${siteUrl}/store`}>Complete Your Order</Button>
    <Text style={footer}>If you&apos;ve already completed your purchase or no longer need these items, you can safely ignore this email.</Text>
  </ClassicVisionsEmailLayout>
)

export default AbandonedCartEmail
export const template = { component: AbandonedCartEmail, subject: 'You left items in your cart — complete your order', displayName: 'Abandoned Cart Recovery', previewData: { customerName: 'Jane', totalItems: 3, totalAmount: 254.97, cartSnapshot: [{ product_name: 'Progressive Lens 1.67', quantity: 2, product_price: 89.99 }, { product_name: 'Blue Light Filter', quantity: 1, product_price: 74.99 }], siteUrl: 'https://classicvisions.lovable.app' } } satisfies TemplateEntry

const text = { fontSize: '15px', color: '#3d4a57', lineHeight: '1.62', margin: '0 0 14px' }
const itemsSection = { backgroundColor: '#F4F2ED', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const itemRow = { display: 'flex' as const, justifyContent: 'space-between', margin: '0 0 8px' }
const itemName = { fontSize: '14px', color: '#0B1E35', margin: '0' }
const itemPrice = { fontSize: '14px', color: '#0B1E35', margin: '0', textAlign: 'right' as const }
const divider = { borderColor: '#e2ddd2', margin: '12px 0' }
const button = { backgroundColor: '#C89130', color: '#0B1E35', fontSize: '14px', fontWeight: '700' as const, borderRadius: '8px', padding: '13px 28px', textDecoration: 'none', margin: '10px 0 2px' }
const footer = { fontSize: '14px', color: '#3d4a57', fontStyle: 'italic' as const, lineHeight: '1.62', margin: '14px 0 0' }
