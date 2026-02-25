# Classic Visions Admin Platform - Master Guidelines & Plan

**Last Updated:** February 25, 2026  
**Status:** Single source of truth. Every new page, app, component, and Lovable prompt must follow this strictly.

## 1. Vision & Architecture

Transform the current /admin section into a scalable Odoo-style business management platform.  
Each application gets its own dedicated sidebar (driven by URL prefix `/admin/:appKey`).  
Central registry (`ADMIN_APPS`) makes adding new apps (Leads, Inventory, etc.) trivial.  
Shared shell (top bar + dynamic sidebar + outlet). Shared domain models (Contact, Opportunity, Product, etc.).

## 2. Page Granularity Rule (enforce everywhere)

Within each app:

- Give every distinct functional area its own sidebar entry + route.
- Preferred: Users vs Roles & Permissions, Pipeline vs Activities, etc.
- Use tabs/accordions ONLY inside:
  - Detail modals (e.g. User Detail tabs)
  - Configuration pages with related fields (Company → accordions)
  - Data-dense views (table row expansion)
    This keeps sidebars clean, URLs meaningful, and future growth trivial.

## 3. Non-Negotiable UX/UI Rules (enforce in code review + Lovable prompts)

- Iconography: Lucide React icons only. Same icon for same action everywhere (Eye, Edit3, Trash2, ToggleLeft/Right, etc.).
- Switches / toggles / checks: Always use shadcn/ui Switch + Label. Never native HTML.
- Tables: ALWAYS use <AdminDataTable /> wrapper. Never raw <table> or bare TanStack.
- Role visibility (hard-coded in component props):
  - Admin: full edit + cost visible + all pricelists
  - Operator: edit allowed (except RBAC & customer allocation) + cost visible (unless Admin toggles off)
  - Viewer (internal): read-only, no edit buttons, cost hidden, ALL pricelists
  - Customer (external): read-only, no edit buttons, cost hidden, ONLY assigned pricelists
- Cost column: Never rendered for Viewer or Customer (hide in UI + do NOT return from API).
- Persistent elements: “Help / Wiki” + “Back to Site” always pinned in sidebar footer for Viewer & Customer.

## 4. Skip Unsaved-Changes Prompt When Operator Hasn’t Manually Edited

[Keep your exact section here verbatim — the AddonFormDialog.tsx changes with userEditedRef, etc.]

## 5. Roles (internal & external)

**Internal:**

- Admin (super edits): full control of everything (users/roles, customers, pricelist definitions, products/lenses, imports/exports, customer pricelist allocation). Can see/edit cost.
- Operator (day-to-day ops): set active/inactive, generate pricelists, run imports/exports, maintain catalog updates. Cannot change RBAC or allocate customer access unless allowed.
- Viewer (read-only internal): navigation only + search/filter/sort/print/export ALL pricelists. Never sees cost.

**External:**

- Customer (read-only external): search/filter/sort/print/export ONLY the pricelists allocated to their account. Never sees cost.

**Cost visibility:** Configurable by Admin (default: Operator can see cost; Admin can toggle off).

## 6. Pricelists & Visibility Rules

- Types: WSPL (Wholesale Stock), PL (Wholesale Rx for sharing), WEB/Public (Retail website prices)
- Viewer: access/export ALL pricelists
- Customer: access/export ONLY assigned pricelists
- Cost hidden for Viewer & Customer everywhere (UI + API)
- Critical website rule: WEB/Public prices come exclusively from the Price Catalog. “Use Pricelist as Website Pricing Source” flag defaults to NO. Document clearly in Knowledge app.

## 7. Critical Business Rules (Lens & Add-ons)

- If a Lens has `webEnabled = true` → it can be sold through the RX order form.
- If `WSPL = true` → it can show as Semi-finished stock lens for wholesale purchase.
- Add-ons are only available on pricelists and on the RX order form.

## 8. UX Requirements

Data-dense tables: global search, column filters, sortable columns, column chooser, export (PDF/CSV/Excel).  
Read-only users must not see any edit controls.

## 9. Minimum Data Model

- Users (id, name, email, role, optional customer_id)
- Customers (id, name, status)
- CustomerPricelistAccess (customer_id, pricelist_id)
- Products/Lenses (id, sku/opc, description, attributes, active, cost, webEnabled, WSPL, etc.)
- Pricelists (id, name, type, rules, templates)
- PriceCatalog (id, product/lens_id, web_price fields)

## 10. Development Standards & Next Steps

- All apps registered in `ADMIN_APPS`
- Permissions use dot-notation (pricing._, leads._, settings.users, settings.roles, etc.)
- Leads app feeds CRM in real-time and links directly to Pricing for custom package building
- New pages must use AdminDataTable and respect all role rules

This document will be referenced in every Lovable prompt and every code review.

---

**Done?** Just reply **“plan.md updated”** (or paste a screenshot if you made any tweaks) and we immediately move to the first technical step:

**Step 1 of the Foundation (today):**  
Create the central `ADMIN_APPS` registry + refactor AdminSidebar/AppLauncher to be 100% dynamic.

This one step makes the whole suite scalable forever and prevents any rework when we build Leads or any future app.

Ready when you are — let’s lock the foundation in. 🚀
