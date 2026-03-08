import { addDays, format, subWeeks } from "date-fns";
import { AgendaSection, BusinessPlan, GoodNewsEntry, Issue, Meeting, Metric, MoonshotSettings, MoonshotUser, OneOnOneTemplate, RapidFireEntry, Rock, Seat, SeatFitReview, Todo } from "./types";

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

const weeklyPoints = (vals: number[]) => vals.map((value, idx) => ({ date: format(subWeeks(today, vals.length - idx - 1), "MMM d"), value }));

export const seedUsers: MoonshotUser[] = [
  { id: "u1", name: "Classic", email: "classic@visions.com", role: "Admin", avatar: "CL", seatsUsed: 1, seatIds: ["s1"], status: "active", invitation: { status: "accepted", pendingAt: "2024-01-05T09:00:00.000Z", sentAt: "2024-01-05T09:30:00.000Z", acceptedAt: "2024-01-05T10:00:00.000Z" } },
  { id: "u2", name: "Maya Brooks", email: "maya@visions.com", role: "Integrator", avatar: "MB", seatsUsed: 1, seatIds: ["s2"], supervisorId: "u1", status: "active", invitation: { status: "accepted", pendingAt: "2024-01-06T09:00:00.000Z", sentAt: "2024-01-06T09:30:00.000Z", acceptedAt: "2024-01-06T11:00:00.000Z" } },
  { id: "u3", name: "Russell Hunte", email: "russell@visions.com", role: "Visionary", avatar: "RH", seatsUsed: 1, seatIds: ["s3"], supervisorId: "u1", status: "active", invitation: { status: "sent", pendingAt: "2024-01-07T09:00:00.000Z", sentAt: "2024-01-07T09:45:00.000Z" } },
  { id: "u4", name: "Roy Hunte", email: "roy@visions.com", role: "Sales", avatar: "RO", seatsUsed: 1, seatIds: ["s4"], supervisorId: "u2", status: "inactive", invitation: { status: "pending", pendingAt: "2024-01-08T09:00:00.000Z" } },
];



export const seedSeats: Seat[] = [
  { id: "s1", name: "General Manager", department: "Leadership", seatType: "Leadership", capacity: 1 },
  { id: "s2", name: "Technology", department: "Operations", seatType: "Manager", capacity: 2, reportsToSeatId: "s1" },
  { id: "s3", name: "Finance", department: "Finance", seatType: "Individual Contributor", capacity: 1, reportsToSeatId: "s1" },
  { id: "s4", name: "Sales", department: "Sales", seatType: "Manager", capacity: 2, reportsToSeatId: "s1" },
];

export const seedOneOnOnes: OneOnOneTemplate[] = [
  {
    id: "o11_1",
    title: "Weekly Leadership 1:1",
    cadence: "weekly",
    participantIds: ["u1", "u2"],
    agendaNotes: "Review scorecard trends, team health, and key blockers.",
    actionItems: [
      { id: "o11a_1", text: "Follow up on onboarding handoff", ownerId: "u2", dueDate: format(addDays(today, 3), "yyyy-MM-dd"), completed: false },
      { id: "o11a_2", text: "Share customer retention update", ownerId: "u1", dueDate: format(addDays(today, 5), "yyyy-MM-dd"), completed: true },
    ],
    createdBy: "u1",
    createdAt: format(addDays(today, -21), "yyyy-MM-dd"),
    updatedAt: format(addDays(today, -1), "yyyy-MM-dd"),
  },
];

export const seedSeatFitReviews: SeatFitReview[] = [
  {
    id: "sfr_1",
    userId: "u3",
    seatId: "s1",
    valuesMatch: 5,
    roleCompetency: 4,
    performanceConfidence: 4,
    fitStatus: "Great fit",
    notes: "Strong cross-functional leadership and decision velocity.",
    reviewDate: format(addDays(today, 30), "yyyy-MM-dd"),
    updatedAt: format(today, "yyyy-MM-dd"),
  },
  {
    id: "sfr_2",
    userId: "u4",
    seatId: "s4",
    valuesMatch: 4,
    roleCompetency: 3,
    performanceConfidence: 3,
    fitStatus: "Good fit",
    notes: "Solid results; continue coaching on forecasting and pipeline hygiene.",
    reviewDate: format(addDays(today, 45), "yyyy-MM-dd"),
    updatedAt: format(today, "yyyy-MM-dd"),
  },
];

