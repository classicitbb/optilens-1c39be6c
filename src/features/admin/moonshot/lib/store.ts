import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedBusinessPlan, seedIssues, seedMeetings, seedMetrics, seedRocks, seedTodos, seedUsers } from "./seed";
import type { BusinessPlan, Issue, Meeting, Metric, MoonshotUser, Rock, Todo } from "./types";

type MoonshotState = {
  currentUser: MoonshotUser | null;
  users: MoonshotUser[];
  meetings: Meeting[];
  metrics: Metric[];
  rocks: Rock[];
  todos: Todo[];
  issues: Issue[];
  businessPlan: BusinessPlan;
  login: () => void;
  logout: () => void;
  resetDemoData: () => void;
  addMeeting: (meeting: Omit<Meeting, "id">) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addMetric: (metric: Omit<Metric, "id">) => void;
  updateMetric: (id: string, updates: Partial<Metric>) => void;
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
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const baseState = {
  currentUser: null as MoonshotUser | null,
  users: seedUsers,
  meetings: seedMeetings,
  metrics: seedMetrics,
  rocks: seedRocks,
  todos: seedTodos,
  issues: seedIssues,
  businessPlan: seedBusinessPlan,
};

export const useMoonshotStore = create<MoonshotState>()(
  persist(
    (set) => ({
      ...baseState,
      login: () => set({ currentUser: seedUsers[0] }),
      logout: () => set({ currentUser: null }),
      resetDemoData: () => {
        localStorage.removeItem("moonshot-store");
        set({ ...baseState, currentUser: seedUsers[0] });
      },
      addMeeting: (meeting) => set((s) => ({ meetings: [...s.meetings, { id: makeId("m"), ...meeting }] })),
      updateMeeting: (id, updates) => set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
      deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
      addMetric: (metric) => set((s) => ({ metrics: [...s.metrics, { id: makeId("k"), ...metric }] })),
      updateMetric: (id, updates) => set((s) => ({ metrics: s.metrics.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
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
    }),
    { name: "moonshot-store" },
  ),
);
