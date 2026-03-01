export type HelpdeskPriority = 0 | 1 | 2 | 3 | 4 | 5;

export const normalizeHelpdeskPriorityLabel = (priority?: number | null): string => {
  if (priority == null || Number.isNaN(priority)) return "Unspecified";

  const normalized = Math.max(0, Math.min(5, Math.round(priority)));

  const map: Record<HelpdeskPriority, string> = {
    0: "Low",
    1: "Normal",
    2: "Medium",
    3: "High",
    4: "Urgent",
    5: "Critical",
  };

  return map[normalized as HelpdeskPriority];
};

export type HelpdeskStageBucket = "new" | "active" | "resolved" | "archived";

export interface StageBucketInput {
  name?: string | null;
  isClosed?: boolean | null;
  isFolded?: boolean | null;
}

export const normalizeHelpdeskStageBucket = (stage: StageBucketInput): HelpdeskStageBucket => {
  const label = (stage.name ?? "").toLowerCase().trim();

  if (stage.isClosed || label.includes("resolved") || label.includes("done") || label.includes("closed")) {
    return "resolved";
  }

  if (stage.isFolded || label.includes("cancel") || label.includes("archive")) {
    return "archived";
  }

  if (label.includes("new") || label.includes("triage") || label.includes("open")) {
    return "new";
  }

  return "active";
};

export type SlaBadgeStatus = "on_track" | "at_risk" | "breached" | "no_sla";

interface SlaBadgeStatusInput {
  deadline?: string | null;
  closedAt?: string | null;
  now?: Date;
}

export const normalizeSlaBadgeStatus = ({ deadline, closedAt, now = new Date() }: SlaBadgeStatusInput): SlaBadgeStatus => {
  if (!deadline) return "no_sla";

  const deadlineTime = new Date(deadline).getTime();
  if (Number.isNaN(deadlineTime)) return "no_sla";

  if (closedAt) {
    const closedTime = new Date(closedAt).getTime();
    if (Number.isNaN(closedTime)) return "no_sla";
    return closedTime <= deadlineTime ? "on_track" : "breached";
  }

  const remainingMs = deadlineTime - now.getTime();
  if (remainingMs < 0) return "breached";

  const warningWindowMs = 1000 * 60 * 60 * 12;
  return remainingMs <= warningWindowMs ? "at_risk" : "on_track";
};
