# Doc Studio context

The established `/admin/docs/studio` layout mounts `DocStudioEmbed` and the precompiled class in `public/ds/studio-logic.js`, using `public/ds/studio.html` as its template. The isolated native v2 gateway is a separate implementation; do not change it to repair the established layout. Do not edit generated `public/ds/support.js`.

Presentation-table styles are isolated from admin grid/table styling in DocStudioEmbed. The shell also supplies generic div radii; printed label descendants must explicitly set border-radius:0. Preserve this isolation when changing signatures or labels.

The signature uses email-safe inline tables, a 4× hosted PNG logo and standard fonts. Image export is a dependency-free 3× canvas tile with long-field wrapping. HTML and image output deliberately differ in link/text accessibility; see `docs/doc-studio-signature-compatibility.md` for research and deployment/client verification limits.

Recipient-picker document listeners must clean up at unmount. Selection writes directly into To; dismissing must never discard addresses. The saved `shiplabel` payload includes slMode, slFromCaption and slToCaption, with shipping defaults for legacy files.

The current checkout is served on port 8081; another checkout was observed on port 8080. Verify the actual server process before assuming localhost serves this source. No new service, connector or environment variable is required for these improvements.

Focused verification: `npx vitest run --coverage=false src/tests/unit/docStudioRecipientSignatureLabel.test.ts src/tests/unit/docStudioLetterhead.test.ts src/tests/unit/nativeDocStudio.unit.test.ts`.
