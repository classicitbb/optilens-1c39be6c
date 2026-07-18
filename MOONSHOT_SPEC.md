# Moonshot — Product Specification

> Extracted from the optilens-1c39be6c codebase before removal (2026-07-13).
> Rebuild target: ClassicVisions internal site with Supabase persistence.

---

## What Moonshot Is

A leadership operating system — EOS/Traction-inspired — for running quarterly planning, tracking business metrics, managing the org chart, running structured meetings, and coaching leadership through AI. Audience: leadership team only (not general staff). Multi-user, cross-device, shared data.

**Why it was removed from this repo:** It was built with localStorage-only persistence (Zustand `persist`), making all data local to a single browser/device. That makes multi-user collaboration impossible. Moving it to the internal site allows it to be rebuilt with proper Supabase backing from day one.

---

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `/moonshot/dashboard` | Dashboard | Configurable tile grid of key metrics — personal view of Rocks, To-Dos, Issues, Metrics, Core Values, Private Notes |
| `/moonshot/workspace` | Workspace | Shared tile grid — Headlines, Quick Links, team-wide metrics and rocks |
| `/moonshot/meetings` | Meetings list | All structured meetings with status (Scheduled / In Progress / Completed / Draft) |
| `/moonshot/meetings/new` | New Meeting | Create a meeting with title, frequency, attendees, agenda sections |
| `/moonshot/meetings/:id` | Meeting Detail | Run a meeting: check-in prompt/response, agenda sections with timers, to-dos, issues, meeting summary, end meeting |
| `/moonshot/scorecards` | Scorecards | Weekly/monthly metric scorecard view per owner — target vs actual, trend, history |
| `/moonshot/rocks` | Quarterly Rocks | OKR-style quarterly goals with owner, due date, % complete, status (On Track / At Risk / Off Track / Completed) |
| `/moonshot/todos` | To-Dos | Task list linked to meetings or standalone, owner + due date + complete flag |
| `/moonshot/issues` | Issues | Issue tracker with priority (High/Medium/Low), status (Open/In Progress/Resolved), identified/discussed/solved dates |
| `/moonshot/business-plan` | Business Plan | Two-panel: Future Focus (Core Values, BHAG, 3-Year Vision with revenue/MRR/NRR/margin/customers targets, marketing strategy, core focus, coaches & advisors, rich notes) + Short-Term Focus (1-year plan, quarterly goals, key initiatives, obstacles, rocks summary) |
| `/moonshot/tools` | Tools hub | Entry point for people-management tools |
| `/moonshot/tools/org-chart` | Org Chart | Visual tree of seats (not people). Seats have title, department, vacancy status (filled/vacant/actively-hiring/planned), parent/child relationships. Users are assigned to seats. Deleting a seat cascades to all child seats. |
| `/moonshot/tools/one-on-ones` | 1:1 Templates | Recurring 1:1 meeting templates with cadence (weekly/biweekly/monthly/quarterly), scheduled anchor date + time + timezone, participant list, agenda notes, talking points, private notes, shared notes, action items |
| `/moonshot/tools/right-person-right-seat` | Seat-Fit Reviews | Rate each user in each seat on: Values Match (0–5), Role Competency (0–5), Performance Confidence (0–5). Computed fit status: Great Fit / Good Fit / Stretch / Misaligned. Review cadence: monthly/quarterly/biannual. Notes + review date. |
| `/moonshot/users` | Users | Invite and manage Moonshot users. Fields: name, email, role, avatar initials, seat assignments (seatsUsed count), status (active/inactive), supervisor, invitation status (pending/sent/accepted) |
| `/moonshot/resources` | Resources | (Placeholder — link library / onboarding docs) |
| `/moonshot/settings` | Settings | Organisation-wide configuration (see Settings section below) |

---

## Data Entities

### MoonshotUser
```
id, name, email, role, avatar (initials string), seatsUsed (derived), seatIds[],
status (active|inactive), supervisorId?, invitation { status, pendingAt, sentAt?, acceptedAt? }, invitedEmail?
```

### Seat (Right Person Right Seat model)
```
id, name, department, reportsToSeatId?, capacity, seatType (leadership|management|individual),
roleExpectations?, competencyRubric?
```

### OrgChartSeat
```
id, title, department, vacancyStatus (filled|vacant|actively-hiring|planned),
parentId (null = root), childIds[], assignedUserIds[]
```

### Meeting
```
id, title, owner, date, status (Scheduled|Completed|Draft|In Progress),
notes, frequency (weekly|biweekly|monthly), duration (minutes),
attendeeIds[], agenda [{ id, title, minutes }],
checkInPrompt, checkInResponse, summary
```
Default agenda: Check-in (5m), Metrics (5m), Goals (5m), Headlines (5m), To-Dos (5m), Issues (60m), Wrap-up (5m).

