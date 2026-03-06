export type MoonshotUser = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  seatsUsed: number;
  invitedEmail?: string;
};

export type Meeting = {
  id: string;
  title: string;
  owner: string;
  date: string;
  status: "Scheduled" | "Completed" | "Draft";
  notes: string;
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
  status: "On Track" | "At Risk" | "Off Track";
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
