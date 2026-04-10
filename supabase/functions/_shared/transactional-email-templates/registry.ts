import type { FC } from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: FC<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as welcome } from './welcome.tsx'
import { template as abandonedCart } from './abandoned-cart.tsx'
import { template as adminErrorNotification } from './admin-error-notification.tsx'
import { template as contactInquiryNotification } from './contact-inquiry-notification.tsx'
import { template as inquiryConfirmation } from './inquiry-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'welcome': welcome,
  'abandoned-cart': abandonedCart,
  'admin-error-notification': adminErrorNotification,
  'contact-inquiry-notification': contactInquiryNotification,
  'inquiry-confirmation': inquiryConfirmation,
}