### Metric
```
id, name, owner, target, actual, trend (up|down|flat), week,
frequency (daily|weekly|monthly|quarterly), unit (number|percent|currency),
points [{ date, value }]
```

### Rock (Quarterly Goal)
```
id, title, owner, dueDate, status (On Track|At Risk|Off Track|Completed),
percentComplete?, notes?, meetingId?
```

### Todo
```
id, title, owner, dueDate, completed, meetingId?
```

### Issue
```
id, title, owner, priority (High|Medium|Low), status (Open|In Progress|Resolved),
identified?, discussed?, solved?, meetingId?
```

### BusinessPlan
```
futureFocus: {
  coreValues: string[],
  bhag: string,
  threeYearVision: { revenue, mrr, nrr, grossMargin, customers },
  marketingStrategy: { targetMarket, differentiators, guarantee, process },
  coreFocus: string,
  coachesAndAdvisors: string,
  richNotes: string (sanitized HTML from rich text editor)
}
shortTermFocus: {
  oneYearPlan, quarterlyGoals, keyInitiatives, obstacles, rocksSummary, notes
}
```

### OneOnOneTemplate
```
id, title, cadence (weekly|biweekly|monthly|quarterly),
scheduleAnchorDate?, scheduleTime?, timeZone?,
participantIds[], agendaNotes, talkingPoints[],
privateNotes?, sharedNotes?,
actionItems [{ id, text, ownerId, dueDate, completed }],
createdBy, createdAt, updatedAt
```

### SeatFitReview
```
id, userId, seatId,
valuesMatch (0–5), roleCompetency (0–5), performanceConfidence (0–5),
fitStatus (Great fit|Good fit|Stretch|Misaligned),
reviewCadence (monthly|quarterly|biannual)?,
roleExpectations?, competencyRubric?,
notes, reviewDate, updatedAt
```

### WorkspaceTile
```
id, type (metrics|rocks|todos|issues|headlines|core-values|notes|quick-links),
title, colSpan (1|2|3|4)
```
Two tile grids exist: `dashboard` (personal) and `workspace` (shared). Both support add, remove, reorder (drag), and resize.

### MoonshotSettings
```
organizationName, enableZapier,
editOrgChartPermission (none|view|edit|admin),
addUpgradeUsersPermission, editDeleteUsersPermission,
managersAreAdmins, managerSeeOwnRocksAndKpisOnly,
supervisorsEditAccountabilities, employeesEditAccountabilities,
supervisorsRemoveUsers, supervisorsEditPositions,
allowRapidFireAcrossMeetings, allowGoodNewsAcrossMeetings,
allowAddingClientsAsUsers, sendEmailInvitationsByDefault,
currentQuarter, timeZone, weekStart (Sunday|Monday),
dateFormat (dd-mm-yyyy|mm-dd-yyyy|yyyy-mm-dd),
numberFormat (1,234,567.90|1.234.567,90),
defaultActionEmailTime,
scorecardPeriod (Daily|Weekly|Monthly|Quarterly)
```

---

## UI Shell

- **Sidebar colour:** `#0f766e` (teal-700), active item `#14b8a6` (teal-400)
- **Sidebar width:** 280px expanded, 56px collapsed (icon-only with tooltips)
- **Collapsible:** Toggle button at sidebar mid-right edge
- **Mobile:** Drawer with backdrop overlay
- **Header:** Breadcrumb trail (Moonshot > Section > Sub-page) + user avatar dropdown
- **User dropdown:** Profile, Settings, theme switcher (Light/Dark/System), Logout
- **App launcher:** Rocket icon opens cross-app launcher shared with admin shell
- **Theme:** Inherits `next-themes` — Light/Dark/System, stored in `classic-visions-theme`

---

## State Actions (full list from store)

**Global:** `login`, `logout`, `setTheme`, `importDemoData`, `resetDemoData`, `updateSettings`

**Workspace tiles:** `addTile(scope, type)`, `removeTile(scope, id)`, `moveTile(scope, from, to)`, `resizeTile(scope, id, colSpan)`

**Meetings:** `addMeeting`, `updateMeeting`, `deleteMeeting`, `addAgendaSection`, `endMeeting`

**Metrics:** `addMetric`, `updateMetric`, `updateMetricPoint`, `deleteMetric`

**Rocks:** `addRock`, `updateRock`, `deleteRock`

**Todos:** `addTodo`, `updateTodo`, `deleteTodo`

**Issues:** `addIssue`, `updateIssue`, `deleteIssue`

**Business Plan:** `updateBusinessPlan` (sanitizes richNotes HTML before storing)

**Users:** `addUser`, `updateUser`, `deleteUser`

**Org Chart:** `addOrgSeat(parentId, {title, department})`, `updateOrgSeat`, `deleteOrgSeat` (cascades to children), `assignUserToSeat` (updates vacancyStatus + syncs seatsUsed counts)

