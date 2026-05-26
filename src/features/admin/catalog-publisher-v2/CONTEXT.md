# Catalog Publisher v2 — Context

## What this is

The catalog publisher shell — handles section composition, the catalog list page,
and the publish/assignment flow. Sibling to `catalog-editor-v2/`.

## Relationship to editor-v2

- `catalog-publisher-v2/` = list page, wizard entry, publish/assign logic
- `catalog-editor-v2/` = the canvas editor workspace opened from the list page

Keep these concerns separate. Publisher owns the list and entry flow;
the editor owns the canvas workspace.

## Key behaviors

- List page at `/admin/pricing/publisher` — entry point for all catalog work
- New catalog wizard (`NewCatalogDialog`) will live here — **not yet implemented**
- Customer assignment dialog is here and is stable — do not modify unless explicitly tasked
- PDF download from the list page is a separate export path from the editor preview

## Do not

- Do not merge publisher list logic into the editor shell
- Do not modify the customer assignment dialog without a specific task scoping it
