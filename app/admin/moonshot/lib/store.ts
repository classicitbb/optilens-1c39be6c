"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedBusinessPlan, seedIssues, seedMeetings, seedMetrics, seedOrgChart, seedRocks, seedSettings, seedTodos, seedUsers } from "./seed";
import { AgendaSection, BusinessPlan, Issue, Meeting, Metric, MoonshotSettings, MoonshotUser, OrgChart, OrgChartSeat, Rock, Todo, WorkspaceTile, WorkspaceTileType } from "./types";

type TileScope = "dashboard" | "workspace";
type MoonshotTheme = "light" | "dark";

type MoonshotState = {
  currentUser: MoonshotUser | null;
  theme: MoonshotTheme;
  settings: MoonshotSettings;
  users: MoonshotUser[];
  orgChart: OrgChart;
  meetings: Meeting[];
  metrics: Metric[];
  rocks: Rock[];
  todos: Todo[];
  issues: Issue[];
  businessPlan: BusinessPlan;
  coreValues: string[];
  privateNotes: string;
  headlines: string[];
  quickLinks: { label: string; href: string }[];
  dashboardTiles: WorkspaceTile[];
  workspaceTiles: WorkspaceTile[];
  login: () => void;
  logout: () => void;
  setTheme: (theme: MoonshotTheme) => void;
  importDemoData: (payload: Partial<MoonshotState>) => void;
  resetDemoData: () => void;
  updateSettings: (updates: Partial<MoonshotSettings>) => void;
  addTile: (scope: TileScope, type: WorkspaceTileType) => void;
  removeTile: (scope: TileScope, id: string) => void;
  moveTile: (scope: TileScope, from: number, to: number) => void;
  resizeTile: (scope: TileScope, id: string, colSpan: WorkspaceTile["colSpan"]) => void;
  updatePrivateNotes: (notes: string) => void;
  addMeeting: (meeting: Omit<Meeting, "id" | "agenda" | "checkInPrompt" | "checkInResponse" | "summary"> & Partial<Pick<Meeting, "agenda" | "checkInPrompt" | "checkInResponse" | "summary">>) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addAgendaSection: (meetingId: string, section: Omit<AgendaSection, "id">) => void;
  endMeeting: (meetingId: string) => void;
  addMetric: (metric: Omit<Metric, "id" | "points" | "actual"> & Partial<Pick<Metric, "points" | "actual">>) => void;
  updateMetric: (id: string, updates: Partial<Metric>) => void;
  updateMetricPoint: (id: string, date: string, value: number) => void;
  deleteMetric: (id: string) => void;
  addRock: (rock: Omit<Rock, "id">) => void;
  updateRock: (id: string, updates: Partial<Rock>) => void;
  deleteRock: (id: string) => void;
  addTodo: (todo: Omit<Todo, "id">) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  addIssue: (issue: Omit<Issue, "id">) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  updateBusinessPlan: (plan: Partial<BusinessPlan>) => void;
  addUser: (user: Omit<MoonshotUser, "id">) => void;
  updateUser: (id: string, updates: Partial<MoonshotUser>) => void;
  deleteUser: (id: string) => void;
  addOrgSeat: (parentId: string | null, payload: Pick<OrgChartSeat, "title" | "department">) => void;
  updateOrgSeat: (id: string, updates: Partial<Pick<OrgChartSeat, "title" | "department">>) => void;
  assignUserToSeat: (seatId: string, userId: string | null) => void;
  deleteOrgSeat: (id: string) => void;
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const tileLabelMap: Record<WorkspaceTileType, string> = {
  metrics: "My Metrics",
  rocks: "My Quarterly Rocks",
  todos: "My To-Dos",
  issues: "Open Issues",
  headlines: "Headlines",
  "core-values": "Core Values",
  notes: "Private Notes",
  "quick-links": "Quick Links",
};

const makeTile = (type: WorkspaceTileType, colSpan: WorkspaceTile["colSpan"] = 1): WorkspaceTile => ({
  id: makeId("tile"),
  type,
  title: tileLabelMap[type],
  colSpan,
});

const defaultAgenda: AgendaSection[] = [
  { id: "a1", title: "Check-in", minutes: 5 },
  { id: "a2", title: "Metrics", minutes: 5 },
  { id: "a3", title: "Goals", minutes: 5 },
  { id: "a4", title: "Headlines", minutes: 5 },
  { id: "a5", title: "To-Dos", minutes: 5 },
  { id: "a6", title: "Issues", minutes: 60 },
  { id: "a7", title: "Wrap-up", minutes: 5 },
];

const defaultDashboardTiles = [makeTile("metrics", 2), makeTile("rocks"), makeTile("todos"), makeTile("issues"), makeTile("core-values"), makeTile("notes", 2)];
const defaultWorkspaceTiles = [makeTile("headlines", 2), makeTile("quick-links", 2), makeTile("metrics"), makeTile("rocks"), makeTile("todos"), makeTile("issues"), makeTile("core-values"), makeTile("notes", 2)];

const updateTiles = (scope: TileScope, next: WorkspaceTile[]) => (scope === "dashboard" ? { dashboardTiles: next } : { workspaceTiles: next });

const syncSeatUsage = (users: MoonshotUser[], orgChart: OrgChart): MoonshotUser[] => {
  const usage = orgChart.seats.reduce<Record<string, number>>((acc, seat) => {
    seat.assignedUserIds.forEach((userId) => {
      acc[userId] = (acc[userId] ?? 0) + 1;
    });
    return acc;
  }, {});

  return users.map((user) => ({ ...user, seatsUsed: usage[user.id] ?? 0 }));
};

const removeSeatBranch = (seats: OrgChartSeat[], id: string): OrgChartSeat[] => {
  const byId = new Map(seats.map((seat) => [seat.id, seat]));
  const toRemove = new Set<string>();

  const walk = (seatId: string) => {
    const seat = byId.get(seatId);
    if (!seat || toRemove.has(seatId)) return;
    toRemove.add(seatId);
    seat.childIds.forEach(walk);
  };

  walk(id);

  return seats
    .filter((seat) => !toRemove.has(seat.id))
    .map((seat) => ({ ...seat, childIds: seat.childIds.filter((childId) => !toRemove.has(childId)) }));
};

const baseState = {
  currentUser: null,
  theme: "light" as MoonshotTheme,
  users: syncSeatUsage(seedUsers, seedOrgChart),
  orgChart: seedOrgChart,
  settings: seedSettings,
  meetings: seedMeetings,
  metrics: seedMetrics,
  rocks: seedRocks,
  todos: seedTodos,
  issues: seedIssues,
  businessPlan: seedBusinessPlan,
  coreValues: ["Do the right thing", "Own the outcome", "Be curious", "Keep commitments"],
  privateNotes: "Capture your private notes from meetings and weekly priorities here.",
  headlines: ["Q2 onboarding launch on track", "Retention improved +3% this month"],
  quickLinks: [
    { label: "All Meetings", href: "/admin/moonshot/meetings" },
    { label: "Scorecards", href: "/admin/moonshot/scorecards" },
    { label: "Quarterly Rocks", href: "/admin/moonshot/rocks" },
  ],
  dashboardTiles: defaultDashboardTiles,
  workspaceTiles: defaultWorkspaceTiles,
};

export const useMoonshotStore = create<MoonshotState>()(
  persist(
    (set) => ({
      ...baseState,
      login: () => set({ currentUser: seedUsers[0] }),
      logout: () => set({ currentUser: null }),
      setTheme: (theme) => set({ theme }),
      importDemoData: (payload) =>
        set((s) => {
          const next = { ...s, ...payload };
          const orgChart = payload.orgChart ?? s.orgChart;
          return { ...next, orgChart, users: syncSeatUsage(next.users, orgChart) };
        }),
      resetDemoData: () => set({ ...baseState, currentUser: seedUsers[0], dashboardTiles: defaultDashboardTiles, workspaceTiles: defaultWorkspaceTiles }),
      updateSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates } })),
      addTile: (scope, type) =>
        set((s) => {
          const tiles = scope === "dashboard" ? s.dashboardTiles : s.workspaceTiles;
          return updateTiles(scope, [...tiles, makeTile(type)]);
        }),
      removeTile: (scope, id) =>
        set((s) => {
          const tiles = scope === "dashboard" ? s.dashboardTiles : s.workspaceTiles;
          return updateTiles(scope, tiles.filter((tile) => tile.id !== id));
        }),
      moveTile: (scope, from, to) =>
        set((s) => {
          const tiles = [...(scope === "dashboard" ? s.dashboardTiles : s.workspaceTiles)];
          if (from < 0 || to < 0 || from >= tiles.length || to >= tiles.length) return {};
          const [item] = tiles.splice(from, 1);
          tiles.splice(to, 0, item);
          return updateTiles(scope, tiles);
        }),
      resizeTile: (scope, id, colSpan) =>
        set((s) => {
          const tiles = (scope === "dashboard" ? s.dashboardTiles : s.workspaceTiles).map((tile) => (tile.id === id ? { ...tile, colSpan } : tile));
          return updateTiles(scope, tiles);
        }),
      updatePrivateNotes: (privateNotes) => set({ privateNotes }),
      addMeeting: (meeting) => set((s) => ({ meetings: [...s.meetings, { id: makeId("m"), agenda: meeting.agenda ?? defaultAgenda, checkInPrompt: meeting.checkInPrompt ?? "Share good news...", checkInResponse: meeting.checkInResponse ?? "", summary: meeting.summary ?? "", ...meeting }] })),
      updateMeeting: (id, updates) => set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
      deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
      addAgendaSection: (meetingId, section) => set((s) => ({ meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, agenda: [...m.agenda, { ...section, id: makeId("ag") }] } : m)) })),
      endMeeting: (meetingId) => set((s) => ({ meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, status: "Completed", summary: `Meeting complete. ${s.todos.filter((t) => t.completed).length}/${s.todos.length} to-dos complete, ${s.issues.filter((i) => i.status === "Resolved").length} issues resolved.` } : m)) })),
      addMetric: (metric) => set((s) => ({ metrics: [...s.metrics, { id: makeId("k"), frequency: metric.frequency ?? "weekly", unit: metric.unit ?? "number", points: metric.points ?? [{ date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: metric.actual ?? 0 }], actual: metric.actual ?? metric.target, ...metric }] })),
      updateMetric: (id, updates) => set((s) => ({ metrics: s.metrics.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
      updateMetricPoint: (id, date, value) => set((s) => ({ metrics: s.metrics.map((m) => { if (m.id !== id) return m; const exists = m.points.some((p) => p.date === date); const points = exists ? m.points.map((p) => (p.date === date ? { ...p, value } : p)) : [...m.points, { date, value }]; return { ...m, points, actual: points[points.length - 1]?.value ?? m.actual }; }) })),
      deleteMetric: (id) => set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) })),
      addRock: (rock) => set((s) => ({ rocks: [...s.rocks, { id: makeId("r"), ...rock }] })),
      updateRock: (id, updates) => set((s) => ({ rocks: s.rocks.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
      deleteRock: (id) => set((s) => ({ rocks: s.rocks.filter((r) => r.id !== id) })),
      addTodo: (todo) => set((s) => ({ todos: [...s.todos, { id: makeId("t"), ...todo }] })),
      updateTodo: (id, updates) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      addIssue: (issue) => set((s) => ({ issues: [...s.issues, { id: makeId("i"), ...issue }] })),
      updateIssue: (id, updates) => set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
      deleteIssue: (id) => set((s) => ({ issues: s.issues.filter((i) => i.id !== id) })),
      updateBusinessPlan: (plan) => set((s) => ({ businessPlan: { ...s.businessPlan, ...plan } })),
      addUser: (user) =>
        set((s) => {
          const users = [...s.users, { id: makeId("u"), ...user, seatsUsed: 0 }];
          return { users: syncSeatUsage(users, s.orgChart) };
        }),
      updateUser: (id, updates) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)) })),
      deleteUser: (id) =>
        set((s) => {
          const orgChart = {
            seats: s.orgChart.seats.map((seat) => ({ ...seat, assignedUserIds: seat.assignedUserIds.filter((userId) => userId !== id) })),
          };
          const users = s.users.filter((u) => u.id !== id);
          return { orgChart, users: syncSeatUsage(users, orgChart) };
        }),
      addOrgSeat: (parentId, payload) =>
        set((s) => {
          const seatId = makeId("seat");
          const seats = [
            ...s.orgChart.seats.map((seat) =>
              seat.id === parentId
                ? {
                    ...seat,
                    childIds: [...seat.childIds, seatId],
                  }
                : seat,
            ),
            { id: seatId, title: payload.title, department: payload.department, parentId, childIds: [], assignedUserIds: [] },
          ];
          return { orgChart: { seats } };
        }),
      updateOrgSeat: (id, updates) =>
        set((s) => ({
          orgChart: {
            seats: s.orgChart.seats.map((seat) => (seat.id === id ? { ...seat, ...updates } : seat)),
          },
        })),
      assignUserToSeat: (seatId, userId) =>
        set((s) => {
          const orgChart = {
            seats: s.orgChart.seats.map((seat) => (seat.id === seatId ? { ...seat, assignedUserIds: userId ? [userId] : [] } : seat)),
          };
          return { orgChart, users: syncSeatUsage(s.users, orgChart) };
        }),
      deleteOrgSeat: (id) =>
        set((s) => {
          const orgChart = { seats: removeSeatBranch(s.orgChart.seats, id) };
          return { orgChart, users: syncSeatUsage(s.users, orgChart) };
        }),
    }),
    { name: "moonshot-store" },
  ),
);
