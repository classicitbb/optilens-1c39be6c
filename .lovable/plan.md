## Redesign Admin Top Bar (Header)

### Summary

Rebuild `AdminTopBar` to be a full-width, well-organized header bar with proper left/right anchoring, rename "OptiPricing" to "OpticAdmin" everywhere, and add a profile dropdown menu with contextual items.

---

### Layout (left to right)

```text
|-- LEFT ANCHORED ------------------------------------------------|-- RIGHT ANCHORED -------------------------|
| [Apps] | OpticAdmin | App Name (Page Name) | Global Search      | [Bell] [Help] [Lovable] | UserName [Avatar v] |
```

- **Apps Button**: Existing grid icon to toggle AppLauncher
- **OpticAdmin**: Brand label, always visible
- **App Name (Page Name)**: Derived from current route (e.g. "Pricing > Product Catalog")
- **Global Search**: Centered in the remaining space (Ctrl+K)
- **Notifications Bell**: Placeholder icon (disabled/tooltip "Coming soon")
- **Help icon**: Existing help panel toggle
- **Edit with Lovable icon**: External link to Lovable editor, visible only for admin role
- **User display name** (falls back to email if no name set)
- **Avatar icon** with dropdown menu containing:
  - Helpdesk / Wiki (links to /admin/wiki)
  - My Profile (links to /profile)
  - Install App (triggers `beforeinstallprompt` PWA or opens window for bookmarking)
  - Logout

---

### Files Changed

#### 1. `src/components/admin/AdminTopBar.tsx` -- Full rewrite

- Fetch user profile (display_name) from profiles table via a small query or context
- Build a route-to-label map to derive "App Name > Page Name" from `useLocation()`
- Layout: `flex items-center w-full` with left group, center search, right group
- Right side: Bell icon (placeholder), Help icon, Lovable link (admin only), user name, Avatar with DropdownMenu
- DropdownMenu items: Wiki, Profile, Install App, Logout

#### 2. `src/components/admin/AdminSidebar.tsx` -- Rename only

- Line 146: Change "OptiPricing" to "OpticAdmin"

#### 3. `src/data/wikiContent.ts` -- Rename only

- Replace "OptiPricing" with "OpticAdmin" in the wiki content string

#### 4. `src/components/admin/AppLauncher.tsx` -- Rename label

- Line 14: Change `label: "Optilens"` to `label: "OpticAdmin"` (or keep "Optilens" for the pricing app tile and update the launcher title)

---

### Route-to-Label Map (for breadcrumb in header)

A simple lookup object maps pathname prefixes to friendly labels:


| Route prefix               | Display                     |
| -------------------------- | --------------------------- |
| `/admin/catalog`           | Pricing - Product Catalog   |
| `/admin/rx-lens-prices`    | Pricing - RX Lens Prices    |
| `/admin/stock-lens-prices` | Pricing - Stock Lens Prices |
| `/admin/supplies-prices`   | Pricing - Supplies Prices   |
| `/admin/catalog-publisher` | Pricing - Catalog Publisher |
| `/admin/imports`           | Pricing - Imports           |
| `/admin/reference`         | Pricing - Reference Data    |
| `/admin/costings`          | Costings                    |
| `/admin/quotations`        | Sales - Quotations          |
| `/admin/users`             | Settings - Users            |
| `/admin/parameters`        | Settings - Company          |
| `/admin/wiki`              | Knowledge - Wiki            |
| `/admin/content`           | Website - Content           |
| `/admin/erp/contacts`      | Contacts                    |
| `/admin/erp/crm`           | CRM                         |
| `/admin/erp/helpdesk`      | Helpdesk                    |


---

### User Display Name

- Query `profiles.display_name` for the current user (already available via existing profile fetch patterns)
- Show display_name if set, otherwise fall back to `user.email`
- Use a small `useQuery` hook inside AdminTopBar or a shared hook

---

### Install App Button

- Use the `beforeinstallprompt` event if available (PWA install)
- If not available, show a tooltip "Add to home screen from your browser menu" or open current URL in a minimal window via `window.open`

---

### Technical Notes

- The header height stays at `h-11` 
- The header spans full width of the window area 
- Remove the sidebar header (sidebar collapses under the header. Put a little flyout button to click to collapse on sidebar mouseover. )
- No changes to AdminLayout needed? -- the header is already full-width within the flex container
- Profile dropdown uses existing `DropdownMenu` from shadcn/ui for consistency
- Avatar uses existing `Avatar` / `AvatarFallback` components with user initials