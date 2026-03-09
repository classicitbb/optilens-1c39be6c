import { supabase } from "@/integrations/supabase/client";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

type DraftQuoteRow = {
  id: string;
  updated_at: string;
};

type CampaignActivationProfileRow = {
  id: string;
  created_at: string;
};

const PLACEHOLDER_ROUTES = [
  "/admin/sales/web-orders",
  "/admin/sales/rx-orders",
  "/admin/crm/activities",
  "/admin/helpdesk/sla",
] as const;

export async function getTaskReminderNotifications(): Promise<AdminNotificationEvent[]> {
  const reminders: AdminNotificationEvent[] = [];

  // Fire both queries in parallel
  const [draftQuotesResult, campaignProfilesResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,updated_at")
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1),
    // Table does not exist yet – skip query to avoid 404 noise
    Promise.resolve({ data: null } as { data: null }),
  ]);

  const latestDraftQuote = ((draftQuotesResult.data ?? [])[0] ?? null) as DraftQuoteRow | null;
  if (latestDraftQuote) {
    reminders.push({
      id: `task_reminder:draft_quote:${latestDraftQuote.id}`,
      type: "task_reminder",
      title: "Unsaved quote draft",
      message: "You still have a draft quotation pending review or send.",
      createdAt: latestDraftQuote.updated_at,
      severity: "warning",
      href: "/admin/sales/quotations",
    });
  }

  const latestCampaignProfile = ((campaignProfilesResult.data ?? [])[0] ?? null) as CampaignActivationProfileRow | null;
  if (latestCampaignProfile) {
    reminders.push({
      id: `task_reminder:campaign_packet:${latestCampaignProfile.id}`,
      type: "task_reminder",
      title: "Unsent campaign pack",
      message: "A campaign packet exists and may still need activation or performance logging.",
      createdAt: latestCampaignProfile.created_at,
      severity: "warning",
      href: "/admin/leads/campaigns",
    });
  }

  const moduleReminderTimestamp = new Date().toISOString();
  PLACEHOLDER_ROUTES.forEach((route) => {
    const sidebarItem = Object.values(ADMIN_APPS)
      .flatMap((app) => app.sidebarItems)
      .find((item) => item.route === route);
    if (!sidebarItem) return;

    reminders.push({
      id: `task_reminder:placeholder:${route}`,
      type: "task_reminder",
      title: `Finish setup: ${sidebarItem.label}`,
      message: "This workflow is still a placeholder and needs implementation follow-up.",
      createdAt: moduleReminderTimestamp,
      severity: "info",
      href: route,
    });
  });

  return reminders;
}
