

## Plan: Fix Dark Mode in List Catalog Editor (Stock & Supplies)

### Problem
The `ListCatalogTab` component uses hardcoded light-mode colors in inline `style` attributes throughout its table rows, headers, and cells. These inline styles override the theme-aware CSS custom properties defined in `index.css`, causing the editor to look broken in dark mode (light text on light backgrounds, wrong contrast).

### Root Cause
All color values in `renderRow()` and `renderSection()` are hardcoded HSL/hex for light mode:
- Row backgrounds: `"white"` / `"hsl(215 20% 98%)"` / `"hsl(0 80% 97%)"`
- Header backgrounds: `"hsl(215 15% 93%)"` / `"hsl(215 20% 90%)"`
- Text colors: `"hsl(215 30% 15%)"` / `"hsl(215 30% 35%)"`
- Price columns: `"hsl(215 60% 97%)"` / `"#f0fff4"` / `GREEN_TEXT` / `GREEN_BG`
- Link/label colors: hardcoded HSL values

The existing dark-mode CSS tokens (`--admin-table-*`) are correctly defined but never used because inline styles win.

### Solution
Replace all hardcoded inline color values in `ListCatalogTab.tsx` with CSS custom properties that already exist or add new ones where needed.

| Change | Detail |
|---|---|
| **`src/index.css`** | Add new admin tokens for price-column variants (BBD blue tint, USD green tint, pending row, override amber) in both light and dark `.admin-tool` blocks |
| **`src/components/admin/ListCatalogTab.tsx`** | Replace all hardcoded inline `style={{ background: ..., color: ... }}` with `var(--admin-*)` token references or semantic CSS classes. Key areas: `renderRow()` (lines ~444-529), `renderSection()` table headers (lines ~551-566), supplier/description/matrix cell text colors |

### New CSS tokens to add

**Light mode (`.admin-tool`):**
- `--admin-table-row-even: 0 0% 100%` (white)
- `--admin-table-row-odd: 215 20% 98%`
- `--admin-table-row-pending: 0 80% 97%`
- `--admin-table-col-bbd: 215 60% 97%`
- `--admin-table-col-bbd-fg: 215 60% 30%`
- `--admin-table-col-usd: 140 60% 97%`
- `--admin-table-col-usd-fg: 140 50% 22%`
- `--admin-table-col-override: 35 90% 95%`
- `--admin-table-col-override-fg: 35 80% 30%`
- `--admin-table-subheader: 215 15% 93%`
- `--admin-table-subheader-fg: 215 30% 35%`

**Dark mode (`.dark .admin-tool`):**
- Same keys with dark-appropriate values (darker backgrounds, lighter text)

### Scope
- Only `ListCatalogTab.tsx` and `index.css` are affected
- The blue section header (`BLUE_BG = "#1e4db7"`) stays hardcoded — it's a brand color that looks correct in both themes
- No functional changes — only visual/theming

