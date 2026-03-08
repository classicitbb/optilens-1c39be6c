

## Plan: Document Preview Template Rules in `.lovable/plan.md`

### What
Append a new section to `.lovable/plan.md` that codifies four binding rules for all document preview templates (pricelist previews, quote print previews, proposal PDFs, and any future preview shell):

1. **Narrow margins by default** — change `DEFAULT_PRINT_SETTINGS.marginPreset` from `"normal"` to `"narrow"` in `src/features/admin/print/types.ts`.
2. **Dark-mode immune** — preview content always renders on a white background with dark text; the shell must never inherit dark-mode tokens. Document this as an explicit rule.
3. **Consistent template** — branded header, page numbering, and layout structure must remain identical across all preview types (pricelist, quote, proposal). No ad-hoc overrides.
4. **Responsive table contents and page breaks** — tables must use `break-inside: avoid` on header groups, allow row-level breaks in long lists, and headings must use `break-after: avoid` to stay with following content.

### Changes

| File | Change |
|---|---|
| `.lovable/plan.md` | Append **§6 — Preview Template Rules** with the four rules above, written as enforceable constraints for future development. |
| `src/features/admin/print/types.ts` | Change `marginPreset: "normal"` → `marginPreset: "narrow"` in `DEFAULT_PRINT_SETTINGS`. |

### New section content (for plan.md)

```markdown
## 6) Preview Template Rules (binding)

All document preview templates — pricelists, quotations, proposals, and any
future PdfPreviewShell consumer — must follow these rules.

### 6.1 Narrow margins by default
- `DEFAULT_PRINT_SETTINGS.marginPreset` is `"narrow"` (8 mm).
- Users may override per-document, but the starting state is always narrow.

### 6.2 Dark-mode immune
- Preview content always renders with a fixed white background and dark text.
- The preview iframe / container must never inherit dark-mode CSS variables.
- Branded header colors (e.g. `#1e4db7`) are hardcoded, not token-based.

### 6.3 Consistent template structure
- Every preview uses `PdfPreviewShell` with the shared toolbar (paper size,
  orientation, scale, print button).
- Branded header, date, format label, and page numbering layout must not vary
  between preview types.

### 6.4 Responsive table contents and page breaks
- `thead` uses `display: table-header-group` so headers repeat on every page.
- Long table bodies allow row-level breaks (`break-inside: auto`).
- Section headings use `break-after: avoid` to stay with following content.
- Standalone grid/card sections use `break-inside: avoid`.
```

