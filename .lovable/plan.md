

## Dark Mode Admin Improvements — Plan

### Current Issues (from screenshot analysis)

1. **Inconsistent table tokens**: In `.dark .admin-tool`, `--admin-table-surface`, `--admin-table-fg`, `--admin-table-muted-fg`, and `--admin-table-border` are still set to **light-mode values** (white bg, dark text). This means the global `table` CSS rule paints tables with mismatched colors vs. the dark content area.

2. **Forced white inputs**: The `!important` rule forces all inputs/selects to white backgrounds — this clashes heavily in dark mode and breaks visual cohesion.

3. **Popover remains light**: `--popover` in `.admin-content` is hardcoded to `0 0% 100%` (white), so dropdowns and filter popovers flash white against the dark backdrop.

4. **Hardcoded `hsl()` inline styles**: Many inline styles in `LensDataTable.tsx` reference admin CSS vars correctly, but the underlying var values are wrong in dark mode (point 1).

### Proposed Changes

**File: `src/index.css`** — Fix `.dark .admin-tool` tokens:
- Update `--admin-table-surface` → dark value (match `--admin-card`: `215 28% 12%`)
- Update `--admin-table-fg` → light text (`210 35% 96%`)
- Update `--admin-table-muted-fg` → muted light (`215 15% 70%`)
- Update `--admin-table-border` → dark border (`215 22% 19%`)
- Update forced input styles to be dark-mode-aware using `.dark .admin-tool` overrides (dark input bg `215 28% 14%`, light text, subtle border)
- Update `--popover` in `.admin-content` to use `var(--admin-card)` so dropdowns match

**No component file changes needed** — the table components already reference the CSS vars via inline `hsl(var(...))` styles, so fixing the token values propagates automatically.

### Summary of token corrections in `.dark .admin-tool`:

```text
Token                      Current (wrong)      Proposed
─────────────────────────  ───────────────────   ─────────────────
--admin-table-surface      0 0% 100% (white)    215 28% 12% (dark card)
--admin-table-fg           215 30% 15% (dark)   210 35% 96% (light)
--admin-table-muted-fg     215 15% 45%          215 15% 70%
--admin-table-border       215 15% 85%          215 22% 19%
```

Input overrides in dark: replace `white !important` with `hsl(215 28% 14%)`, text with light color, border with `hsl(215 22% 22%)`.

Popover fix: change hardcoded `--popover: 0 0% 100%` to `var(--admin-card)` in the `.admin-content` scope.

