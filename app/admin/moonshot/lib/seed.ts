import { addDays, format } from "date-fns";
import { AgendaSection, BusinessPlan, Issue, Meeting, Metric, MoonshotUser, Rock, Todo } from "./types";

const today = new Date();

const bloomAgenda: AgendaSection[] = [
  { id: "a1", title: "Check-in", minutes: 5 },
  { id: "a2", title: "Metrics", minutes: 5 },
  { id: "a3", title: "Goals", minutes: 5 },
  { id: "a4", title: "Headlines", minutes: 5 },
  { id: "a5", title: "To-Dos", minutes: 5 },
  { id: "a6", title: "Issues", minutes: 60 },
  { id: "a7", title: "Wrap-up", minutes: 5 },
];

export const seedUsers: MoonshotUser[] = [
  { id: "u1", name: "Classic", role: "Admin", avatar: "CL", seatsUsed: 1 },
  { id: "u2", name: "Maya Brooks", role: "Integrator", avatar: "MB", seatsUsed: 1 },
  { id: "u3", name: "Russell Hunte", role: "Visionary", avatar: "RH", seatsUsed: 1 },
  { id: "u4", name: "Roy Hunte", role: "Sales", avatar: "RO", seatsUsed: 1 },
];

export const seedMeetings: Meeting[] = [
  {
    id: "m1",
    title: "Weekly Leadership",
    owner: "Classic",
    date: format(addDays(today, 1), "yyyy-MM-dd"),
    status: "Scheduled",
    notes: "Review scorecard + IDS top 3 issues",
    frequency: "weekly",
    duration: 90,
    attendeeIds: ["u1", "u2", "u3"],
    agenda: bloomAgenda,
    checkInPrompt: "Share good news from your week.",
    checkInResponse: "",
    summary: "",
  },
  {
    id: "m2",
    title: "Sales Weekly",
    owner: "Maya Brooks",
    date: format(addDays(today, 2), "yyyy-MM-dd"),
    status: "Scheduled",
    notes: "Pipeline, wins and blockers",
    frequency: "weekly",
    duration: 60,
    attendeeIds: ["u2", "u4"],
    agenda: bloomAgenda,
    checkInPrompt: "What was one win this week?",
    checkInResponse: "",
    summary: "",
  },
  {
    id: "m3",
    title: "Operations Weekly",
    owner: "Classic",
    date: format(addDays(today, 3), "yyyy-MM-dd"),
    status: "Draft",
    notes: "",
    frequency: "weekly",
    duration: 75,
    attendeeIds: ["u1", "u2"],
    agenda: bloomAgenda,
    checkInPrompt: "What's one thing you're grateful for today?",
    checkInResponse: "",
    summary: "",
  },
];

export const seedMetrics: Metric[] = [
  { id: "k1", name: "MRR", owner: "Classic", target: 180, actual: 172, trend: "up", week: "W1" },
  { id: "k2", name: "NPS", owner: "Maya Brooks", target: 60, actual: 54, trend: "flat", week: "W1" },
  { id: "k3", name: "Churn %", owner: "Classic", target: 3, actual: 4, trend: "down", week: "W1" },
];

export const seedRocks: Rock[] = [
  {
    id: "r1",
    title: "Launch self-serve onboarding",
    owner: "Classic",
    dueDate: format(addDays(today, 35), "yyyy-MM-dd"),
    status: "On Track",
  },
  {
    id: "r2",
    title: "Publish partner API docs",
    owner: "Maya Brooks",
    dueDate: format(addDays(today, 22), "yyyy-MM-dd"),
    status: "At Risk",
  },
];

export const seedTodos: Todo[] = [
  { id: "t1", title: "Draft onboarding script", owner: "Classic", dueDate: format(addDays(today, 2), "yyyy-MM-dd"), completed: false },
  { id: "t2", title: "Review legal terms", owner: "Maya Brooks", dueDate: format(addDays(today, 4), "yyyy-MM-dd"), completed: true },
];

export const seedIssues: Issue[] = [
  { id: "i1", title: "Trial conversion drop in SMB segment", owner: "Classic", priority: "High", status: "Open" },
  { id: "i2", title: "Support SLA misses on weekends", owner: "Maya Brooks", priority: "Medium", status: "In Progress" },
];

export const seedBusinessPlan: BusinessPlan = {
  vision: "Become the easiest growth OS for scaling service businesses.",
  strategy: "Win with fast onboarding, clear scorecards, and weekly accountability.",
  quarterlyFocus: "Improve activation by 20% while reducing churn below 3%.",
};
