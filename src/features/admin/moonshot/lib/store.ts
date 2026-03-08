import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedBusinessPlan, seedIssues, seedMeetings, seedMetrics, seedOneOnOnes, seedOrgChart, seedRocks, seedSeatFitReviews, seedSeats, seedSettings, seedTodos, seedUsers } from "./seed";
import type { AgendaSection, BusinessPlan, Issue, Meeting, Metric, MoonshotSettings, MoonshotUser, OneOnOneActionItem, OneOnOneTemplate, OrgChart, OrgChartSeat, Rock, Seat, SeatFitReview, Todo, WorkspaceTile, WorkspaceTileType } from "./types";

/** Migrate old flat businessPlan shape to the new nested one */
function migrateBusinessPlan(raw: unknown): BusinessPlan {
  if (raw && typeof raw === "object" && "futureFocus" in (raw as Record<string, unknown>)) {
    return raw as BusinessPlan;
  }
  return seedBusinessPlan;
}

type TileScope = "dashboard" | "workspace";
type MoonshotTheme = "light" | "dark";

type MoonshotState = {
  currentUser: MoonshotUser | null;
  theme: MoonshotTheme;
  settings: MoonshotSettings;
  users: MoonshotUser[];
  seats: Seat[];
  orgChart: OrgChart;
  oneOnOnes: OneOnOneTemplate[];
  seatFitReviews: SeatFitReview[];
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
  // Org Chart
  addOrgSeat: (parentId: string | null, seat: { title: string; department: string }) => void;
  updateOrgSeat: (id: string, updates: Partial<Pick<OrgChartSeat, "title" | "department">>) => void;
  deleteOrgSeat: (id: string) => void;
  assignUserToSeat: (seatId: string, userId: string | null) => void;
  // 1:1s
  addOneOnOne: (template: Omit<OneOnOneTemplate, "id" | "actionItems" | "createdAt" | "updatedAt"> & { actionItems?: Omit<OneOnOneActionItem, "id">[] }) => void;
  updateOneOnOne: (id: string, updates: Partial<Omit<OneOnOneTemplate, "id" | "actionItems">>) => void;
  deleteOneOnOne: (id: string) => void;
  addOneOnOneActionItem: (templateId: string, item: Omit<OneOnOneActionItem, "id" | "completed"> & { completed?: boolean }) => void;
  updateOneOnOneActionItem: (templateId: string, itemId: string, updates: Partial<OneOnOneActionItem>) => void;
  deleteOneOnOneActionItem: (templateId: string, itemId: string) => void;
  // Seat-fit reviews
  addSeatFitReview: (review: Omit<SeatFitReview, "id" | "updatedAt">) => void;
  updateSeatFitReview: (id: string, updates: Partial<Omit<SeatFitReview, "id">>) => void;
  deleteSeatFitReview: (id: string) => void;
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
  currentUser: null as MoonshotUser | null,
  theme: "light" as MoonshotTheme,
  users: seedUsers,
  seats: seedSeats,
  orgChart: seedOrgChart,
  oneOnOnes: seedOneOnOnes,
  seatFitReviews: seedSeatFitReviews,
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
      deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      // ─── Org Chart ───
      addOrgSeat: (parentId, seat) =>
        set((s) => {
          const newId = makeId("org");
          const newSeat: OrgChartSeat = { id: newId, title: seat.title, department: seat.department, parentId, childIds: [], assignedUserIds: [] };
          const seats = parentId
            ? s.orgChart.seats.map((existing) => (existing.id === parentId ? { ...existing, childIds: [...existing.childIds, newId] } : existing))
            : s.orgChart.seats;
          return { orgChart: { seats: [...seats, newSeat] } };
        }),
      updateOrgSeat: (id, updates) =>
        set((s) => ({
          orgChart: { seats: s.orgChart.seats.map((seat) => (seat.id === id ? { ...seat, ...updates } : seat)) },
        })),
      deleteOrgSeat: (id) =>
        set((s) => {
          const nextSeats = removeSeatBranch(s.orgChart.seats, id);
          const orgChart = { seats: nextSeats };
          return { orgChart, users: syncSeatUsage(s.users, orgChart) };
        }),
      assignUserToSeat: (seatId, userId) =>
        set((s) => {
          const orgChart = {
            seats: s.orgChart.seats.map((seat) =>
              seat.id === seatId
                ? { ...seat, assignedUserIds: userId ? [userId] : [] }
                : seat,
            ),
          };
          return { orgChart, users: syncSeatUsage(s.users, orgChart) };
        }),
      // ─── 1:1s ───
      addOneOnOne: (template) =>
        set((s) => {
          const actionItems: OneOnOneActionItem[] = (template.actionItems ?? []).map((item) => ({
            text: item.text,
            ownerId: item.ownerId,
            dueDate: item.dueDate,
            id: makeId("o11a"),
            completed: (item as any).completed ?? false,
          }));
          const newTemplate: OneOnOneTemplate = {
            id: makeId("o11"),
            title: template.title,
            cadence: template.cadence,
            participantIds: template.participantIds,
            agendaNotes: template.agendaNotes,
            createdBy: template.createdBy,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            actionItems,
          };
          return { oneOnOnes: [...s.oneOnOnes, newTemplate] };
        }),
      updateOneOnOne: (id, updates) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)),
        })),
      deleteOneOnOne: (id) => set((s) => ({ oneOnOnes: s.oneOnOnes.filter((t) => t.id !== id) })),
      addOneOnOneActionItem: (templateId, item) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((t) =>
            t.id === templateId
              ? { ...t, updatedAt: new Date().toISOString(), actionItems: [...t.actionItems, { ...item, id: makeId("o11a"), completed: item.completed ?? false }] }
              : t,
          ),
        })),
      updateOneOnOneActionItem: (templateId, itemId, updates) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((t) =>
            t.id === templateId
              ? { ...t, updatedAt: new Date().toISOString(), actionItems: t.actionItems.map((a) => (a.id === itemId ? { ...a, ...updates } : a)) }
              : t,
          ),
        })),
      deleteOneOnOneActionItem: (templateId, itemId) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((t) =>
            t.id === templateId
              ? { ...t, updatedAt: new Date().toISOString(), actionItems: t.actionItems.filter((a) => a.id !== itemId) }
              : t,
          ),
        })),
      // ─── Seat-fit reviews ───
      addSeatFitReview: (review) =>
        set((s) => ({
          seatFitReviews: [...s.seatFitReviews, { ...review, id: makeId("sfr"), updatedAt: new Date().toISOString() }],
        })),
      updateSeatFitReview: (id, updates) =>
        set((s) => ({
          seatFitReviews: s.seatFitReviews.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)),
        })),
      deleteSeatFitReview: (id) => set((s) => ({ seatFitReviews: s.seatFitReviews.filter((r) => r.id !== id) })),
    }),
    {
      name: "moonshot-store",
      merge: (persisted, current) => {
        const p = persisted as Record<string, unknown> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          businessPlan: migrateBusinessPlan(p.businessPlan),
          orgChart: p.orgChart && typeof p.orgChart === "object" && "seats" in (p.orgChart as Record<string, unknown>) ? p.orgChart as OrgChart : seedOrgChart,
          seats: Array.isArray(p.seats) ? p.seats as Seat[] : seedSeats,
          oneOnOnes: Array.isArray(p.oneOnOnes) ? p.oneOnOnes as OneOnOneTemplate[] : seedOneOnOnes,
          seatFitReviews: Array.isArray(p.seatFitReviews) ? p.seatFitReviews as SeatFitReview[] : seedSeatFitReviews,
          settings: p.settings && typeof p.settings === "object" && "organizationName" in (p.settings as Record<string, unknown>) ? p.settings as MoonshotSettings : seedSettings,
        };
      },
    },
  ),
);
