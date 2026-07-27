import { supabase } from "@/integrations/supabase/client";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

type DraftQuoteRow = {
  id: string;
  updated_at: string;
};

type CampaignActivationProfileRow = {
  id: string;
  created_at: string;
};

type ActivityReminderRow = {
  id: string;
  activity_type: string;
  due_at: string;
};

export async function getTaskReminderNotifications(): Promise<AdminNotificationEvent[]> {
  const reminders: AdminNotificationEvent[] = [];

  const { data: draftQuotes } = await (supabase.from("quotes") as any)
    .select("id,updated_at")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1);

  const latestDraftQuote = ((draftQuotes ?? [])[0] ?? null) as DraftQuoteRow | null;
  if (latestDraftQuote) {
    reminders.push({
      id: `task_reminder:draft_quote:${latestDraftQuote.id}`,
      type: "task_reminder",
      title: "Unsaved quote draft",
      message: "You still have a draft quotation pending review or send.",
      createdAt: latestDraftQuote.updated_at,
      severity: "warning",
      href: "/admin/website/quotations",
    });
  }

  let latestCampaignProfile: CampaignActivationProfileRow | null = null;
  try {
    const { data: campaignProfiles } = await (supabase as any)
      .from("lead_campaign_activation_profiles")
      .select("id,created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    latestCampaignProfile = ((campaignProfiles ?? [])[0] ?? null) as CampaignActivationProfileRow | null;
  } catch {
    // Table may not exist yet — skip silently
  }
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const { data: activityRows } = await (supabase.from("activities") as any)
    .select("id,activity_type,due_at")
    .neq("status", "completed")
    .gte("due_at", startOfToday.toISOString())
    .lt("due_at", startOfTomorrow.toISOString())
    .order("due_at", { ascending: true })
    .limit(100);

  const dueToday = (activityRows ?? []) as ActivityReminderRow[];
  if (dueToday.length > 0) {
    reminders.push({
      id: "task_reminder:activities:today",
      type: "task_reminder",
      title: `${dueToday.length} activit${dueToday.length === 1 ? "y" : "ies"} due today`,
      message: dueToday.slice(0, 3).map((activity) => activity.activity_type).join(", "),
      createdAt: dueToday[0].due_at,
      severity: "info",
      href: "/admin/crm/activities?urgency=today",
    });
  }

  const { data: overdueRows } = await (supabase.from("activities") as any)
    .select("id,activity_type,due_at")
    .neq("status", "completed")
    .lt("due_at", startOfToday.toISOString())
    .order("due_at", { ascending: true })
    .limit(100);

  const overdue = (overdueRows ?? []) as ActivityReminderRow[];
  if (overdue.length > 0) {
    reminders.push({
      id: "task_reminder:activities:overdue",
      type: "task_reminder",
      title: `${overdue.length} overdue activit${overdue.length === 1 ? "y" : "ies"}`,
      message: overdue.slice(0, 3).map((activity) => activity.activity_type).join(", "),
      createdAt: overdue[0].due_at,
      severity: "warning",
      href: "/admin/crm/activities?urgency=overdue",
    });
  }

  return reminders;
}
