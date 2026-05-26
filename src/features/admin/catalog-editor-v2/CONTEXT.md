# Catalog Editor v2 — Context

## What this is

A canvas-based catalog editor being built to replace the legacy editor at
`/admin/pricing/publisher/:id`. **This folder is not yet the live route.**

Full behavior spec: `docs/catalog-editor-current-behavior.md`

## Component map

| File | Role |
|---|---|
| `components/EditorCanvas.tsx` | Centre A4 canvas — main editing surface |
| `components/CanvasEditorShell.tsx` | Outer shell: wires toolbar + sidebar + canvas + properties panel |
| `components/CanvasToolbar.tsx` | Top toolbar: save, publish, mode controls |
| `components/PageThumbnailsSidebar.tsx` | Left panel: page thumbnails |
| `components/PropertiesPanel.tsx` | Right panel: per-object properties |
| `components/CanvasObjectRenderer.tsx` | Renders individual draggable canvas objects |
| `components/CanvasPricingBlock.tsx` | Canvas object for pricing table blocks |
| `hooks/` | Editor-local hooks |
| `utils/` | Editor-local utilities |
| `types.ts` | Types scoped to this editor |

## Data model this editor touches

```
catalog_templates      — cover metadata, name, status (status column: migration pending)
catalog_sections       — ordered section rows; section_type, sort_order, pricelist_version_id, article_id
pricelist_versions     — pricing data source
help_articles          — content source for article-backed sections
```

## Invariants — do not break these

- Pricing section preview must reuse `PricelistLivePreview` (shared component).
- Article/fixed section preview must reuse `WikiArticleRenderer` (shared renderer).
- Preview and published output must go through the same render path — never fork them.
- Publishing must be blocked if render validation fails.

## What is NOT done yet (as of 2026-05-26)

- `NewCatalogDialog` — wizard for creating catalogs with starter presets (Full / Rx only / Supplies only / Blank)
- `status` column on `catalog_templates` — DB migration pending before publish flow can be wired
- True publish mutation — currently save and publish call the same routine
- Drag-and-drop section reordering that persists to DB
- Duplicate that clones `catalog_sections` rows (not just the template row)
