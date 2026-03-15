import type { KnowledgeDocumentEntity, OrderEntity, OrderLineEntity } from "@/domain/entities";
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
  quantity: number;
}): OrderLineEntity => ({
  id: item.id,
  productId: String(item.product_id),
  productName: item.product_name,
  unitPrice: item.product_price,
  quantity: item.quantity,
});

export const toOrderEntity = (order: {
  id: string;
  total_amount: number;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
  user_id?: string | null;
  items?: Array<{
    id: string;
    product_id: number;
    product_name: string;
    product_price: number;
    quantity: number;
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
  items: (order.items ?? []).map(toOrderLineEntity),
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
