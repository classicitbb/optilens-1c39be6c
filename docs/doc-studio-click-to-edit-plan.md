# Doc Studio Preview Click-to-Edit Plan

## Goal

Let a desktop user select an editable region in the document preview and move
directly to its existing control in the left editor pane. The sidebar remains
the source of truth; the preview does not become a second, competing editor.

## Interaction

1. Mark each editable preview region with `data-ds-edit="<field-key>"` and a
   keyboard-accessible button or link role.
2. Clicking a region, or pressing Enter/Space while it is focused, selects it,
   adds a quiet outline, and scrolls the matching sidebar control into view.
3. Focus moves to the matching control. For rich-text bodies, focus moves to
   the existing TinyMCE editor rather than creating a new inline editor.
4. Clicking blank preview space clears the selected outline. Links, export
   controls, and other non-editable preview content retain their current
   behavior.

## Field mapping

Start with Email, Signature, and Billing—the three views most likely to be
revised from their preview.

| Preview region | Sidebar field |
| --- | --- |
| Email eyebrow, headline, CTA, footer copy | `emEyebrow`, `emHeading`, `emCta`, `emTagline` |
| Email body | existing Email TinyMCE editor |
| Signature name, title, phone, email, website | `sgName`, `sgTitle`, `sgPhone`, `sgEmail`, `sgWeb` |
| Billing recipient, number, dates, notes, payment details | matching `bl*` fields |

Add Letterhead, Price List, Ship Label, and Statement after the selection
pattern is proven. Repeated rows should include the row id in the data key so
the matching line-item or transaction control can be focused precisely.

## Technical approach

- Keep generation in the existing `buildEmail`, `buildBilling`, and related
  preview builders. Add data attributes only around already editable values.
- Use one delegated preview handler. It resolves a field key, records selected
  state, finds `[name="doc-studio-…"]` in the sidebar, scrolls it into view,
  and focuses it.
- Maintain one small field registry per document type. The registry owns the
  preview selector, sidebar field key, and whether the target is a TinyMCE
  editor or native control.
- Do not use `contenteditable` directly in generated preview markup in the
  first release. It would bypass current validation, autosave, and document
  generation paths.

## Accessibility and validation

- Selected preview regions need visible `:focus-visible` and selected-state
  styling, an accessible name, and keyboard activation.
- Preserve text selection inside document previews; selection should not
  accidentally activate editing.
- Verify Email, Signature, and Billing at 1280px, 1440px, and a narrow desktop
  window; test keyboard selection and direct typing in the focused sidebar
  field.