**1:1s:** `addOneOnOne`, `updateOneOnOne`, `deleteOneOnOne`, `addOneOnOneActionItem`, `updateOneOnOneActionItem`, `deleteOneOnOneActionItem`

**Seat-Fit Reviews:** `addSeatFitReview`, `updateSeatFitReview`, `deleteSeatFitReview`

**Private content:** `updatePrivateNotes`

---

## AI Coach — Designed Architecture (not yet built)

A Moonshot-scoped coaching assistant was architecturally designed with strict data isolation. Key design decisions to carry forward:

**Scope:** Leadership + management context only. Never shares corpus with CRM, helpdesk, pricing, or operations.

**Retrieval sources:** meetings, issues, rocks, scorecards, business plan, strategic notes, org chart, 1:1s, right-person-right-seat reviews.

**Ranking policy:** Prioritise evidence by meeting recency, issue ownership, and rock/scorecard status impact. Org seat and 1:1 context injected when people-management coaching is requested.

**Module boundaries (server-side):**
- `coach_orchestration` — coordinates intent → retrieval → policy → attribution → analytics
- `coach_intent` — classifies leadership intents: meeting prep, blocker coaching, priority alignment
- `coach_retrieval` — ranked evidence fetch with strict Moonshot-only allow-list
- `coach_policy` — blocks out-of-scope responses, returns safe escalation on failure
- `coach_attribution` — attaches evidence citations in deterministic precedence order
- `coach_analytics` — separate telemetry namespace tracking decision velocity, issue closure cadence, rock completion confidence

**Guardrails:** All model/retrieval calls server-side only. Responses must cite Moonshot-only evidence. Policy failure blocks output entirely.

---

## Rebuild Notes

### Architecture changes required

1. **Supabase persistence** — Replace Zustand `persist` with React Query + Supabase tables. Zustand can remain as the optimistic client cache but must sync to the DB. All entities need Supabase tables.

2. **Multi-user real-time** — Use Supabase Realtime subscriptions on meetings, rocks, issues, and todos so leadership team sees live updates without refresh.

3. **Auth integration** — User identity comes from Supabase Auth (already wired in this repo via `AuthContext`). Map `auth.users.id` to a `moonshot_users` profile table.

4. **Seat-fit and org chart** — Org chart seats are structural (not people). Vacancy status should update automatically when a user is assigned/removed.

5. **Tile layouts** — Dashboard tiles are personal (per-user), workspace tiles are shared (per-org). Store personal tiles in `moonshot_user_prefs`, shared tiles in `moonshot_workspace_config`.

6. **AI Coach** — Build the server-side modules as Supabase Edge Functions. Retrieval pulls from Supabase tables, not localStorage. Intent classification via Claude API with the architecture defined above.

7. **Business plan rich text** — The `futureFocus.richNotes` field uses sanitized HTML from a Tiptap editor. Ensure `sanitizeRichTextHtml` is available in the new repo.

### Suggested Supabase tables
```
moonshot_users          — profile + invitation status (FK: auth.users)
moonshot_seats          — right-person-right-seat seats
moonshot_org_seats      — org chart nodes
moonshot_org_assignments — user ↔ org seat mappings
moonshot_meetings       — meeting records
moonshot_agenda_sections — per meeting
moonshot_metrics        — scorecard metrics
moonshot_metric_points  — time-series data points
moonshot_rocks          — quarterly rocks
moonshot_todos          — to-do items
moonshot_issues         — issue log
moonshot_business_plan  — one row per org
moonshot_one_on_ones    — 1:1 templates
moonshot_one_on_one_items — action items per 1:1
moonshot_seat_fit_reviews — RPRS reviews
moonshot_workspace_tiles — shared workspace tile config
moonshot_user_prefs     — per-user tile config + private notes
moonshot_settings       — one row per org (org name, permissions, locale)
```

### Seed data available
The existing `seed.ts` file contains realistic demo data for all entities — users, meetings, metrics, rocks, todos, issues, org chart, 1:1s, seat-fit reviews, and settings. This can be used as fixture data for the rebuild.

---

## Files Removed from optilens-1c39be6c

```
src/features/admin/moonshot/MoonshotLayout.tsx
src/features/admin/moonshot/coach/moonshotCoachArchitecture.ts
src/features/admin/moonshot/components/MetricsTable.tsx
src/features/admin/moonshot/components/WorkspaceGrid.tsx
src/features/admin/moonshot/lib/seed.ts
src/features/admin/moonshot/lib/store.ts
src/features/admin/moonshot/lib/types.ts
src/pages/admin/moonshot/ (all 14 page files)
src/routes/moonshot/MoonshotRoutes.tsx
```

Route removed from `App.tsx`: `/admin/moonshot/*` → `MoonshotRoutes`
Route registry entry removed: `moonshot.root`
Apps config entry removed: `moonshot` from `ADMIN_APPS`
