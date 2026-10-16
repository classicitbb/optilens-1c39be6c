# Fix email attachment previews

## What's wrong
I couldn't open your selected email (orders, message 2642) from my test browser yet: the mail relay only accepts your real preview address, not my local test address, so nothing loaded. Reading the preview code turned up these problems:

1. **PDFs show blank.** The PDF is shown inside a fully locked-down frame, and Chrome won't run its PDF viewer in that kind of frame. You get an empty box.
2. **Some images say "Preview isn't available".** The image check only accepts exact file types (png, jpeg, gif, webp, bmp). Mail systems often label photos as `image/jpg`, `image/pjpeg` or "generic file" (Outlook's `~WRD….jpg` inline images often arrive like this), so those get rejected even though the file name ends in .jpg.
3. **Images don't fit the window properly.** Large photos overflow the frame, and tiny inline images show at a size you can barely see.

## Fix
- Decide whether a file is an image or PDF from **both** its type and its file extension (.jpg/.jpeg/.png/.gif/.webp/.bmp/.pdf). Always rebuild the file with the correct type before showing it.
- Show PDFs with the browser's own viewer: drop the locked-down frame setting (the file is a local copy, so this is safe), and add an "Open in new tab" fallback.
- Reuse the existing photo viewer from Helpdesk attachments (zoom, rotate, fit to window) for email image previews, so images behave the same everywhere.
- Keep text/CSV previews as they are. Other files keep the "download instead" message.

## Testing end to end
- Let the mail relay accept the local test address (`http://localhost:8080`) so I can sign in as you and open message 2642 in a real browser. This doesn't change access: the office server still checks each user's sign-in.
- Open every attachment on that email, including `~WRD378.jpg`, and check that the image or PDF actually appears, Download still works, and Close works.
- Add a small test: `.jpg` files labelled `image/jpg` or as generic files open as images, and `.pdf` opens as PDF.
- Run the standard backend health check after the relay update.

## Technical details
- `src/pages/admin/email/EmailPage.tsx`: `previewAttachment` detects type by MIME or extension (move this into a small helper with a unit test); the PDF iframe drops `sandbox=""`; image preview uses `ImagePreviewDialog`.
- `supabase/functions/_shared/http/cors.ts` (email-bridge policy): add `http://localhost:8080`, then redeploy only `email-bridge` and run `npm run qa:edge-smoke`.
