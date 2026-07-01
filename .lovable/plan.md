
## Goal
Make cover image handling in the blog editor effortless, and actually display the cover on the reading page.

## Changes

### 1. `src/components/admin/BlogPostsManager.tsx` — editor
- When `RichTextEditor.onChange(html)` fires, parse the HTML for the first `<img src="...">`. If `editing.cover_image_url` is empty/unset, auto-populate it with that src (and set alt from the img's `alt` if cover alt is empty). Never overwrite a cover URL the user already set.
- Upgrade the Cover image URL field to a "paste anywhere" target:
  - Add `onPaste` on the input that reads `clipboardData`:
    - If an image file is present (screenshot / copied image), upload it via the existing Supabase storage path used by RichTextEditor (reuse its uploader helper — inspect `src/components/admin/RichTextEditor.tsx` to reuse the same bucket/util) and set the returned public URL.
    - Else if plain text contains a URL or a data URL, set it directly.
    - Else if HTML contains `<img src>`, extract the src.
  - Also accept drag-and-drop of an image file onto the field (same handler).
  - Show a small inline preview thumbnail beside the input when a URL is present, plus a "Clear" button.
- Keep the field editable as a normal text input for manual URLs.

### 2. `src/pages/BlogPostPage.tsx` — reader
- If `post.cover_image_url` is set, render a hero `<img>` at the top of the article card (above the title block, inside the existing rounded article container) with `alt = post.cover_image_alt || post.title`, `loading="eager"`, aspect ~16/9, `object-cover`. If not set, render nothing (current behavior).

## Notes
- No schema changes. No changes to `useBlogPosts` or public queries.
- Reuse the RichTextEditor image upload utility so pasted images land in the same storage bucket as inline body images (consistent URLs, no orphan uploads).
- Auto-cover only fills when empty — never clobbers manual entry. Removing the cover manually stays sticky (won't be re-auto-filled unless the field is empty again on next body change).
