

# Admin Help System: Knowledge Wiki + AI Chatbot

Two independent features added to the admin panel to help users understand and navigate the tool.

---

## 1. Admin Knowledge Wiki Page

A new sidebar menu item **"Help / Wiki"** with a `BookOpen` icon, placed in the sidebar just above the "Back to Site" link. Routes to `/admin/wiki`.

The page will contain structured, searchable help articles organized by category:

**Categories and articles:**
- **Getting Started** -- Overview of the admin tool, navigating the sidebar, user roles and permissions
- **Lens Catalog** -- Adding/editing lenses, understanding flags (PL, Full Lab, WSPL, Web), pricing engine and calculated values, governance rules
- **Supplies & Add-Ons** -- Managing supplies and addons, pricing and cost fields, flag toggles
- **Imports** -- How to import lenses/supplies/addons from CSV, resolving reference mappings, handling duplicates (overwrite vs ignore)
- **Reference Data** -- Managing suppliers, brands, materials, lens types, finish types
- **Pricing Engine** -- How pricing is calculated (FX, CIF, Duty, Landed, Labour, Strategic Price), what Full Lab means, margin status badges, governance alerts and concession reasons
- **Users & Audit** -- Managing admin users, viewing audit logs

**UI pattern:** Reuses the same card + accordion pattern from the existing public Knowledge page but styled with the admin tool's color scheme (no Header/Footer chrome). Includes a search input at the top.

### Files:
| File | Action |
|------|--------|
| `src/pages/admin/AdminWikiPage.tsx` | New page with categorized help articles |
| `src/components/admin/AdminSidebar.tsx` | Add "Help / Wiki" menu item above "Back to Site" |
| `src/App.tsx` | Add route `/admin/wiki` |

---

## 2. Admin AI Chatbot

A floating chat button (bottom-right corner) inside the admin layout, similar to the existing `LensChatbot` on the store page but with an admin-focused system prompt.

**Key differences from the store chatbot:**
- System prompt focused on admin tool usage (how to import, what flags mean, how pricing works, etc.)
- Includes the wiki content as context so answers are grounded in your own documentation
- Only renders inside the admin layout (not on public pages)
- Styled to match the admin tool aesthetic (neutral colors, smaller)

**Implementation:** A new edge function `admin-assistant` with a system prompt containing all the wiki article content, so the AI can answer questions accurately about the tool.

### Files:
| File | Action |
|------|--------|
| `supabase/functions/admin-assistant/index.ts` | New edge function with admin-focused system prompt containing wiki content |
| `src/components/admin/AdminChatbot.tsx` | New floating chatbot component (based on LensChatbot pattern) |
| `src/components/admin/AdminLayout.tsx` | Add `AdminChatbot` to the layout |

---

## Technical Details

### Admin Sidebar Change
Add a new menu item before the "Back to Site" link:
```
{ label: "Help / Wiki", icon: BookOpen, path: "/admin/wiki" }
```

### Edge Function (`admin-assistant`)
- Reuses the same Lovable AI Gateway pattern as `lens-assistant`
- System prompt contains all wiki article text so the AI gives accurate, grounded answers about OptiPricing
- Model: `google/gemini-3-flash-preview`
- Handles 429/402 errors

### Admin Chatbot Component
- Floating button in bottom-right corner of admin layout
- Chat window with streaming responses (same SSE parsing as LensChatbot)
- Styled with admin neutral colors instead of accent gradients
- Bot icon and header say "Admin Assistant"

### No database changes needed
All wiki content is static in the React component. The chatbot uses the existing Lovable AI infrastructure.

