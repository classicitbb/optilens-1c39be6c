import type {
  AssistantSessionStatus,
  InvoiceStatus,
  JobStatus,
  MoonshotIssueStatus,
  MoonshotMeetingStatus,
  MoonshotRockStatus,
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RecordLifecycleStatus,
  ShipmentStatus,
  SourceCategory,
  TicketStatus,
  VisibilityScope,
} from "@/domain/statuses";

export interface CanonicalRecord<S extends string = RecordLifecycleStatus> {
  id: string;
  status: S;
  visibility: VisibilityScope;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  sourceCategory: SourceCategory;
}

export interface UserEntity extends CanonicalRecord {
  email: string;
  displayName: string;
}

export interface RoleEntity extends CanonicalRecord {
  name: string;
  permissionIds: string[];
}

export interface PermissionEntity extends CanonicalRecord {
  code: string;
  label: string;
}

export interface AccountEntity extends CanonicalRecord {
  name: string;
  primaryContactId?: string;
}

export interface ContactEntity extends CanonicalRecord {
  accountId?: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface ProductEntity extends CanonicalRecord {
  sku: string;
  name: string;
  description?: string;
}

export interface PriceListEntity extends CanonicalRecord {
  name: string;
  currencyCode: string;
}

export interface QuoteEntity extends CanonicalRecord<QuoteStatus> {
  accountId: string;
  totalAmount: number;
}

export interface OrderLineEntity {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderEntity extends CanonicalRecord<OrderStatus> {
  accountId?: string;
  totalAmount: number;
  items: OrderLineEntity[];
}

export interface JobEntity extends CanonicalRecord<JobStatus> {
  orderId?: string;
  summary: string;
}

export interface ShipmentEntity extends CanonicalRecord<ShipmentStatus> {
  orderId: string;
  trackingNumber?: string;
}

export interface InvoiceEntity extends CanonicalRecord<InvoiceStatus> {
  orderId?: string;
  amountDue: number;
}

export interface PaymentEntity extends CanonicalRecord<PaymentStatus> {
  invoiceId?: string;
  amount: number;
}

export interface TicketEntity extends CanonicalRecord<TicketStatus> {
  subject: string;
}

export interface DocumentEntity extends CanonicalRecord {
  title: string;
  mimeType: string;
}

export interface EventEntity extends CanonicalRecord {
  title: string;
  startsAt: string;
  endsAt?: string;
}

export interface KnowledgeSourceEntity extends CanonicalRecord {
  name: string;
  connectorType: string;
}

export interface KnowledgeDocumentEntity extends CanonicalRecord {
  sourceId?: string;
  title: string;
  body: string;
}

export interface KnowledgeGapEntity extends CanonicalRecord {
  topic: string;
  severity: "low" | "medium" | "high";
}

export interface AssistantSessionEntity extends CanonicalRecord {
  userId: string;
  status: AssistantSessionStatus;
}

export interface MoonshotTeamEntity extends CanonicalRecord {
  name: string;
  purpose: string;
}

export interface MoonshotMeetingEntity extends CanonicalRecord {
  title: string;
  date: string;
  status: MoonshotMeetingStatus;
}

export interface MoonshotRockEntity extends CanonicalRecord {
  title: string;
  dueDate: string;
  status: MoonshotRockStatus;
}

export interface MoonshotIssueEntity extends CanonicalRecord {
  title: string;
  status: MoonshotIssueStatus;
}
