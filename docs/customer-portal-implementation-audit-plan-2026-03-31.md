# Customer/Admin Portal Deep Implementation Audit & Execution Plan (2026-03-31)

## 1) Repo audit summary (actual current implementation)

### 1.1 Routing and shell structure
- Frontend shell domains are split in `src/App.tsx` into public (`PublicRoutes`), portal (`PortalRoutes`), admin (`AdminRoutes`), ops, and moonshot routes.
- Customer portal routes live under `/profile/*` and are protected by `ProtectedRoute` + `AccountLayout`.
- Admin routes are centralized in `src/routes/admin/AdminRoutes.tsx`; several routes still point to generic `PlaceholderPage`.
- Route registry exists in `src/config/routeRegistry.ts`, but route status metadata is not currently used as an enforcement layer.

### 1.2 Admin customer-portal controls
- Admin portal operations are concentrated in `src/pages/admin/WebsitePortalsPage.tsx`.
- It can:
  - View customers and portal status.
  - Toggle per-user feature overrides in `customer_portal_feature_overrides`.
  - Assign a customer pricelist (`customers.assigned_pricelist_id`).
  - Run abandoned cart scans and resolve alerts.
  - Place orders on behalf of customers.
  - Edit customer addresses and payment methods via shared portal sections.
- Customer-side feature checks use `usePortalIdentity` + `PortalFeatureGate` + `AccountSidebar` disabled state.

### 1.3 Profile completion and identity sync
- Profile completion state is computed server-side in `sync_customer_portal_identity` (full name + phone required; email verification considered).
- Status and note are persisted to `profiles.portal_access_status` and `profiles.portal_access_note`.
- Customer profile edit exists (`MyAccountSection`) and triggers identity resync after save.

### 1.4 What currently works
- Access status lifecycle (`pending_verification`, `pending_profile`, `pending_approval`, `approved_customer`) exists and is surfaced in customer/admin UI.
- Customer address and payment method CRUD are functional and reusable on admin for edit-on-behalf.
- Admin notification bell loads DB notifications (`admin_notifications`) plus runtime/task/sync sources.
- Abandoned cart automation has DB entities and RPC (`queue_abandoned_cart_alerts`) integrated into admin UI.

### 1.5 What is cosmetic / partially wired
- Customer portal feature pages are placeholders:
  - Quotes: “will be available shortly”.
  - Helpdesk feed: placeholder.
  - Assigned pricelists: placeholder.
- Customer top bar contains a disabled Search control and non-wired notification/help actions.
- Admin notification read/dismiss state is client-local (`localStorage`), not server-authoritative.
- Feature override toggles are present, but no explicit backend feature authorization contract exists for each capability (route/UI gate exists; server action gate not generalized).

### 1.6 What is missing entirely
- Real-time user/admin online presence model (no presence table, heartbeat, or realtime subscription path for online/idle/offline).
- Customer-visible support availability from admin presence.
- Server-backed per-user notification state (read/dismiss/audit).
- Complete profile schema and actionable deep-link alerts to exact missing-field forms.
- Systematic placeholder inventory for all app surfaces with disposition (implement/hide/gate/remove).

---

## 2) Relevant implementation surfaces

## 2.1 Routes / pages / layouts
- Shell and route entry: `src/App.tsx`
- Portal routes: `src/routes/portal/PortalRoutes.tsx`
- Portal layout/topbar/sidebar: `src/components/account/AccountLayout.tsx`, `AccountTopBar.tsx`, `AccountSidebar.tsx`
- Portal pages: `src/pages/Profile.tsx`, `src/components/account/sections/*`
- Admin routes: `src/routes/admin/AdminRoutes.tsx`
- Admin portal ops page: `src/pages/admin/WebsitePortalsPage.tsx`

### 2.2 Hooks/services/auth points
- Customer identity & feature access: `src/hooks/usePortalIdentity.ts`
- Auth bootstrap and profile sync trigger: `src/contexts/AuthContext.tsx`
- Admin role and protected routes: `src/hooks/useUserRole.ts`, `src/components/admin/AdminProtectedRoute.tsx`, `src/components/ProtectedRoute.tsx`
- Addresses/payments shared hooks: `src/hooks/useCustomerAddresses.ts`, `src/hooks/useCustomerPaymentMethods.ts`
- Notifications: `src/features/admin/notifications/useAdminNotifications.ts`, `src/components/admin/NotificationBell.tsx`

