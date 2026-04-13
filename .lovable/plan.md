

---

## 1. Theme the Edit Dialogs (Lens, Addon, Supply)

All three form dialogs currently use generic shadcn styling. Update to match the dark navy admin theme visible in the uploaded screenshot (image-130):

- **LensFormDialog.tsx**: Apply `bg-[hsl(var(--admin-bg))]` to DialogContent, use admin border/input tokens, style ReadOnly cells with admin-muted backgrounds, section headers with admin color tokens.
- **AddonFormDialog.tsx**: Same treatment -- admin tokens for borders, inputs, badges, switches.
- **SupplyFormDialog.tsx**: Same treatment.
- Ensure all three dialogs share the same visual language: `border-[hsl(var(--admin-border))]`, `bg-[hsl(var(--admin-bg))]`, input fields with `bg-[hsl(var(--admin-input-bg))]`.

## 2. Theme the Flyout Sidebar

**AdminSidebar.tsx**: The sidebar already uses admin tokens (`--admin-sidebar-fg`, `--admin-border`, etc.). Review and ensure the flyout overlay panel (`showFlyout` state) uses `bg-[hsl(var(--admin-bg))]` instead of `bg-[hsl(var(--background))]` so it matches the dark shell in both light and dark modes.

## 3. Theme the Help Sidebar

**HelpPanel.tsx**: Update the slide-out panel background, border, and header styling to use admin tokens. Ensure article list items, feedback buttons, and the resize handle use consistent admin colors.

## 4. Theme the Notifications Dropdown

**NotificationBell.tsx**: The dropdown currently uses `bg-popover` and `bg-muted`. Switch to explicit admin tokens:

- Dropdown container: `bg-[hsl(var(--admin-bg))]`, `border-[hsl(var(--admin-border))]`
- Header bar: `bg-[hsl(var(--admin-surface))]`
- Items: hover with `bg-[hsl(var(--admin-sidebar-hover))]`
- Ensure dismiss button uses admin foreground colors.

## 5. Verify Business Logic in Pricing Engine

Review the `calculatePricingEngine` function and its usage in all three dialogs:

- **Lenses**: Currently hardcodes `duty_applicable: false` and `vat_recoverable: true` -- correct per project rules ("Lenses are specifically exempt from import duty and VAT"). Labour at 5% of base_price when `full_lab` is on. 
- **Addons**: Check that addon dialog passes correct inputs (category, currency, bb_item flags).
- **Supplies**: Check that supply-specific flags (`duty_added`, `vat_paid`, `labour_added`, `bb_item`, `currency`) are correctly mapped to engine inputs.
- Verify margin calculation: `margin = (sell_price - full_cost) / sell_price` is correct (sell-price-based margin, not markup).

## 6. Implement Fuzzy Search Across Admin

Replace `fieldsMatch` (wildcard `%`-based) with Fuse.js fuzzy matching:

- Install `fuse.js` package.
- Create `src/lib/fuzzyMatch.ts` utility wrapping Fuse for single-query-against-fields use.
- Update `fieldsMatch` to use fuzzy matching by default (threshold ~0.3) while preserving the `%` wildcard fallback for explicit patterns.
- This automatically applies to all admin search fields that use `fieldsMatch`.

## 7. Compress Padding in /admin/pricing/compare

**PricingComparePage.tsx**: Reduce table row padding to create slimmer lines:

- Add `className="py-1"` to all `<TableCell>` elements in the lens list.
- Reduce lens name font to `text-[11px]` and supplier sub-label to `text-[10px]`.
- Tighten action button sizes from `h-6 w-6` to `h-5 w-5`.



## 10. SLA Policy Description Field

**HelpdeskSlaPoliciesPage.tsx**: Add a rich-text `description` field to SLA policies:

- Create a migration adding `description TEXT` column to `helpdesk_sla_policies`.
- Add the `RichTextEditor` component to both the create form and edit dialog.
- Display a collapsible description preview in the policy list table.

---

## Technical Details

### Files Modified


| File                                                   | Changes                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| `src/components/admin/LensFormDialog.tsx`              | Admin theme tokens, fix halfPairUsdList calc |
| `src/components/admin/AddonFormDialog.tsx`             | Admin theme tokens                           |
| `src/components/admin/SupplyFormDialog.tsx`            | Admin theme tokens                           |
| `src/components/admin/AdminSidebar.tsx`                | Flyout bg fix                                |
| `src/components/admin/HelpPanel.tsx`                   | Admin theme tokens                           |
| `src/components/admin/NotificationBell.tsx`            | Admin theme tokens                           |
| `src/lib/wildcardMatch.ts`                             | Add fuzzy matching via Fuse.js               |
| `src/pages/admin/PricingComparePage.tsx`               | Tighter cell padding                         |
| `src/pages/admin/helpdesk/HelpdeskOverviewPage.tsx`    | Browser fullscreen API                       |
| `src/pages/admin/helpdesk/HelpdeskSlaPoliciesPage.tsx` | Description field + rich text                |
| `package.json`                                         | Add `fuse.js` dependency                     |
| Migration                                              | Add `description` to `helpdesk_sla_policies` |


### Dependencies

- `fuse.js` (~7KB gzipped) for fuzzy search