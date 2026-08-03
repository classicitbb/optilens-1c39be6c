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
}

const AccountSidebar = ({ pathname }: AccountSidebarProps) => {
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
  const draftCount = cartDrafts.length + rxDrafts.length;

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
    if (item.to === "/profile/helpdesk" && unreadMessages.length > 0) {
      return { ...item, badge: <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground" aria-label={`${unreadMessages.length} new support message${unreadMessages.length === 1 ? "" : "s"}`}>{unreadMessages.length > 9 ? "9+" : unreadMessages.length}</span> };
    }
    return item;
  });

  return (
    <SidebarNavList
      items={items}
      pathname={pathname}
      className="space-y-1"
      activeItemClassName="bg-primary/10 font-medium text-primary"
      inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
    />
  );
};

export default AccountSidebar;
