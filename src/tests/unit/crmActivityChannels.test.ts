import { describe, expect, it } from "vitest";
import { filterActivitiesByTaskChannel, getTaskChannelLabel } from "@/features/admin/crm/activityChannels";

const activity = (task_channel: "todo" | "agent_todo") => ({ task_channel } as any);

describe("CRM task channels", () => {
  it("uses the requested operator-facing labels", () => {
    expect(getTaskChannelLabel("todo")).toBe("Todo");
    expect(getTaskChannelLabel("agent_todo")).toBe("Agent Todo");
  });

  it("filters activities without changing the all view", () => {
    const activities = [activity("todo"), activity("agent_todo")];
    expect(filterActivitiesByTaskChannel(activities, "all")).toEqual(activities);
    expect(filterActivitiesByTaskChannel(activities, "todo")).toEqual([activities[0]]);
    expect(filterActivitiesByTaskChannel(activities, "agent_todo")).toEqual([activities[1]]);
  });
});