export const seedMeetings: Meeting[] = [
  { id: "m1", title: "Weekly Leadership", ownerId: "u1", date: format(addDays(today, 1), "yyyy-MM-dd"), status: "Scheduled", notes: "Review scorecard + IDS top 3 issues", frequency: "weekly", duration: 90, attendeeIds: ["u1", "u2", "u3"], agenda: bloomAgenda, checkInPrompt: "Share good news from your week.", checkInResponse: "", summary: "" },
  { id: "m2", title: "Sales Weekly", ownerId: "u2", date: format(addDays(today, 2), "yyyy-MM-dd"), status: "Scheduled", notes: "Pipeline, wins and blockers", frequency: "weekly", duration: 60, attendeeIds: ["u2", "u4"], agenda: bloomAgenda, checkInPrompt: "What was one win this week?", checkInResponse: "", summary: "" },
  { id: "m3", title: "Operations Weekly", ownerId: "u1", date: format(addDays(today, 3), "yyyy-MM-dd"), status: "Draft", notes: "", frequency: "weekly", duration: 75, attendeeIds: ["u1", "u2"], agenda: bloomAgenda, checkInPrompt: "What's one thing you're grateful for today?", checkInResponse: "", summary: "" },
];

export const seedMetrics: Metric[] = [
  { id: "k1", name: "Weekly Orders Received", ownerId: "u1", target: 150, actual: 172, trend: "up", week: "W1", frequency: "weekly", unit: "number", points: weeklyPoints([128, 142, 155, 163, 149, 172]) },
  { id: "k2", name: "Weekly Gross Profit Margin", ownerId: "u2", target: 40, actual: 37, trend: "down", week: "W1", frequency: "weekly", unit: "percent", points: weeklyPoints([41, 44, 39, 38, 35, 37]) },
  { id: "k3", name: "Weekly Churn", ownerId: "u1", target: 3, actual: 2.4, trend: "up", week: "W1", frequency: "weekly", unit: "percent", points: weeklyPoints([4.1, 3.8, 3.2, 3.1, 2.9, 2.4]) },
];

export const seedRocks: Rock[] = [
  { id: "r1", title: "Launch self-serve onboarding", ownerId: "u1", dueDate: format(addDays(today, 35), "yyyy-MM-dd"), status: "On Track", percentComplete: 72, notes: "UX finalized, engineering in progress", meetingId: "m1" },
  { id: "r2", title: "Publish partner API docs", ownerId: "u2", dueDate: format(addDays(today, 22), "yyyy-MM-dd"), status: "Off Track", percentComplete: 35, notes: "Awaiting legal review", meetingId: "m2" },
  { id: "r3", title: "Reduce churn below 3%", ownerId: "u3", dueDate: format(addDays(today, 48), "yyyy-MM-dd"), status: "Completed", percentComplete: 100, notes: "Completed early", meetingId: "m1" },
];

export const seedTodos: Todo[] = [
  { id: "t1", title: "Draft onboarding script", ownerId: "u1", dueDate: format(addDays(today, 2), "yyyy-MM-dd"), completed: false, meetingId: "m1" },
  { id: "t2", title: "Review legal terms", ownerId: "u2", dueDate: format(addDays(today, -1), "yyyy-MM-dd"), completed: false, meetingId: "m2" },
  { id: "t3", title: "Share churn analysis", ownerId: "u3", dueDate: format(addDays(today, 5), "yyyy-MM-dd"), completed: true, meetingId: "m1" },
];

export const seedIssues: Issue[] = [
  { id: "i1", title: "Trial conversion drop in SMB segment", ownerId: "u1", priority: "High", status: "Open", identified: "SMB trial-to-paid down 9%", discussed: "Need faster activation flow", solved: "", meetingId: "m1" },
  { id: "i2", title: "Support SLA misses on weekends", ownerId: "u2", priority: "Medium", status: "In Progress", identified: "Weekend backlog spikes", discussed: "Pilot rotation schedule", solved: "", meetingId: "m2" },
  { id: "i3", title: "Onboarding docs outdated", ownerId: "u4", priority: "Low", status: "Resolved", identified: "Mismatch with new UI", discussed: "Assign docs owner", solved: "Docs refreshed and published", meetingId: "m1" },
];


