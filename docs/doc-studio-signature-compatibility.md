# Doc Studio signatures, recipients and labels

## Signature choice and research

Reviewed 2026-10-07. The editable output is a compact white HTML tile with live text, telephone/email/website links, inline styles, presentation tables and Arial/Helvetica fallbacks. The 224×224 opaque PNG logo displays at 56×56. No external font, SVG, data URI, flex layout, clipping or dark-mode media query is needed in the signature.

- [Microsoft's signature template guidance](https://support.microsoft.com/en-us/outlook/very-small-business/create-an-email-signature-to-help-brand-your-business) supports copying a formatted signature and personalizing it in Outlook.
- [Gmail signature settings](https://support.google.com/mail/answer/8395?hl=en) support formatted text, links and images, with a 10,000-character limit. Use a small logo instead of an entire base64 image in HTML.
- [Can I Email SVG compatibility tests](https://www.caniemail.com/features/image-svg/) show inconsistent SVG support. Use a publicly hosted PNG for the HTML logo.
- [Can I Email dark-mode media-query tests](https://www.caniemail.com/features/css-at-media-prefers-color-scheme/) show uneven support and client-specific transformations. Explicit white backgrounds and high-contrast text provide a conservative baseline; no universal dark-mode guarantee is made.

The alternative PNG tile is rendered at 3× resolution on a solid white background, wrapping long fields. Copy image or Download PNG preserves appearance, including the logo, independently of remote image loading. Image-only signatures lose clickable links, selectable text and accessibility, so HTML remains the default.

## Operator flow

1. Edit name, title, phone, email, website and optional tagline on Signature. Toggle the logo if desired.
2. Copy signature and paste into a rich text email editor or its signature settings. Add to email draft appends the signature directly to the Doc Studio email body. Plain text clipboard content retains readable contact lines.
3. If a client strips rich HTML, use Copy image or Download PNG and insert the image at approximately 420 CSS pixels wide. Download HTML provides a portable file that can be opened and copied. A blocked clipboard reports failure and offers the download fallback.
4. Save / Save person uses the existing authenticated Doc Studio file manager; publication/sharing remains subject to its existing permissions and the user's approval. No new publishing endpoint or access change was added.

The HTML logo points to `https://www.classicvisions.net/ds/assets/signature-logo.png`. Local previews and PNG exports use the same asset from `/ds/assets/signature-logo.png`. Publishing the application and this asset must precede external HTML-signature use with its logo. Image export works locally before that publication. Recipient clients can still block remote images. The signature remains readable with its logo hidden.

## Recipient picker and labels

Contacts searches names and email addresses without clearing To. Checking/unchecking an address updates To immediately and preserves manually typed addresses. Clicking outside, moving focus outside, or Escape dismisses the picker. Escape restores focus to Contacts and does not dismiss the send dialog. Search receives focus on opening; checkboxes remain keyboard accessible. No email was sent during verification.

Ship Label offers Shipping label and Customer label modes. Both have square corners throughout. Sender/recipient headings are editable. Customer mode hides the sender, courier, tracking, weight and dimensions while retaining those values for a later switch back; customer identity/address/phone and instructions remain. Mode and headings persist in the existing `shiplabel` payload. Legacy files default to shipping mode instead of inheriting the previously opened customer label.

## Validation limits

Local browser proof is at port 8081. Browser-preview checks do not establish rendering in installed Outlook, Gmail or Apple Mail. Verify pasted HTML, image download, blocked-image readability and a received test message in the intended clients before rollout. No production save, sending, public publishing or deployment was performed by this change. The browser automation clipboard bridge did not expose the OS clipboard after Copy signature, so native cross-client paste remains unverified; clipboard formats and success/failure behavior have separate unit coverage.

The browser's download-event wait ended in a CDP timeout; browser download completion is not claimed. The exact image-export method was separately rendered using a local canvas runtime and its 1260px output visually inspected. Full suite: 210 files / 1388 tests passed; final focused Doc Studio suite: 12 tests passed. Lint: zero errors; build and PR checks passed. No universal email-client compatibility claim follows from these local checks.
