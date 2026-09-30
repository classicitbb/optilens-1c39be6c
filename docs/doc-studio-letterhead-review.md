# Doc Studio letterhead review — September 30, 2026

The navy, teal, linen and restrained gold palette follows the project design philosophy. The native mount inherited admin data-grid styles: every presentation-table cell gained a gray bottom border, padding and hover fill. That caused stray lines around the logo, gold rule and footer. A scoped reset removes those styles while preserving explicit document borders and ordinary admin tables.

Implemented: one hairline header rule in gold or teal, or no header rule; comfortable or compact paragraph spacing; visible teal selected states and keyboard focus; stable 15px body text rather than shrinking long letters. Choices persist with saved letters and share preview/Word builders, including continuation headers. Legacy letters default to Gold/Comfortable.

Recommended default: Gold rule + Comfortable. No rule is the quietest option. The footer retains one intentional light separator. User-inserted body rules remain editable. Existing headings, lists, links, images, custom blocks and clear-formatting controls remain available.

Export limits: Word markup is tested, but desktop Word/Google Docs import and multipage browser-print pagination were not exercised. Future print/PDF work should match Word's repeating headers, footers and page numbers before promising identical multipage output. Inline output styles remain necessary for portable email/document markup. Review criteria: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

Email: the provider reported `missing_parameter` for `text` on a send labelled `raw`. Lovable source already derives text, but returned a space for image-only HTML. A mocked provider reproduced that rejection; the fallback now supplies a readable sentence. Deployed-code inspection was permission-denied, so the historical message's exact trigger remains unverified. Keep its audit record; do not resend without authorization.

Validation: authenticated local browser, focused tests, lint, TypeScript and build pass. Full-suite unrelated failures and release prerequisites are in HANDOFF.md. No deployment or real email send is claimed.