### 2.3 DB tables / RPC / policy-affecting schema
- Identity sync function and status columns: `supabase/migrations/20260320123000_customer_portal_identity_sync.sql`
- Portal feature overrides, admin notifications, automation tables: `supabase/migrations/20260321133000_customer_commerce_and_portal_ops.sql`
- Current generated schema snapshot: `src/integrations/supabase/types.ts`

---

## 3) Gap analysis by requested feature area

### 3.1 Admin feature controls (quotes, pricelists, restricted capabilities)
**Current:**
- Admin can write `customer_portal_feature_overrides` and assign pricelist in `customers`.
- Customer UI uses these values for route gates + nav disabled state.

**Gap:**
- Enforcement is not codified as a backend authorization layer for every portal operation; current pattern is mostly UI-driven checks.
- Some destination pages are placeholders, so override semantics are not fully testable end-to-end.

**Plan:**
1. Introduce a server-authoritative “portal capability check” function (RPC or secured view) that resolves identity status + override + capability key in one place.
2. Require that server mutations/queries for customer portal capabilities pass this check (RLS helper or RPC guard).
3. Keep UI gate (`PortalFeatureGate`) but treat it as UX only; backend is source of truth.
4. Add contract tests for allowed/denied states by role + status + override.

### 3.2 Profile completeness
**Current:**
- Completion = full name + phone (+ email verification status affects unlock flow).
- UI shows status badges and note.

**Gap:**
- No explicit, versioned profile completeness schema with required/optional fields across profile/company/billing/shipping/account.
- No shared validator between customer and admin flows for full completeness state.

**Plan:**
1. Define `profile_completeness_rules` domain model (code + DB optional) with required fields by workflow:
   - Base profile: full_name, phone, organization_name.
   - Checkout readiness: at least one shipping address; billing rule; payment method optional if manual review allowed.
   - Customer portal readiness: verified email + CRM link conditions from sync function.
2. Add single shared completeness evaluator (server-first, typed return payload).
3. Expose missing field descriptors with deterministic keys and deep links.

### 3.3 Alert-to-form navigation
**Current:**
- Access notice links only to `/profile/account` (coarse).

**Gap:**
- No section/tab/field deep-link routing for missing info alerts.

**Plan:**
1. Add URL fragment/query deep-link convention, e.g.:
   - `/profile/account?focus=full_name`
   - `/profile/address-book?focus=add_address`
   - `/profile/payment-methods?focus=add_card`
2. Build shared “missing requirement mapper” that outputs action links.
3. Ensure admin-side links target same section components with `targetUserId` context.

### 3.4 Admin edit-on-behalf capability
**Current:**
- Addresses and payment methods are editable in admin (`WebsitePortalsPage`) using shared components.

**Gap:**
- Core profile/company fields (name, phone, organization, portal note/status exceptions) are not editable in the same structured admin workflow with completeness feedback.

**Plan:**
1. Add “Customer profile” admin tab in `WebsitePortalsPage` (or dedicated page) for editable profile fields.
2. Reuse same validation schema as customer profile edit.
3. After save, always call `sync_customer_portal_identity` and re-evaluate completeness.
4. Audit-log admin edits with actor, target user, and changed keys.

### 3.5 Real-time presence
**Current:**
- No presence model.

**Gap:**
- No online/recently-active/help-available states.

**Plan:**
1. Add `user_presence` table (user_id, role_scope, status, last_seen_at, last_heartbeat_at, availability_mode, session_id/device_id optional).
2. Heartbeat endpoint/RPC from authenticated clients every 30–60s while app visible.
3. Idle detection client-side (Page Visibility + user activity); server computes:
   - `online`: heartbeat within 90s
   - `recently_active`: within 15m
   - `offline`: beyond threshold
4. Use Supabase Realtime subscription on presence table for admin/customer surfaces.
5. For customers, expose only aggregate/support availability indicators (not full staff roster details beyond policy).

### 3.6 Notifications
**Current:**
- Admin bell exists, data partly from DB; read/dismiss state in localStorage.

**Gap:**
- Violates requirement against browser-persistent business state.
- No customer-facing notification model for signup/activity/support availability.

