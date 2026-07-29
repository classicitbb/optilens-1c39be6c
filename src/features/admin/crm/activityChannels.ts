export const TASK_CHANNELS = ["todo", "agent_todo"] as const;
export type ActivityTaskChannel = (typeof TASK_CHANNELS)[number];

export const TASK_CHANNEL_LABELS: Record<ActivityTaskChannel, string> = {
  todo: "Todo",
  agent_todo: "Agent Todo",
};

export const getTaskChannelLabel = (channel: ActivityTaskChannel) => TASK_CHANNEL_LABELS[channel];

export const filterActivitiesByTaskChannel = <T extends { task_channel: ActivityTaskChannel }>(
  activities: T[],
  channel: ActivityTaskChannel | "all",
): T[] => channel === "all" ? activities : activities.filter((activity) => activity.task_channel === channel);