export const seedGoodNewsEntries: GoodNewsEntry[] = [
  { id: "gn1", message: "Customer NPS hit an all-time high this sprint.", ownerId: "u1", createdAt: format(addDays(today, -1), "yyyy-MM-dd"), meetingId: "m1" },
  { id: "gn2", message: "Sales team closed 3 expansion deals this week.", ownerId: "u2", createdAt: format(addDays(today, -2), "yyyy-MM-dd"), meetingId: "m2" },
  { id: "gn3", message: "Support CSAT improved after weekend rotation pilot.", ownerId: "u4", createdAt: format(addDays(today, -3), "yyyy-MM-dd") },
];

export const seedRapidFireEntries: RapidFireEntry[] = [
  { id: "rf1", topic: "Prioritize activation analytics instrumentation", ownerId: "u1", status: "Open", createdAt: format(addDays(today, -1), "yyyy-MM-dd"), meetingId: "m1" },
  { id: "rf2", topic: "Clarify ownership for partner onboarding", ownerId: "u2", status: "Discussed", createdAt: format(addDays(today, -2), "yyyy-MM-dd"), meetingId: "m2" },
  { id: "rf3", topic: "Turn churn analysis into action plan", ownerId: "u3", status: "Converted to Action", createdAt: format(addDays(today, -4), "yyyy-MM-dd"), meetingId: "m1" },
];

export const seedBusinessPlan: BusinessPlan = {
  futureFocus: {
    coreValues: ["Do the right thing", "Own outcomes", "Grow through learning", "Make it simple"],
    bhag: "Help 10,000 growth-stage businesses run better weekly meetings by 2032.",
    threeYearVision: {
      revenue: "$12M ARR",
      mrr: "$1M",
      nrr: "118%",
      grossMargin: "72%",
      customers: "2,500 active teams",
    },
    marketingStrategy: {
      targetMarket: "Service businesses between 10 and 250 employees.",
      differentiators: "Meeting-native execution with scorecards, IDS, and accountability in one workflow.",
      guarantee: "Show measurable weekly execution improvement in 90 days.",
      process: "Acquire through founder-led content + partner channels, activate with weekly playbooks.",
    },
    coreFocus: "Build the fastest path from weekly meetings to weekly outcomes.",
    coachesAndAdvisors: "EOS coach network, customer success advisors, RevOps mentor circle.",
    richNotes: "<p><strong>Future Focus Notes:</strong> keep product simple and outcome-driven.</p>",
  },
  shortTermFocus: {
    oneYearPlan: "Reach $250k MRR with a churn rate below 3%.",
    quarterlyGoals: "Improve activation by 20%, increase weekly active teams by 15%.",
    keyInitiatives: "Onboarding revamp, scorecard templates, coach certification pilot.",
    obstacles: "Inconsistent onboarding quality and slow implementation cycles.",
    rocksSummary: "Ship self-serve onboarding, publish partner API docs, improve SLA reliability.",
    notes: "Review this plan every weekly leadership meeting and update monthly.",
  },
};


export const seedSettings: MoonshotSettings = {
  organizationName: "Classic Visions",
  enableZapier: false,
  editOrgChartPermission: "admin",
  addUpgradeUsersPermission: "admin",
  editDeleteUsersPermission: "admin",
  managersAreAdmins: false,
  managerSeeOwnRocksAndKpisOnly: true,
  supervisorsEditAccountabilities: true,
  employeesEditAccountabilities: true,
  supervisorsRemoveUsers: false,
  supervisorsEditPositions: true,
  allowRapidFireAcrossMeetings: true,
  allowGoodNewsAcrossMeetings: true,
  allowAddingClientsAsUsers: false,
  sendEmailInvitationsByDefault: false,
  currentQuarter: "Q2 2024",
  timeZone: "(UTC-03:00) Paraguay Time",
  weekStart: "Sunday",
  dateFormat: "dd-mm-yyyy",
  numberFormat: "1,234,567.90",
  defaultActionEmailTime: "2 PM (GMT)",
  scorecardPeriod: "Weekly",
};
