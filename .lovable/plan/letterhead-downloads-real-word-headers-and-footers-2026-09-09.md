# Letterhead downloads: real Word headers and footers

Today the letterhead download is a Word-readable HTML file where the logo bar and the contact strip are just ordinary paragraphs at the top and bottom of the page. In Word they scroll with the text, do not repeat on page two, and can be deleted by accident. This change turns them into genuine Word headers and footers while keeping the current design exactly as it looks on screen.

## What changes for the user

- Download the letterhead as a Word file and open it: the logo/contact bar sits in the page header, the company contact line sits in the page footer, both in Word's own header/footer area.
- Page one shows the full logo letterhead. Page two onward shows a slim header (company name and page number) so long letters look right.
- The footer repeats on every page and includes a page number.
- The body text stays fully editable, with the same fonts, gold rule, spacing, and colours as the preview.
- Applies to all four letter types: Business, Announcement, Collection, and Memo.
- Page setup is correct on open: US Letter, matching margins, no manual fiddling.

## How it is built

Keep the `.doc` download (Word-compatible HTML) so the design stays pixel-faithful, but package it as a single-file MHTML archive so Word can attach real header and footer sub-documents.

1. **New helper module `public/ds/letter-word-export.js`**, loaded alongside the existing studio scripts.
   - `buildLetterWordFile(state, brand, parts)` returns the full MHTML string.
   - Parts assembled: main document, `header-first.htm`, `header.htm`, `footer.htm`, `filelist.xml`, plus the logo image as its own part (Word does not reliably render data-URL images in `.doc`).
   - Each part carries a `Content-Location`, `Content-Type`, and base64 body; the archive is `multipart/related` with a `text/html` root.

2. **Section and page setup** in the main document's `<style>`:
   - `@page Section1` with `size:8.5in 11.0in`, margins matching the current 60px side padding, and `mso-header-margin` / `mso-footer-margin`.
   - `mso-title-page:yes` so the first page uses `header-first.htm` while later pages use `header.htm`.
   - `mso-header:url("...header.htm") h1;` `mso-first-header:url("...header-first.htm") fh1;` `mso-footer:url("...footer.htm") f1;`
   - `div.Section1{page:Section1}` wrapping the body.

3. **Header/footer markup extracted from the existing templates.**
   - `letterHeaderHtml(variant)` — reuses the current lockup + phone/email/web block + gold rule for the first-page version; a one-line company name plus `PAGE` field for continuation pages.
   - `letterFooterHtml()` — reuses the current hairline rule and centred `name · phone · email · web` line, with `Page X of Y` using Word `PAGE`/`NUMPAGES` fields.
   - `buildLetter()` (the on-screen preview) keeps rendering these same blocks inline, so preview and download stay visually identical. Header/footer markup lives in one shared function per block, called by both paths.

4. **`buildLetter()` refactor in `public/ds/studio-logic.js`**
   - Split into `letterHeaderHtml`, `letterFooterHtml`, and `letterBodyHtml(docType)` so the export can take body-only and the preview can compose all three.
   - Memo, Announcement, Collection, and Business each keep their current body treatment; all four now sit inside the same header/footer frame (Memo gains the letterhead header and footer it currently lacks).

5. **`exportLetterWord()` rewrite**
   - Calls the new builder, downloads with MIME `application/msword` and the existing `.doc` filename slug.
   - Word-unfriendly CSS is dropped from the export path: `box-shadow`, `border-radius`, and the fixed 680px wrapper are replaced with print-appropriate widths (Google Fonts link removed; falls back to Arial with the Plus Jakarta Sans name kept first so it renders where installed).

6. **Google Docs path** (`openLetterGoogleDocs`) is unchanged — it copies rich HTML to the clipboard and cannot carry Word headers.

## Verification

- Generate a `.doc` for each of the four letter types with a body long enough to spill onto page two.
- Convert each with LibreOffice and render every page to an image; confirm the first page shows the logo header, page two shows the slim header, the footer and page numbers repeat, the logo image resolves, and no text is clipped.
- Confirm in the rendered output that the body is normal editable text (not a locked image or table shell).
- Check the on-screen letterhead preview is unchanged after the `buildLetter()` refactor.
- Build clean; check `/tmp/observability/build-errors.log`.
