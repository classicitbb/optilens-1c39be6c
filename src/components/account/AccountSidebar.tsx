import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SidebarNavList from "@/components/shared/SidebarNavList";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useUserRole } from "@/hooks/useUserRole";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";
import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";
import { useCartDrafts } from "@/hooks/useCartDrafts";
import { useRxDrafts } from "@/features/lens-assistant/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AccountSidebarProps {
  pathname: string;
  collapsed?: boolean;
}

const AccountSidebar = ({ pathname, collapsed = false }: AccountSidebarProps) => {
  const { canAccessFeature, identity, emulation, effectiveUserId } = usePortalIdentity();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const publicLensAssistant = useWebsiteFeature("lens_assistant_public", false);
  const adminLensAssistant = useWebsiteFeature("lens_assistant_admin", true);
  const lensAssistantEnabled = (isAdmin ? adminLensAssistant.enabled : publicLensAssistant.enabled)
    && canAccessFeature("lens-assistant");
  const targetUserId = emulation?.userId ?? effectiveUserId ?? user?.id ?? null;
  const { drafts: cartDrafts } = useCartDrafts(emulation?.userId);
  const { data: rxDrafts = [] } = useRxDrafts(emulation?.userId);
  const seenKey = `cv.portal.helpdesk.last-seen:${targetUserId ?? "anonymous"}`;
  const [lastSeenAt, setLastSeenAt] = useState(() => {
    try { return localStorage.getItem(seenKey) ?? "1970-01-01T00:00:00.000Z"; } catch { return "1970-01-01T00:00:00.000Z"; }
  });
  const isViewingHelpdesk = pathname === "/profile/helpdesk" || pathname.startsWith("/profile/helpdesk/");

  useEffect(() => {
    try { setLastSeenAt(localStorage.getItem(seenKey) ?? "1970-01-01T00:00:00.000Z"); } catch { setLastSeenAt("1970-01-01T00:00:00.000Z"); }
  }, [seenKey]);

  useEffect(() => {
    if (!isViewingHelpdesk || !targetUserId) return;
    const now = new Date().toISOString();
    try { localStorage.setItem(seenKey, now); } catch { /* Browser storage is optional. */ }
    setLastSeenAt(now);
  }, [isViewingHelpdesk, seenKey, targetUserId]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["customer-helpdesk-indicator", targetUserId, identity?.crmContactId],
    enabled: Boolean(user && targetUserId && canAccessFeature("helpdesk")),
    queryFn: async () => {
      let query = (supabase as any).from("helpdesk_tickets").select("id").limit(50);
      query = identity?.crmContactId
        ? query.eq("partner_contact_id", identity.crmContactId)
        : query.eq("owner_user_id", targetUserId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Array<{ id: string }>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const ticketIds = useMemo(() => tickets.map((ticket) => ticket.id), [tickets]);
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["customer-helpdesk-unread", ticketIds, lastSeenAt],
    enabled: Boolean(!isViewingHelpdesk && ticketIds.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_messages")
        .select("id")
        .in("ticket_id", ticketIds)
        .eq("direction", "outbound")
        .gt("sent_at", lastSeenAt);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const statementSeenKey = `cv.portal.statements.last-seen:${targetUserId ?? "anonymous"}`;
  const [lastStatementSeenAt, setLastStatementSeenAt] = useState(() => {
    try { return localStorage.getItem(statementSeenKey) ?? "1970-01-01T00:00:00.000Z"; } catch { return "1970-01-01T00:00:00.000Z"; }
  });
  const isViewingStatements = pathname === "/profile/statements";

  useEffect(() => {
    try { setLastStatementSeenAt(localStorage.getItem(statementSeenKey) ?? "1970-01-01T00:00:00.000Z"); } catch { setLastStatementSeenAt("1970-01-01T00:00:00.000Z"); }
  }, [statementSeenKey]);

  const { data: statements = [] } = useQuery({
    queryKey: ["customer-statement-indicator", identity?.crmCustomerId],
    enabled: Boolean(user && typeof identity?.crmCustomerId === "number" && canAccessFeature("statements")),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("statements_public")
        .select("id,period_end")
        .eq("customer_id", identity!.crmCustomerId)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; period_end: string | null }>;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  useEffect(() => {
    if (!isViewingStatements || !statements.length) return;
    const newest = statements.reduce((latest, statement) => {
      const value = statement.period_end ?? "";
      return value > latest ? value : latest;
    }, "");
    if (!newest) return;
    try { localStorage.setItem(statementSeenKey, newest); } catch { /* Browser storage is optional. */ }
    setLastStatementSeenAt(newest);
  }, [isViewingStatements, statementSeenKey, statements]);

  const { data: orderRows = [] } = useQuery({
    queryKey: ["customer-order-indicator", targetUserId],
    enabled: Boolean(user && targetUserId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id")
        .eq("user_id", targetUserId);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string }>;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const draftCount = cartDrafts.length + rxDrafts.length;
  // The nav is a notification, not a historical-statement counter. A single
  // badge says that the newest posted period has not been opened yet.
  const unseenStatementCount = statements.some((statement) => (statement.period_end ?? "") > lastStatementSeenAt) ? 1 : 0;
  const uniqueOrderCount = new Set(orderRows.map((order) => order.id)).size;

  const items = ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.to === "/profile/rx-order") return lensAssistantEnabled;
    if (item.to === "/profile/quotes") return canAccessFeature("quotes");
    if (item.to === "/profile/helpdesk") return canAccessFeature("helpdesk");
    if (item.to === "/profile/pricelists") return canAccessFeature("pricelists");
    if (item.to === "/profile/statements") return canAccessFeature("statements");
    return true;
  }).map((item) => {
    if (item.to === "/profile/drafts" && draftCount > 0) {
      return { ...item, badge: <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground" aria-label={`${draftCount} saved draft${draftCount === 1 ? "" : "s"}`}>{draftCount}</span> };
    }
    if (item.to === "/profile/orders" && uniqueOrderCount > 0) {
      return { ...item, badge: <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground" aria-label={`${uniqueOrderCount} unique order${uniqueOrderCount === 1 ? "" : "s"}`}>{uniqueOrderCount}</span> };
    }
    if (item.to === "/profile/statements" && unseenStatementCount > 0) {
      return { ...item, badge: <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground" aria-label={`${unseenStatementCount} new statement${unseenStatementCount === 1 ? "" : "s"}`}>{unseenStatementCount}</span> };
    }
    if (item.to === "/profile/helpdesk" && unreadMessages.length > 0) {
      return { ...item, badge: <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground" aria-label={`${unreadMessages.length} new support message${unreadMessages.length === 1 ? "" : "s"}`}>{unreadMessages.length > 9 ? "9+" : unreadMessages.length}</span> };
    }
    return item;
  });

  return (
    <SidebarNavList
      items={items}
      pathname={pathname}
      collapsed={collapsed}
      className="space-y-1"
      activeItemClassName="bg-primary/10 font-medium text-primary"
      inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
    />
  );
};

export default AccountSidebar;
