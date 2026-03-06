export type MoonshotUser = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  seatsUsed: number;
  invitedEmail?: string;
};

export type AgendaSection = {
  id: string;
  title: string;
  minutes: number;
};

export type MetricFrequency = "daily" | "weekly" | "monthly" | "quarterly";

export type MetricPoint = {
  date: string;
  value: number;
};

export type Meeting = {
  id: string;
  title: string;
  owner: string;
  date: string;
  status: "Scheduled" | "Completed" | "Draft" | "In Progress";
  notes: string;
  frequency: "weekly" | "biweekly" | "monthly";
  duration: number;
  attendeeIds: string[];
  agenda: AgendaSection[];
  checkInPrompt: string;
  checkInResponse: string;
  summary: string;
};

export type Metric = {
  id: string;
  name: string;
  owner: string;
  target: number;
  actual: number;
  trend: "up" | "down" | "flat";
  week: string;
  frequency: MetricFrequency;
  unit: "number" | "percent" | "currency";
  points: MetricPoint[];
};

export type Rock = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "On Track" | "At Risk" | "Off Track" | "Completed";
  percentComplete?: number;
  notes?: string;
  meetingId?: string;
};

export type Todo = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  completed: boolean;
  meetingId?: string;
};

export type Issue = {
  id: string;
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  identified?: string;
  discussed?: string;
  solved?: string;
  meetingId?: string;
};

export type BusinessPlan = {
  futureFocus: {
    coreValues: string[];
    bhag: string;
    threeYearVision: {
      revenue: string;
      mrr: string;
      nrr: string;
      grossMargin: string;
      customers: string;
    };
    marketingStrategy: {
      targetMarket: string;
      differentiators: string;
      guarantee: string;
      process: string;
    };
    coreFocus: string;
    coachesAndAdvisors: string;
    richNotes: string;
  };
  shortTermFocus: {
    oneYearPlan: string;
    quarterlyGoals: string;
    keyInitiatives: string;
    obstacles: string;
    rocksSummary: string;
    notes: string;
  };
};

export type WorkspaceTileType = "metrics" | "rocks" | "todos" | "issues" | "headlines" | "core-values" | "notes" | "quick-links";

export type WorkspaceTile = {
  id: string;
  type: WorkspaceTileType;
  title: string;
  colSpan: 1 | 2 | 3 | 4;
};
