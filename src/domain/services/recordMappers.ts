import type { KnowledgeDocumentEntity, OrderEntity, OrderLineEntity, OrderPaymentSummary } from "@/domain/entities";
import type { ContentArticle } from "@/hooks/useContentArticles";
import { ORDER_STATUSES, type OrderStatus } from "@/domain/statuses";

const orderStatusSet = new Set<string>(ORDER_STATUSES);

export const normalizeOrderStatus = (status: string | null | undefined): OrderStatus => {
  if (!status) return "pending";
  return orderStatusSet.has(status) ? (status as OrderStatus) : "pending";
};

export const toOrderLineEntity = (item: {
  id: string;
  product_id: number;
  product_name: string;
  product_price: number;
  product_type?: string | null;
  quantity: number;
  variant_id?: string | null;
  variant_label?: string | null;
  sku?: string | null;
  opc_code?: string | null;
  variant_snapshot?: Record<string, unknown> | null;
}): OrderLineEntity => ({
  id: item.id,
  productId: String(item.product_id),
  productName: item.product_name,
  productType: item.product_type ?? undefined,
  variantId: item.variant_id ?? undefined,
  variantLabel: item.variant_label ?? undefined,
  sku: item.sku ?? undefined,
  opcCode: item.opc_code ?? undefined,
  unitPrice: item.product_price,
  quantity: item.quantity,
  variantSnapshot: item.variant_snapshot ?? undefined,
});


export const toOrderPaymentSummary = (payment: {
  id: string;
  amount: number;
  status: string;
  provider: string;
  card_brand?: string | null;
  card_last4?: string | null;
  created_at: string;
}): OrderPaymentSummary => ({
  id: payment.id,
  amount: payment.amount,
  status: (payment.status || "settled") as OrderPaymentSummary["status"],
  provider: payment.provider,
  cardBrand: payment.card_brand ?? undefined,
  cardLast4: payment.card_last4 ?? undefined,
  createdAt: payment.created_at,
});

export const toOrderEntity = (order: {
  id: string;
  total_amount: number;
  customer_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  shipping_address?: Record<string, unknown> | null;
  billing_address?: Record<string, unknown> | null;
  checkout_method?: string | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
  user_id?: string | null;
  items?: Array<{
    id: string;
    product_id: number;
    product_name: string;
    product_price: number;
    product_type?: string | null;
    quantity: number;
    variant_id?: string | null;
    variant_label?: string | null;
    sku?: string | null;
    opc_code?: string | null;
    variant_snapshot?: Record<string, unknown> | null;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    provider: string;
    card_brand?: string | null;
    card_last4?: string | null;
    created_at: string;
  }>;
}): OrderEntity => ({
  id: order.id,
  ownerId: order.user_id ?? "system",
  accountId: order.user_id ?? undefined,
  sourceCategory: "system",
  status: normalizeOrderStatus(order.status),
  visibility: "customer",
  createdAt: order.created_at,
  updatedAt: order.updated_at ?? order.created_at,
  totalAmount: order.total_amount,
  customerName: order.customer_name ?? undefined,
  contactEmail: order.contact_email ?? undefined,
  contactPhone: order.contact_phone ?? undefined,
  shippingAddress: order.shipping_address ?? null,
  billingAddress: order.billing_address ?? null,
  checkoutMethod: order.checkout_method ?? undefined,
  items: (order.items ?? []).map(toOrderLineEntity),
  payments: (order.payments ?? []).map(toOrderPaymentSummary),
});

const toCanonicalVisibility = (visibility: ContentArticle["visibility"]): KnowledgeDocumentEntity["visibility"] => {
  if (visibility === "draft") return "restricted";
  return visibility;
};

export const toKnowledgeDocumentEntity = (article: ContentArticle): KnowledgeDocumentEntity => ({
  id: article.id,
  title: article.title,
  body: article.content,
  ownerId: "content-team",
  sourceCategory: "manual",
  status: article.is_active ? "active" : "inactive",
  visibility: toCanonicalVisibility(article.visibility),
  createdAt: article.created_at,
  updatedAt: article.updated_at,
});
