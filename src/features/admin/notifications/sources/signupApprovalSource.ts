import { supabase } from "@/integrations/supabase/client";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

type PendingSignupRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_name: string | null;
  claimed_account_number: string | null;
  updated_at: string;
};

// Route the admin straight to the approvals queue. The page reads this param
// to surface the queue at the top.
const APPROVALS_QUEUE_HREF = "/admin/website/portals?view=approvals";

/**
 * Surfaces self-service signups that finished profile completion but have no
 * resolved customer account yet (portal_access_status = 'pending_approval'),
 * excluding archived ones. Emits one bell notification per pending signup so
 * the admin sees who is waiting without opening the page.
 *
 * Built as a plain source so an email channel can later read the same query.
 */
export async function getSignupApprovalNotifications(limit = 8): Promise<AdminNotificationEvent[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id,full_name,email,organization_name,claimed_account_number,updated_at")
      .eq("portal_access_status", "pending_approval")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return ((data ?? []) as PendingSignupRow[]).map((row) => {
      const who = row.full_name?.trim() || row.email?.trim() || "A new customer";
      const org = row.organization_name?.trim();
      const claimed = row.claimed_account_number?.trim();
      const message = claimed
        ? `${who}${org ? ` (${org})` : ""} signed up citing account ${claimed}. Confirm to link them.`
        : `${who}${org ? ` (${org})` : ""} completed signup and is awaiting account approval.`;
      return {
        id: `signup_approval:${row.id}`,
        type: "task_reminder",
        title: claimed ? "Signup: confirm staff account" : "Signup awaiting approval",
        message,
        createdAt: row.updated_at ?? new Date().toISOString(),
        severity: "warning",
        href: APPROVALS_QUEUE_HREF,
      } satisfies AdminNotificationEvent;
    });
  } catch {
    return [];
  }
}
