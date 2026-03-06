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
};

export type Rock = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "On Track" | "At Risk" | "Off Track" | "Completed";
};

export type Todo = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  completed: boolean;
};

export type Issue = {
  id: string;
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
};

export type BusinessPlan = {
  vision: string;
  strategy: string;
  quarterlyFocus: string;
};

export type WorkspaceTileType = "metrics" | "rocks" | "todos" | "issues" | "headlines" | "core-values" | "notes" | "quick-links";

export type WorkspaceTile = {
  id: string;
  type: WorkspaceTileType;
  title: string;
  colSpan: 1 | 2 | 3 | 4;
};
