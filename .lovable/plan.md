

# Remove Admin Assistant

Remove the floating AI chatbot from the admin panel and its associated backend function.

## Changes

| File | Action |
|------|--------|
| `src/components/admin/AdminChatbot.tsx` | Delete |
| `src/components/admin/AdminLayout.tsx` | Remove `AdminChatbot` import and usage |
| `supabase/functions/admin-assistant/index.ts` | Delete |
| `supabase/config.toml` | Remove `[functions.admin-assistant]` section |

## Technical Details

1. **AdminLayout.tsx** — Remove the import line and the `<AdminChatbot />` element from the JSX.
2. **AdminChatbot.tsx** — Delete the entire file.
3. **Edge function** — Delete `supabase/functions/admin-assistant/index.ts` and remove its config entry. The deployed function will also be deleted.