**Plan:**
1. Add normalized notification tables:
   - `notifications` (event payload, scope, severity, href, actor/subject refs)
   - `notification_receipts` (user_id, read_at, dismissed_at)
2. Replace `localStorage` read/dismiss with DB receipts.
3. Emit events for signup, presence transitions (if needed), abandoned cart, ticket updates, admin availability windows.
4. Realtime subscription for bell updates; polling fallback for degraded realtime.

### 3.7 Mobile header/navigation (customer profile)
**Current:**
- Existing top bar has Website button + title + utilities cluster (search, bell, help, avatar) and desktop-only sidebar.

**Gap:**
- Mobile top bar is crowded and includes non-functional controls.
- Sidebar items are not migrated into mobile profile menu.

**Plan:**
1. Mobile top bar (<= `md`) should render only:
   - Back to website
   - Help button
   - Profile menu trigger (pill-style)
2. Move account nav items into profile dropdown/sheet on mobile; preserve desktop sidebar for `lg+`.
3. Remove/disable deceptive controls (search/notifications) until actually wired.
4. Add viewport tests for overflow, tap targets, and safe-area padding.

### 3.8 Fake/placeholder UI across app
**Confirmed examples from audit:**
- Customer portal placeholder sections (`QuoteFormSection`, `HelpdeskTicketsSection`, `AssignedPricelistsSection`).
- Admin placeholder routes (`/admin/sales/web-orders`, `/admin/sales/rx-orders`, `/admin/website/features`) via `PlaceholderPage`.
- Moonshot feedback route points to placeholder page.
- Disabled search control in customer account top bar.

**Disposition policy:**
- Implement now if dependency-ready and in-scope (portal quotes/helpdesk/pricelist visibility, profile workflow).
- Hide from navigation if not ready and out-of-scope.
- If temporarily deferred, render explicit disabled-state card with reason + expected availability owner/date (non-deceptive).

---

## 4) Technical design (production-safe)

### 4.1 Data model changes
1. `user_presence` (new)
   - `user_id uuid PK/FK`
   - `role_scope text` (`customer|staff|admin`)
   - `status text` (`online|idle|offline`)
   - `availability_mode text` (`available|busy|away|offline`)
   - `last_seen_at timestamptz`
   - `last_heartbeat_at timestamptz`
   - `updated_at`
2. `notifications` + `notification_receipts` (new)
3. `profile_requirements` or computed view/RPC output (new) for actionable completeness gaps.
4. Optional: `portal_capabilities_resolved` view to centralize feature entitlement results.

### 4.2 API / server action changes
- Add RPCs (or edge functions) for:
  - `resolve_portal_capabilities(p_user_id)`
  - `list_profile_requirements(p_user_id)`
  - `upsert_presence_heartbeat(p_status, p_availability_mode)`
  - `mark_notification_read/dismiss`
- Convert any direct table writes that need capability/auth checks to guarded RPC calls.

### 4.3 Auth/permission changes
- Ensure RLS/policies enforce:
  - Customer can only read/write own profile/address/payment and own receipts.
  - Staff/admin can act-on-behalf with explicit role checks and audit log.
  - Customer-only portal actions require resolved capability true.
- Add policy tests for auth boundary regressions.

### 4.4 Realtime transport choice
- Primary: Supabase Realtime Postgres changes for presence + notifications.
- Fallback: 30s polling when channel unavailable, with reconnect jitter/backoff.

### 4.5 Presence lifecycle
1. Login/session start => heartbeat with `online`.
2. Active interaction => periodic heartbeat refresh.
3. Hidden tab/inactivity => mark `idle` client hint; server threshold finalizes.
4. Session end/signout => best-effort `offline` write + server timeout fail-safe.

### 4.6 Notification lifecycle
1. Domain event created (signup, support update, abandoned cart, etc.).
2. Insert notification records + intended recipients.
3. Realtime push to active clients.
4. Read/dismiss persisted server-side in receipts.
5. Bell badge = unread count from server query.

### 4.7 Validation strategy
- Centralize zod schemas shared by customer + admin profile editing.
- Server revalidation in RPC/edge actions.
- Return structured field errors with stable field keys for deep-linking.

### 4.8 Deep-link strategy for incomplete profile alerts
- Standard query format: `/profile/<section>?focus=<field_key>&reason=<rule_key>`.
- Section components should:
  - Parse params.
  - Expand/open relevant form.
  - Focus target input and announce via accessible alert.

