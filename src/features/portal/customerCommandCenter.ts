import { supabase } from "@/integrations/supabase/client";

export interface CommandCenterOrder {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string | null;
  checkoutMethod: string | null;
}

export interface CommandCenterDraft {
  id: string;
  kind: "cart" | "rx";
  name: string;
  status: string;
  updatedAt: string;
}

export interface CommandCenterTicket {
  id: string;
  ticketNumber: string;
  title: string;
  closedAt: string | null;
  createdAt: string;
}

export interface CustomerCommandCenter {
  profile: {
    accessStatus: string;
    accessNote: string;
    organizationName: string | null;
    customerName: string | null;
  } | null;
  orders: CommandCenterOrder[];
  drafts: CommandCenterDraft[];
  balance: Record<string, unknown> | null;
  latestStatement: Record<string, unknown> | null;
  tickets: CommandCenterTicket[];
  pricelist: { id: number; name: string; updatedAt: string | null } | null;
  sources: { innovationsAsOf: string | null; websiteAsOf: string };
}

const emptyCommandCenter = (): CustomerCommandCenter => ({
  profile: null,
  orders: [],
  drafts: [],
  balance: null,
  latestStatement: null,
  tickets: [],
  pricelist: null,
  sources: { innovationsAsOf: null, websiteAsOf: new Date().toISOString() },
});

const normalizeCommandCenter = (raw: any): CustomerCommandCenter => ({
  profile: raw?.profile
    ? {
        accessStatus: String(raw.profile.access_status ?? "pending_profile"),
        accessNote: String(raw.profile.access_note ?? ""),
        organizationName: raw.profile.organization_name ?? null,
        customerName: raw.profile.customer_name ?? null,
      }
    : null,
  orders: Array.isArray(raw?.orders)
    ? raw.orders.map((order: any) => ({
        id: String(order.id),
        status: String(order.status ?? "pending"),
        totalAmount: Number(order.total_amount ?? 0),
        createdAt: String(order.created_at),
        updatedAt: order.updated_at ?? null,
        checkoutMethod: order.checkout_method ?? null,
      }))
    : [],
  drafts: Array.isArray(raw?.drafts)
    ? raw.drafts.map((draft: any) => ({
        id: String(draft.id),
        kind: draft.kind === "rx" ? "rx" : "cart",
        name: String(draft.name ?? "Saved draft"),
        status: String(draft.status ?? "draft"),
        updatedAt: String(draft.updated_at),
      }))
    : [],
  balance: raw?.balance ?? null,
  latestStatement: raw?.latest_statement ?? null,
  tickets: Array.isArray(raw?.tickets)
    ? raw.tickets.map((ticket: any) => ({
        id: String(ticket.id),
        ticketNumber: String(ticket.ticket_number ?? "Support"),
        title: String(ticket.title ?? "Support request"),
        closedAt: ticket.closed_at ?? null,
        createdAt: String(ticket.created_at),
      }))
    : [],
  pricelist: raw?.pricelist
    ? { id: Number(raw.pricelist.id), name: String(raw.pricelist.name), updatedAt: raw.pricelist.updated_at ?? null }
    : null,
  sources: {
    innovationsAsOf: raw?.sources?.innovations_as_of ?? null,
    websiteAsOf: raw?.sources?.website_as_of ?? new Date().toISOString(),
  },
});

export const fetchCustomerCommandCenter = async (): Promise<CustomerCommandCenter> => {
  const { data, error } = await (supabase.rpc as any)("get_customer_command_center");
  if (!error && data) return normalizeCommandCenter(data);

  const message = String(error?.message ?? "");
  if (!/get_customer_command_center|schema cache|does not exist/i.test(message)) throw error;
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return emptyCommandCenter();

  const [profileResult, ordersResult, cartDraftsResult, rxDraftsResult] = await Promise.all([
    (supabase as any).from("profiles").select("portal_access_status,portal_access_note,organization_name,crm_customer_id,crm_contact_id").eq("user_id", user.id).maybeSingle(),
    (supabase as any).from("orders").select("id,status,total_amount,created_at,updated_at,checkout_method").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    (supabase as any).from("cart_drafts").select("id,name,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    (supabase as any).from("rx_order_drafts").select("id,name,status,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (cartDraftsResult.error) throw cartDraftsResult.error;

  const profile = profileResult.data;
  const customerId = profile?.crm_customer_id ?? null;
  const contactId = profile?.crm_contact_id ?? null;
  const [customerResult, balanceResult, statementResult, ticketsResult] = await Promise.all([
    customerId ? (supabase as any).from("customers").select("name,assigned_pricelist_id").eq("id", customerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    customerId ? (supabase as any).from("balances_public").select("*").eq("customer_id", customerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    customerId ? (supabase as any).from("statements_public").select("*").eq("customer_id", customerId).order("period_end", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    contactId
      ? (supabase as any).from("helpdesk_tickets").select("id,ticket_number,title,closed_at,created_at").eq("partner_contact_id", contactId).order("created_at", { ascending: false }).limit(8)
      : (supabase as any).from("helpdesk_tickets").select("id,ticket_number,title,closed_at,created_at").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const pricelistId = customerResult.data?.assigned_pricelist_id ?? null;
  const pricelistResult = pricelistId
    ? await (supabase as any).from("pricelist_versions").select("id,name,updated_at").eq("id", pricelistId).maybeSingle()
    : { data: null, error: null };

  return normalizeCommandCenter({
    profile: {
      access_status: profile?.portal_access_status,
      access_note: profile?.portal_access_note,
      organization_name: profile?.organization_name,
      customer_name: customerResult.data?.name,
    },
    orders: ordersResult.data ?? [],
    drafts: [
      ...(cartDraftsResult.data ?? []).map((draft: any) => ({ ...draft, kind: "cart", status: "draft" })),
      ...(rxDraftsResult.error ? [] : (rxDraftsResult.data ?? []).map((draft: any) => ({ ...draft, kind: "rx" }))),
    ],
    balance: balanceResult.data ?? null,
    latest_statement: statementResult.data ?? null,
    tickets: ticketsResult.data ?? [],
    pricelist: pricelistResult.data ?? null,
    sources: { innovations_as_of: null, website_as_of: new Date().toISOString() },
  });
};
