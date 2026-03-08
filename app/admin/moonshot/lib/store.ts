"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedBusinessPlan, seedIssues, seedMeetings, seedMetrics, seedOneOnOnes, seedRocks, seedSeatFitReviews, seedSeats, seedSettings, seedTodos, seedUsers } from "./seed";
import { AgendaSection, BusinessPlan, Issue, Meeting, Metric, MoonshotSettings, MoonshotUser, OneOnOneActionItem, OneOnOneTemplate, Rock, Seat, SeatFitReview, Todo, WorkspaceTile, WorkspaceTileType } from "./types";

type TileScope = "dashboard" | "workspace";
type MoonshotTheme = "light" | "dark";

type MoonshotState = {
  currentUser: MoonshotUser | null;
  theme: MoonshotTheme;
  settings: MoonshotSettings;
  users: MoonshotUser[];
  seats: Seat[];
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
  addOneOnOne: (template: Omit<OneOnOneTemplate, "id" | "actionItems" | "createdAt" | "updatedAt"> & { actionItems?: Omit<OneOnOneActionItem, "id">[] }) => void;
  updateOneOnOne: (id: string, updates: Partial<Omit<OneOnOneTemplate, "id" | "actionItems">>) => void;
  deleteOneOnOne: (id: string) => void;
  addOneOnOneActionItem: (templateId: string, item: Omit<OneOnOneActionItem, "id" | "completed"> & { completed?: boolean }) => void;
  updateOneOnOneActionItem: (templateId: string, itemId: string, updates: Partial<OneOnOneActionItem>) => void;
  deleteOneOnOneActionItem: (templateId: string, itemId: string) => void;
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

const baseState = {
  currentUser: null,
  theme: "light" as MoonshotTheme,
  users: seedUsers,
  seats: seedSeats,
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

const updateTiles = (scope: TileScope, next: WorkspaceTile[]) => (scope === "dashboard" ? { dashboardTiles: next } : { workspaceTiles: next });

export const useMoonshotStore = create<MoonshotState>()(
  persist(
    (set) => ({
      ...baseState,
      login: () => set({ currentUser: seedUsers[0] }),
      logout: () => set({ currentUser: null }),
      setTheme: (theme) => set({ theme }),
      importDemoData: (payload) => set((s) => ({ ...s, ...payload })),
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
      addUser: (user) => set((s) => ({ users: [...s.users, { id: makeId("u"), ...user }] })),
      updateUser: (id, updates) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      addOneOnOne: (template) =>
        set((s) => ({
          oneOnOnes: [
            ...s.oneOnOnes,
            {
              id: makeId("o11"),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              actionItems: (template.actionItems ?? []).map((item) => ({ ...item, id: makeId("o11a"), completed: item.completed ?? false })),
              ...template,
            },
          ],
        })),
      updateOneOnOne: (id, updates) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((template) => (template.id === id ? { ...template, ...updates, updatedAt: new Date().toISOString() } : template)),
        })),
      deleteOneOnOne: (id) => set((s) => ({ oneOnOnes: s.oneOnOnes.filter((template) => template.id !== id) })),
      addOneOnOneActionItem: (templateId, item) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  updatedAt: new Date().toISOString(),
                  actionItems: [...template.actionItems, { ...item, id: makeId("o11a"), completed: item.completed ?? false }],
                }
              : template,
          ),
        })),
      updateOneOnOneActionItem: (templateId, itemId, updates) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  updatedAt: new Date().toISOString(),
                  actionItems: template.actionItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
                }
              : template,
          ),
        })),
      deleteOneOnOneActionItem: (templateId, itemId) =>
        set((s) => ({
          oneOnOnes: s.oneOnOnes.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  updatedAt: new Date().toISOString(),
                  actionItems: template.actionItems.filter((item) => item.id !== itemId),
                }
              : template,
          ),
        })),
      addSeatFitReview: (review) =>
        set((s) => ({
          seatFitReviews: [...s.seatFitReviews, { ...review, id: makeId("sfr"), updatedAt: new Date().toISOString() }],
        })),
      updateSeatFitReview: (id, updates) =>
        set((s) => ({
          seatFitReviews: s.seatFitReviews.map((review) => (review.id === id ? { ...review, ...updates, updatedAt: new Date().toISOString() } : review)),
        })),
      deleteSeatFitReview: (id) => set((s) => ({ seatFitReviews: s.seatFitReviews.filter((review) => review.id !== id) })),
    }),
    { name: "moonshot-store" },
  ),
);