### 4.9 Responsive strategy
- Keep desktop unchanged where stable.
- For mobile account shell:
  - Collapse nav into profile menu/sheet.
  - Reduce topbar actions to 3 controls.
  - Ensure 44px tap targets and no horizontal overflow.

---

## 5) Phased execution plan

### Phase 1 — Foundation/schema/backend/auth
- Add presence + notification receipt schema.
- Add capability resolution + completeness RPC contracts.
- Add/adjust RLS policies and policy tests.
- Define shared validation schemas.

### Phase 2 — Admin controls and enforcement
- Refactor admin feature toggles to write through validated API.
- Enforce capabilities in backend access paths (not just UI).
- Add admin audit events for overrides and on-behalf edits.

### Phase 3 — Profile completeness and alert routing
- Implement complete requirements engine.
- Build actionable alerts with deep links.
- Extend admin to edit full profile/company data with same validator.

### Phase 4 — Presence and notifications
- Implement heartbeat + realtime subscriptions.
- Add admin/customer availability indicators.
- Replace localStorage notification state with server receipts.

### Phase 5 — Mobile header/navigation refactor
- Implement mobile-only minimal top bar.
- Move sidebar items into profile menu on mobile.
- Remove deceptive/non-functional topbar controls.

### Phase 6 — Placeholder/dead UI cleanup
- Replace in-scope placeholders with real modules or hide routes/nav.
- Convert deferred items into explicit disabled roadmap cards (non-deceptive).
- Remove obsolete placeholder components/routes where possible.

### Phase 7 — Tests and regression checks
- Unit: capability resolver, completeness mapper, notification reducers.
- Integration: policy/auth boundaries, on-behalf edits, deep links.
- E2E: mobile profile nav, portal gating, admin override effects, presence/notification updates.
- Run full lint/test/build + focused regression suites.

---

## 6) Acceptance criteria (specific)

### Admin feature controls
- Toggling a portal feature in admin changes customer access within one refresh cycle or realtime update.
- Backend rejects restricted operation when capability resolves false, even if UI is bypassed.

### Profile completeness
- Completeness status is identical when evaluated from customer and admin views.
- Missing fields are listed with exact action links.

### Alert-to-form navigation
- Clicking each missing-field alert lands on correct route, opens target section, and focuses target input.

### Admin edit-on-behalf
- Admin can update customer profile/company/address/payment fields with server validation.
- Every admin edit is audit logged with actor + target + changed fields.

### Presence
- Admin can see customer online/recently active states with <90s freshness when realtime healthy.
- Customer can see admin/support availability state per policy.

### Notifications
- Bell count is server-authoritative and consistent across tabs/devices.
- Read/dismiss persists after reload and across devices.

### Mobile header/navigation
- On mobile profile pages, top bar contains only Back-to-website, Help, Profile menu.
- Sidebar functions are available via profile menu and fully navigable with touch + keyboard.

### Placeholder cleanup
- No in-scope route presents deceptive fake operational UI.
- Deferred features are either hidden or explicitly marked unavailable with truthful messaging.

### Test coverage
- Added/updated tests cover auth denial, capability enforcement, deep links, and mobile nav behavior.

---

## 7) Risk list
- **Policy regressions:** RLS changes could accidentally overexpose or overrestrict data.
- **Race conditions:** Presence heartbeat + tab visibility + disconnect timing may create status flapping.
- **Notification fan-out:** Event duplication or missed realtime events without idempotency keys.
- **Migration risk:** New tables/indexes and policy updates on production traffic.
- **Auth boundary drift:** UI checks diverging from backend guards.
- **Mobile regression:** Header/menu refactor may break desktop if breakpoints leak.
- **Cross-surface consistency:** Admin/customer completeness logic can diverge if not centralized.

---

## 8) Recommendation (go/no-go)

**Recommendation: proceed with implementation in phased order, with one prerequisite hardening checkpoint before broad UI refactors.**

### Required checkpoint before broad feature rollout
1. Finalize backend capability/completeness contracts and RLS tests (Phase 1).
2. Confirm notification persistence migration away from localStorage.
3. Confirm placeholder disposition decisions for out-of-scope routes (hide vs. implement now).

Once these are in place, the codebase is ready for direct implementation with manageable risk.
