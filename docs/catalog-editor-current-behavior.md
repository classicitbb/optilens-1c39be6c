# Current Catalog Editor Behavior

## Overview

The current catalog editor is the legacy admin catalog builder reached from:

- `/admin/pricing/publisher`
- individual editor route: `/admin/pricing/publisher/:id`

It is an admin-only workflow for assembling lens and supply catalogs from reusable pricing sections, fixed content sections, and public/customer-facing knowledge articles. The editor persists template metadata in `catalog_templates` and section composition in `catalog_sections`.

## Entry Flow

The catalog workflow starts on the catalog list page at `/admin/pricing/publisher`.

From there an authorized user can:

- create a new catalog template
- open an existing template
- assign a template to customers
- duplicate a template
- download a simple PDF export
- delete a template

New templates are initialized with:

- `name = "Untitled Catalog"`
- `cover_title = company_name` when available, otherwise `Product Catalog`
- `cover_subtitle = slogan` when available

## Editor Layout

The editor itself is a three-part workspace:

1. A left palette for adding section types
2. A center builder for cover settings and section ordering/configuration
3. A right live preview rendered inside a PDF-style preview shell

The preview updates from in-memory editor state, so cover edits and section configuration changes appear immediately before saving.

## What A Catalog Contains

Each catalog is made of ordered `catalog_sections` rows. A section stores:

- `section_type`
- `sort_order`
- `is_included`
- `pricelist_version_id`
- `format_choice`
- `article_id`
- `custom_title`

The editor currently supports three section families.

### 1. Pricing sections

- `rx_prices`
- `stock_prices`
- `supplies_prices`

These sections must be linked to a `pricelist_versions` record. In preview they embed the shared `PricelistLivePreview` renderer rather than using a separate catalog-only pricing renderer.

Behavior by section:

- `rx_prices` can render in either `list` or `matrix` format
- `stock_prices` renders in list format
- `supplies_prices` renders in list format

If no pricelist version is selected, the preview shows a placeholder message instead of pricing data.

### 2. Knowledge article sections

The editor can insert a `knowledge_article` section that points to an article from `help_articles`.

Eligible articles are restricted to records that are:

- active
- `content_type` of `knowledge` or `faq`
- `visibility` of `public` or `customer`

For each knowledge article section the editor supports:

- selecting the source article
- choosing text length mode: `summary`, `excerpt`, or `full`
- overriding the displayed section title
- opening the article content in the rich text section editor once an article is linked

Preview behavior:

- `summary` uses the article description plus roughly the first 700 characters of content
- `excerpt` uses the description plus roughly the first 1800 characters
- `full` uses the full stored article content

Knowledge article body rendering goes through the shared `WikiArticleRenderer`, so it follows the same article rendering path used elsewhere instead of plain text rendering.

### 3. Fixed content sections

The fixed section palette currently exposes:

- Terms & Conditions
- Contact Information
- Additional Charges
- Dispensing Guide
- LabLink Instructions
- Special Services
- Custom Text

These sections are backed by `help_articles` records keyed by `page_slug = section_type`. The rich text dialog will:

- load the matching article if it already exists
- allow editing title, summary/description, and body
- create a new `help_articles` record if none exists yet

New fixed-section content is created with:

- `content_type = "knowledge"`
- `visibility = "customer"`
- `category = "Catalog"`
- `is_active = true`

In preview, fixed sections also render through `WikiArticleRenderer` when stored content exists. If no article exists yet, the preview falls back to a placeholder note instead of synthesizing content from company settings.

## Cover Editing Capabilities

The editor stores cover settings on the template itself. Today the cover supports:

- catalog name
- cover title
- cover subtitle
- cover body copy
- cover footer
- gradient start and end colors
- gradient angle
- enabling/disabling gradient overlay
- toggling dark text
- uploaded logo image
- uploaded background image

Uploaded assets are written to the Supabase storage bucket `data-files` under:

- `catalogs/<template-id>/logo-*`
- `catalogs/<template-id>/background-*`

The upload validation is currently limited to:

- image MIME type
- maximum file size of 8 MB

Cover subtitle storage is overloaded slightly:

- simple subtitle-only data may be stored as plain text
- richer cover settings are serialized as JSON into `cover_subtitle`

## Section Management Capabilities

Within a template, users can:

- add sections from the palette
- reorder sections with move up/down controls
- toggle section inclusion with a checkbox
- remove sections
- edit pricing linkage and format settings
- edit content for fixed and knowledge sections

Ordering is persisted by updating each section row’s `sort_order`.

## Preview Behavior

The live preview renders:

- a cover page
- a generated table of contents
- one preview block per included section
- a footer using company settings when available

Important implementation detail:

- pricing sections reuse `PricelistLivePreview`
- knowledge and fixed content sections reuse `WikiArticleRenderer`

That means the catalog editor already honors the shared wiki article rendering path for article-backed content.

## Save And Publish Behavior

The top bar exposes:

- `Save & Exit`
- `Save Template`
- `Save & Publish`

Current behavior:

- `Save & Exit` saves template cover metadata, then returns to the catalog list
- `Save Template` saves template cover metadata in place
- `Save & Publish` currently calls the same save routine and then shows a `Published` toast

There is no separate publish mutation, status field update, validation gate, or publication workflow in this editor today. Section rows are persisted as they are edited through their own mutations, independent of the top-bar save buttons.

## Customer Assignment

Customer assignment is handled on the list page, not inside the editor. The assign dialog:

- loads customers from `customers`
- loads existing rows from `catalog_assignments`
- replaces the assignment set for the selected template on save

This is a straightforward many-to-many assignment mechanism between templates and customers.

## Notable Current Behaviors And Limitations

- Duplicate currently copies the `catalog_templates` row only. It does not copy the source template’s `catalog_sections` or customer assignments.
- The list page marks templates as `Draft`, but that status is only UI text right now.
- The simple PDF download from the list page is separate from the editor preview and does not mirror the full section-based editor output.
- Fixed-section preview fallback text says content will be rendered from company settings and templates, but the implemented behavior is a placeholder message unless a matching `help_articles` record exists.
- Reordering is implemented with explicit up/down actions; there is no drag-and-drop persistence even though the UI visually hints at drag handles.
- Pricing section availability depends entirely on existing pricelist versions and rows. The editor does not create pricing data itself.

## Summary

In its current form, the catalog editor is best described as a section-based catalog composition tool layered on top of:

- `catalog_templates` for cover metadata
- `catalog_sections` for structure
- `pricelist_versions` and catalog rows for pricing output
- `help_articles` for reusable rich text content

Its strongest current capabilities are:

- mixing pricing and article-driven content in one catalog
- live PDF-style preview while editing
- reusing the shared wiki article renderer for article content
- assigning finished templates to customers

Its biggest current gaps are:

- no true publish state or validation workflow
- duplication that does not clone section composition
- split export behavior between the editor preview and the list-page PDF download
