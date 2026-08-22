import { addDays, endOfWeek, isBefore, isSameDay, startOfDay } from "date-fns";
import type { ActivityPriority, ActivityState, CrmActivity } from "./hooks/useActivities";

export type FocusBucket = "inbox" | "today" | "this_week" | "later" | "waiting";
export type FocusPreset = "my_focus" | "helping" | "overdue" | "all_team";

export const FOCUS_BUCKETS: FocusBucket[] = ["inbox", "today", "this_week", "later", "waiting"];
export const FOCUS_BUCKET_LABELS: Record<FocusBucket, string> = {
  inbox: "Inbox", today: "Today", this_week: "This Week", later: "Later", waiting: "Waiting",
};
export const STATE_LABELS: Record<ActivityState, string> = {
  inbox: "Inbox", planned: "Planned", in_progress: "In progress", waiting: "Waiting",
  completed: "Completed", cancelled: "Cancelled",
};
export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  urgent: "Urgent", high: "High", normal: "Normal", low: "Low",
};

export const isOpenActivity = (activity: CrmActivity) => activity.status !== "completed" && activity.status !== "cancelled";

export const isActivityOverdue = (activity: CrmActivity, now = new Date()) =>
  Boolean(activity.due_at && isOpenActivity(activity) && isBefore(new Date(activity.due_at), startOfDay(now)));

export const getFocusBucket = (activity: CrmActivity, now = new Date()): FocusBucket | null => {
  if (!isOpenActivity(activity)) return null;
  if (activity.status === "waiting") return "waiting";
  if (!activity.due_at) return "inbox";
  const due = new Date(activity.due_at);
  if (isSameDay(due, now) || isBefore(due, startOfDay(now))) return "today";
  if (due <= endOfWeek(now, { weekStartsOn: 1 })) return "this_week";
  return "later";
};

export const dueDateForBucket = (bucket: FocusBucket, now = new Date()) => {
  const hour = 9;
  if (bucket === "inbox" || bucket === "waiting") return null;
  const date = bucket === "today" ? now : bucket === "this_week" ? addDays(now, 3) : addDays(now, 14);
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
};

export const matchesPreset = (activity: CrmActivity, preset: FocusPreset, userId: string | undefined, now = new Date()) => {
  if (preset === "all_team") return true;
  if (preset === "overdue") return isActivityOverdue(activity, now);
  if (!userId) return false;
  if (preset === "helping") return activity.participants.some((person) => person.user_id === userId && person.role === "helper");
  return activity.owner_id === userId;
};
