# Fix: markups and discounts can't be saved

## What's happening

Editing a pricelist and pressing Update fails with `column reference "section_type" is ambiguous`, so master and per-section markups/discounts are never saved.

## Confirmed cause

The database routine that saves the percentages (`materialize_pricelist_adjustments`) returns a result column named `section_type`, and it also reads a table column with the same name. Postgres cannot tell which one is meant in two places inside the routine (the section lookup and the override cleanup), so it aborts the whole save.

## The fix

Apply one database migration that recreates the routine with those two queries table-qualified (e.g. `pcs.section_type = v_section_type`), leaving the returned result shape, permissions, and pricing math exactly as they are. No front-end change is needed — `src/hooks/usePricelistVersions.ts` already reads the returned `section_type`/`applied_count` rows.

## Testing

1. Before the fix: confirm the failure by calling the routine directly on a test version and seeing the ambiguity error.
2. After the migration: call it again on the same version with a master markup and a per-section discount, and confirm it returns the three section rows with applied counts.
3. Verify in the database that `pricelist_child_sections` holds the new percentages and that `pricelist_line_overrides` contains the recalculated prices for the affected section only.
4. Drive the actual Edit Pricelist dialog in the browser: set a master markup and a child discount, press Update, confirm the success state and no error toast, reopen the dialog and confirm the values persisted.
5. Reset the test version back to 0/0 so no live pricing is left changed.
