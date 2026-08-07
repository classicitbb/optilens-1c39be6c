# Catalog Publisher v2 — Context

## What this is

The catalog publisher shell — handles section composition, the catalog list page,
and the publish/assignment flow.

**2026-08-07:** `catalog-editor-v2/` (the free-placement canvas editor this doc used to describe as
a sibling) was retired — see `docs/CATALOG_GENERATOR_PLAN.md`. Its PDF export helper moved to
`src/lib/generateCatalogPdf.ts`. New catalog-generation work extends the section-composition model
directly rather than reviving a canvas editor.

**Caution — this file's description does not match this folder's current code.** The actual live
list page is `src/pages/admin/CatalogPublisherPage.tsx` (outside this folder). What's actually inside
`catalog-publisher-v2/` today (`PackageBuilderPanel`, `ProposalPreviewPanel`, `SectionEditor`,
`useCatalogPublisherContext`, `usePriceCatalogItems`, `useProposalDraft`) is a separate sales-opportunity
proposal/package builder (`CatalogPublisherV2Page.tsx`, "Proposals"), not the catalog list/wizard/
publish flow described below. That mismatch predates this note and hasn't been investigated or
reconciled — treat the "Key behaviors" section as aspirational, not current, until someone does.

## Key behaviors (aspirational — see caution above)

- List page at `/admin/pricing/publisher` — entry point for all catalog work
- New catalog wizard (`NewCatalogDialog`) will live here — **not yet implemented**
- Customer assignment dialog is here and is stable — do not modify unless explicitly tasked
- PDF download from the list page is a separate export path from the editor preview

## Do not

- Do not merge publisher list logic into the editor shell
- Do not modify the customer assignment dialog without a specific task scoping it
