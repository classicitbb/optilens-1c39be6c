import { BookOpen, Glasses, Package, Upload, Database, DollarSign, Users, Ship, FileSpreadsheet, Settings } from "lucide-react";

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
}

export interface WikiCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  articles: WikiArticle[];
}

export const wikiCategories: WikiCategory[] = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      {
        id: "overview",
        title: "Overview of the Admin Tool",
        content:
          "OptiPricing is the internal pricing, catalog, and quotation management tool for OptiLens Pro. It enables authorized users to manage lenses, supplies, add-ons, pricing parameters, reference data, import costings, and customer quotations.\n\n**Key Capabilities:**\n• Product Catalog — Manage lenses, add-ons, and supplies with full pricing and flag controls.\n• Pricing Engine — Treatment matrices, pricelist versions, and markup/discount hierarchies for RX, Stock, and Supplies pricing.\n• Quotations — Build, price, and export customer quotes with real-time profitability tracking.\n• Import Costings — Track landed costs of imported goods with proportional charge allocation.\n• Reference Data — Maintain lookup tables (Suppliers, Brands, Materials, Lens Types, etc.).\n• User Management — Role-based access control with Admin, Operator, Viewer, and Customer roles.\n• Content Management — Manage wiki articles, knowledge base content, FAQs, and legal pages.\n\nThe sidebar on the left provides quick access to every section. The Help panel (? icon in the top bar) shows contextual articles relevant to the page you're currently viewing.",
      },
      {
        id: "navigating-sidebar",
        title: "Navigating the Sidebar",
        content:
          "The sidebar organizes all admin functionality into logical groups:\n\n**Product Catalog** (expandable group)\n• Product Catalog — Main catalog with Lenses, Add-Ons, and Supplies tabs.\n• Reference Data — Lookup tables for Suppliers, Brands, Materials, Lens Types, Finish Types, MF Types, and Lens Options.\n• Imports — Bulk CSV import for Lenses, Supplies, Add-Ons, and Frames.\n• Exports — Download catalog data.\n\n**Standalone Pages:**\n• RX Lens Prices — Treatment matrices, markup hierarchies, and pricelist catalog for prescription lenses.\n• Stock Lens Prices — Semi-finished stock lens pricing grouped by MF Type (WSPL).\n• Supplies Prices — Supplies catalog pricelist grouped by supply type.\n• Quotations — Build and manage customer quotes.\n• Import Costings — Track shipment landed costs.\n• Users — User management and role assignment (Admin only).\n• Settings — Company variables, pricing parameters, and audit log (Admin only).\n\n**Footer Links:**\n• Website Content — CMS for knowledge base, FAQs, and legal pages.\n• Help / Wiki — This wiki (you are here).\n• Back to Site — Return to the public storefront.\n\nYou can collapse the sidebar by clicking the panel toggle at the top. Sections marked with restricted access are hidden from unauthorized roles.",
      },
      {
        id: "user-roles",
        title: "User Roles & Permissions",
        content:
          "The system uses four roles with tiered access:\n\n**Admin** — Full control of everything: users/roles, customers, pricelist definitions, reference data, products/lenses, active/inactive toggles, imports/exports, pricelist generation, customer pricelist allocation, company settings, and audit log. Can see Cost columns. Can edit all rows and perform deletions.\n\n**Operator** — Day-to-day operations: can set items/lenses active/inactive, generate pricelists, run imports/exports, maintain catalog updates. Cannot change RBAC rules, cannot allocate customer access unless Admin allows. Cost visibility is configurable by Admin (default: visible).\n\n**Viewer** — Read-only internal access: can search/filter/sort the Product Catalog, Reference Data, Lens Prices, and Help/Wiki. Can view and export ALL pricelists (PDF/CSV/Excel). Cannot edit any rows, cannot deactivate items/lenses. Cost column is NEVER visible.\n\n**Customer** — External read-only: can search/filter/sort and export ONLY pricelists allocated to their customer account by Admin. Cannot edit, cannot deactivate. Cost column is NEVER visible.\n\n**Permission Matrix:**\nPermissions are managed via a checkbox grid on the Users page. Each feature can have View and Edit permissions toggled per role. The global permissions table controls what sidebar items are visible to each role.\n\n**Example Workflow — Adding a New User:**\n1. Navigate to Users in the sidebar.\n2. Click 'Invite User' and enter their email.\n3. Select their role (Admin, Operator, Viewer, or Customer).\n4. For Customer users, assign the relevant customer account and allocate specific pricelists.\n5. The user receives an email invitation to set their password.",
      },
    ],
  },
  {
    id: "lens-catalog",
    icon: Glasses,
    title: "Lens Catalog",
    articles: [
      {
        id: "catalog-overview",
        title: "Product Catalog Overview",
        content:
          "The Product Catalog page (/admin/catalog) is the central hub for managing all products. It has three tabs:\n\n**Lenses Tab** — All lens products with supplier, brand, material, lens type, finish type, MF type, index value, SPH/CYL/ADD ranges, base price, sell price, and flag toggles.\n\n**Add-Ons Tab** — Coatings, tints, and extras that attach to lens orders. Each has name, SKU, category, supplier, cost, price, and flags.\n\n**Supplies Tab** — Non-lens items (cases, cloths, tools) with name, SKU, category, supplier, brand, base price, sell price, currency, unit, and quantity per unit.\n\n**Global Search:** The search bar at the top supports wildcard matching with the % symbol (e.g., 'CR%SV' matches 'CR-39 SV'). Without wildcards, it defaults to case-insensitive substring matching.\n\n**Export:** Click the Export button to download the current filtered view as an Excel file.",
      },
      {
        id: "adding-editing-lenses",
        title: "Adding & Editing Lenses",
        content:
          "Open the Lenses tab and click 'Add Lens' or click any row to edit. The form has two sections:\n\n**Item Info (left column):**\n• Name — Descriptive lens name\n• Supplier — Select from active suppliers\n• Brand — Select from active brands\n• Material — Select from active materials\n• Lens Type — Single Vision, Progressive, Bifocal, etc.\n• Finish Type — Optional finish classification\n• MF Type — Manufacturing type\n• Index Value — Refractive index (1.50, 1.53, 1.59, 1.60, 1.67, 1.74)\n• SPH Range — Min/Max sphere power\n• CYL Range — Min/Max cylinder power\n• ADD Range — Min/Max addition power (for progressives/bifocals)\n\n**Flags & Pricing (right column):**\n• PL (Price List) — Include on standard Rx pricelist\n• Full Lab — Requires full laboratory surfacing (adds duty, freight, labour to pricing)\n• WSPL (Wholesale) — Show on wholesale stock pricelist\n• Web — Display on public website store\n• Notes — Free-text notes\n• Base Price — Cost from supplier\n• Sell Price — Your selling price\n• Calculated Values — FX Cost, CIF Cost, Landed Cost, Full Cost, Strategic Price (read-only)\n\n**Example Workflow — Adding a New Lens:**\n1. Click 'Add Lens' on the Lenses tab.\n2. Fill in name, select supplier, brand, material, and lens type.\n3. Set the index value and SPH/CYL ranges.\n4. Enter the base price from the supplier invoice.\n5. Set flags: enable PL if it should appear on Rx pricelists, WSPL for wholesale.\n6. Enter the sell price. Watch the governance alerts — if sell price is below the floor, you'll need a concession reason.\n7. Click Save.",
      },
      {
        id: "understanding-flags",
        title: "Understanding Flags",
        content:
          "Flags control where and how products appear across the system:\n\n**Lens Flags:**\n• **PL (Price List)** — When ON, lens appears in the RX Lens Prices pricelist catalog. This is the standard wholesale Rx pricelist for sharing with opticians.\n• **Full Lab** — When ON, the pricing engine adds duty, freight/CIF charges, and labour percentages to the cost calculation. Use for lenses requiring full laboratory surfacing.\n• **WSPL (Wholesale Stock Pricelist)** — When ON, lens appears as a semi-finished stock lens in the Stock Lens Prices page. These are lenses available for wholesale purchase.\n• **Web** — When ON, lens can be sold through the Rx order form on the public website.\n\n**Supply Flags:**\n• Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid — Operational flags.\n• Show in Price List, Stk WSPL — Controls pricelist inclusion.\n• Show on Website — Controls public store visibility.\n\n**Add-On Flags:**\n• Active — Whether the add-on is available.\n• Auto — Automatically applied based on rules (e.g., auto-apply AR coating).\n• Show on Website — Display on public store.\n\n**Important:** Add-ons are only available on pricelists and on the RX order form. If a Lens has Web enabled, it can be sold through the Rx order form. If WSPL is enabled, it shows as a semi-finished stock lens for wholesale purchase.",
      },
      {
        id: "calculated-pricing",
        title: "Calculated Pricing Values",
        content:
          "When a lens is saved, the pricing engine computes several values using parameters from the Settings page:\n\n**Calculation Chain:**\n1. **FX Cost** = Base Price × Exchange Rate\n   Example: $50 USD × 2.00 = $100 BBD\n\n2. **CIF Cost** = FX Cost + Freight + Insurance\n   Example: $100 + $5 + $2 = $107 BBD\n\n3. **Landed Cost** = CIF Cost + Import Duty\n   Example: $107 + $10.70 (10% duty) = $117.70 BBD\n\n4. **Full Cost** = Landed Cost + Labour % + Overhead %\n   Example: $117.70 × (1 + 0.15 + 0.08) = $144.77 BBD\n\n5. **Strategic Price** = Full Cost ÷ (1 − Target Margin)\n   Example: $144.77 ÷ (1 − 0.40) = $241.28 BBD\n\nThese values appear as read-only fields in the lens form. The Strategic Price serves as the recommended selling price. If Full Lab is OFF, duty/freight/labour steps are skipped.\n\n**Floor Price:**\nThe floor price = Full Cost ÷ (1 − Floor Margin %). Selling below this triggers governance alerts.",
      },
      {
        id: "governance-rules",
        title: "Governance Rules",
        content:
          "Governance rules protect against selling below cost or below minimum margin thresholds.\n\n**How It Works:**\n• If the sell price falls below the calculated floor price, a governance alert banner appears in the lens form.\n• The alert shows the current margin vs. the floor margin and the minimum acceptable price.\n\n**Settings (configured in Settings > Pricing Parameters):**\n• **Require Concession Reason** — When ON, user must select or type a reason before saving a below-floor price. Reasons include: Match competitor, Strategic account, Clearance stock, Pricing error, Bundle deal, Warranty/remake, Other.\n• **Block Below Floor** — When ON, saving is prevented entirely if the price is below floor.\n• **Block Loss** — When ON, selling below landed cost (i.e., at a loss) is blocked.\n\n**Margin Status Badges:**\n• 🟢 Green — Healthy margin (above target)\n• 🟡 Amber — Thin margin (above floor, below target, 0–15%)\n• 🔴 Red — Below floor or loss-making\n• Row shading: Pink = zero cost, Red = selling at a loss, Amber = thin margin.\n\n**Example Workflow — Concession Override:**\n1. Set a sell price below the floor.\n2. A governance alert appears with the reason the price is below threshold.\n3. Select a concession reason from the dropdown (e.g., 'Match competitor').\n4. Optionally add a note explaining the business justification.\n5. Click Save — the concession is logged in the audit trail.",
      },
    ],
  },
  {
    id: "supplies-addons",
    icon: Package,
    title: "Supplies & Add-Ons",
    articles: [
      {
        id: "managing-supplies",
        title: "Managing Supplies",
        content:
          "Supplies are non-lens items managed on the Supplies tab of the Product Catalog.\n\n**Fields:**\n• Name, SKU, Category (Cases, Cloths, Tools, etc.)\n• Supplier, Brand\n• Base Price (cost from supplier), Sell Price\n• Currency, Unit of Measure, Qty per Unit\n\n**Flag Toggles:** Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid, Show in Price List, Stk WSPL, Show on Website.\n\n**Row Shading (pricing health):**\n• Pink — Zero cost (no base price entered)\n• Red — Selling at a loss (sell price < base price)\n• Amber — Thin margin (0–15%)\n\n**Example Workflow — Adding a Supply:**\n1. Go to Product Catalog > Supplies tab.\n2. Click 'Add Supply'.\n3. Enter name, SKU, select category and supplier.\n4. Enter base price and sell price.\n5. Toggle flags as needed (e.g., Show on Website if selling online).\n6. Click Save.",
      },
      {
        id: "managing-addons",
        title: "Managing Add-Ons",
        content:
          "Add-ons are extras attached to lens orders (coatings, tints, UV protection, etc.), managed on the Add-Ons tab.\n\n**Fields:**\n• Name, SKU, Category (Coating, Tint, Treatment, etc.)\n• Supplier\n• Cost (what you pay), Price (what you charge)\n• Sort Order (controls display position on pricelists)\n\n**Flags:**\n• Active — Whether the add-on is available for selection.\n• Auto — Automatically applied based on rules. When Auto is enabled, you can configure auto-application rules (e.g., always add AR coating to progressive lenses).\n• Show on Website — Display on the public Rx order form.\n\n**Important:** Add-ons appear only on pricelists and the RX order form. They do not have standalone product pages.\n\n**Pricelist Integration:**\nAdd-ons can have price overrides per pricing sheet. Go to the add-on's pricing sheets panel to set custom prices for specific pricelists.\n\n**Example Workflow — Creating an Auto Add-On:**\n1. Click 'Add Add-On' on the Add-Ons tab.\n2. Enter name (e.g., 'Standard AR Coating'), SKU, category.\n3. Set cost and price.\n4. Enable the 'Auto' flag.\n5. Configure the auto-rule (e.g., apply to all lenses with index ≥ 1.60).\n6. Click Save.",
      },
      {
        id: "supplies-prices-page",
        title: "Supplies Prices Page",
        content:
          "The Supplies Prices page (/admin/supplies-prices) manages the supplies pricelist, separate from the Product Catalog.\n\n**Features:**\n• **Pricelist Versions** — Create and manage multiple versions of the supplies pricelist. Each version can have different markup/discount settings.\n• **List Catalog** — View all supplies grouped by category with BBD and optional USD pricing columns.\n• **Live Preview** — See exactly how the pricelist will look when exported or shared.\n• **Export** — Download as PDF or Excel.\n\n**BBD/USD Toggle:** Switch between local currency and USD display using the toggle in the header.\n\n**Workflow — Generating a Supplies Pricelist:**\n1. Navigate to Supplies Prices.\n2. Select or create a pricelist version.\n3. Review the list catalog — items are auto-grouped by supply category.\n4. Adjust any line overrides if needed.\n5. Click the preview button to verify the final layout.\n6. Export as PDF or Excel for distribution.",
      },
    ],
  },
  {
    id: "imports",
    icon: Upload,
    title: "Imports",
    articles: [
      {
        id: "importing-csv",
        title: "Importing from CSV",
        content:
          "The Imports page (/admin/imports) supports bulk data upload via CSV files. There are four tabs:\n\n• **Lenses** — Import lens catalog data.\n• **Supplies** — Import supply catalog data.\n• **Add-Ons** — Import add-on catalog data.\n• **Frames** — Import frame data.\n\n**Step-by-step Import Process:**\n1. Select the appropriate tab for the data type.\n2. Click 'Upload CSV' or drag-and-drop your file.\n3. The system parses the file and shows a preview of rows to be imported.\n4. Review the mapping — columns are auto-matched to database fields.\n5. Resolve any reference mapping issues (see next article).\n6. Click 'Import' to process the data.\n7. Review the import summary showing success/error counts.\n\n**Expected CSV Format:**\nEach tab shows the expected column headers. Download a template CSV for reference. Column order does not matter — the system matches by header name.",
      },
      {
        id: "resolving-ref-mappings",
        title: "Resolving Reference Mappings",
        content:
          "When CSV values for Supplier, Brand, Material, Lens Type, or other reference fields don't exactly match existing reference data, the import wizard asks you to map them.\n\n**How It Works:**\n1. The system identifies unmatched values (e.g., CSV says 'Essilor' but reference data has 'Essilor International').\n2. For each unmatched value, you select the correct reference data entry from a dropdown.\n3. Mappings are saved and remembered for future imports — you only resolve each value once.\n\n**Managing Saved Mappings:**\nSaved mappings can be viewed and cleared from the import settings. If a supplier changes their name, update the mapping rather than editing all historical data.\n\n**Example:**\nCSV contains 'HoyaLens' → System doesn't find an exact match → You map it to 'Hoya' from the Brands reference table → All future imports with 'HoyaLens' auto-resolve to 'Hoya'.",
      },
      {
        id: "handling-duplicates",
        title: "Handling Duplicates & Errors",
        content:
          "**Duplicate Detection:**\nWhen an imported row matches an existing record (by name or SKU), you can:\n• **Overwrite** — Replace the existing record with the new data.\n• **Skip** — Ignore the duplicate and keep the existing record.\nThis is configured per import batch.\n\n**Error Handling:**\n• Rows with validation errors are flagged in red.\n• Common errors: missing required fields, invalid number formats, unresolved reference mappings.\n• You can fix errors inline in the preview grid before confirming the import.\n• The import summary shows total rows, successful imports, and error count.\n\n**Import History:**\nAll imports are logged with batch ID, filename, timestamp, user, and success/error counts. This provides an audit trail of all data changes made via import.",
      },
    ],
  },
  {
    id: "reference-data",
    icon: Database,
    title: "Reference Data",
    articles: [
      {
        id: "managing-ref-tables",
        title: "Managing Reference Tables",
        content:
          "Reference Data (/admin/reference) manages the lookup tables used throughout the system. Each table contains entries with:\n\n• **Name** — Display name (e.g., 'Essilor')\n• **Code** — Short code for data exchange\n• **Abbreviation** — Compact label for tables and reports\n• **Active/Inactive** — Controls whether the entry appears in dropdown selections\n\n**Available Tables:**\n• **Suppliers** — Companies that supply products.\n• **Brands** — Product brand names.\n• **Materials** — Lens materials (CR-39, Polycarbonate, Hi-Index, etc.).\n• **Lens Types** — Single Vision, Progressive, Bifocal, Trifocal, etc.\n• **Finish Types** — Surface finish classifications.\n• **MF Types** — Manufacturing type classifications.\n• **Lens Options** — Additional lens options/treatments.\n\n**Wildcard Search:** Use % for pattern matching in the search bar (e.g., 'Poly%' finds 'Polycarbonate' and 'Polyurethane').\n\n**Example Workflow — Adding a New Supplier:**\n1. Navigate to Reference Data.\n2. Select the 'Suppliers' tab.\n3. Click 'Add' (+ button).\n4. Enter the Name, Code, and Abbreviation.\n5. Ensure Active is toggled ON.\n6. Click Save.",
      },
      {
        id: "deactivating-vs-deleting",
        title: "Deactivating vs. Deleting",
        content:
          "**Deactivation (recommended):**\nMark an entry as Inactive to hide it from future dropdown selections while preserving existing references. Existing lenses/supplies that use the deactivated entry remain valid.\n\n**Deletion:**\nReference data items that are currently in use by lenses, supplies, or other records CANNOT be deleted. The system blocks deletion and shows which records reference the entry. Only unused entries can be deleted.\n\n**When to Use Each:**\n• A supplier stops providing products → Deactivate (their historical products still reference them).\n• A test entry was created by mistake with no references → Delete.\n• A brand is acquired/renamed → Add the new name, then deactivate the old one.\n\n**Important:** Deactivated entries still appear in the data tables (greyed out) so you can reactivate them later if needed. They just don't appear in dropdown menus for new records.",
      },
    ],
  },
  {
    id: "pricing-engine",
    icon: DollarSign,
    title: "Pricing Engine",
    articles: [
      {
        id: "pricing-overview",
        title: "Pricing Engine Overview",
        content:
          "The Pricing Engine drives all pricing across three modules:\n\n• **RX Lens Prices** (/admin/rx-lens-prices) — Prescription lens pricelists with treatment matrices.\n• **Stock Lens Prices** (/admin/stock-lens-prices) — Semi-finished stock lenses for wholesale (WSPL).\n• **Supplies Prices** (/admin/supplies-prices) — Supplies catalog pricelist.\n\nAll three use the same underlying architecture:\n• **Pricelist Versions** — Multiple named versions with master markup/discount settings.\n• **List Catalog** — Organized rows grouped by section (lens type, treatment, category).\n• **Live Preview** — Real-time preview of the final formatted pricelist.\n• **Export** — PDF, CSV, and Excel export options.",
      },
      {
        id: "rx-lens-prices",
        title: "RX Lens Prices — Treatment Matrices",
        content:
          "The RX Lens Prices page has two main tabs:\n\n**Matrix Tab:**\nThe treatment matrix is a grid showing prices by Treatment Type (rows) × Material Index (columns: 1.50, 1.53, 1.59, 1.60, 1.67, 1.74). Each cell contains the price for that treatment+index combination.\n\n• Prices flow from the base Price Matrix table.\n• Empty columns (where no lenses exist for that index) can be auto-collapsed.\n• Cells can be individually overridden with a reason.\n\n**List Catalog Tab:**\nShows all items included in the pricelist as a flat, ordered list grouped by section. Items include lenses (from catalog with PL flag), add-ons, and manual entries.\n\n• Reorder items with drag or sort-order fields.\n• Add/remove items from the pricelist.\n• Override individual line prices.\n\n**BBD/USD Toggle:** All prices can be viewed in BBD or USD (using the configured exchange rate).\n\n**Example Workflow — Building an Rx Pricelist:**\n1. Navigate to RX Lens Prices.\n2. Select or create a pricelist version.\n3. Go to the Matrix tab — review treatment prices across material indices.\n4. Override any cells as needed (provide a reason).\n5. Switch to the List Catalog tab — verify all items and sections.\n6. Click Preview to see the formatted pricelist.\n7. Export as PDF for distribution.",
      },
      {
        id: "markup-hierarchy",
        title: "Markup & Discount Hierarchy",
        content:
          "Pricelist versions support a multi-level markup/discount hierarchy:\n\n**Master Level:**\n• Master Markup % — Applied to all prices in the version.\n• Master Discount % — Applied after markup.\n• Formula: Final Price = Base Price × (1 + Markup%) × (1 − Discount%)\n\n**Section Level (Child Sections):**\nEach section (e.g., 'Coatings', 'Tints') can have its own markup and discount that override or layer on top of the master settings.\n\n**Line Level (Overrides):**\nIndividual line items can have price overrides that bypass all hierarchy calculations.\n\n**Calculation Example:**\n• Base Price: $100.00\n• Master Markup: 20% → $100 × 1.20 = $120.00\n• Master Discount: 10% → $120 × 0.90 = $108.00\n• If a section has its own Markup 15% and Discount 5%:\n  → $100 × 1.15 × 0.95 = $109.25\n• If a line override sets the price to $95.00, that is the final price regardless.\n\n**Priority:** Line Override > Section Markup/Discount > Master Markup/Discount > Base Price.",
      },
      {
        id: "pricelist-versions",
        title: "Pricelist Versions",
        content:
          "Pricelist versions let you maintain multiple pricing configurations simultaneously.\n\n**Fields:**\n• Name — Descriptive version name (e.g., 'Q1 2026 Standard', 'Wholesale Tier 2').\n• Format Type — Matrix or List.\n• Base Currency — BBD or USD.\n• Master Markup % — Global markup applied to all prices.\n• Master Discount % — Global discount applied after markup.\n• Template Flag — Mark as a template for duplicating.\n\n**Version Management:**\n• Create new versions from scratch or duplicate existing ones.\n• When duplicating, all matrix allocations, catalog rows, and section settings are cloned.\n• Only one version is active for export at a time (selected in the version dropdown).\n• Previous versions are preserved for historical reference.\n\n**Workflow — Duplicating a Pricelist Version:**\n1. Select the version to duplicate.\n2. Click the duplicate/copy button.\n3. Enter a new name for the cloned version.\n4. The system copies all matrix allocations, catalog rows, and overrides.\n5. Edit the new version's markup/discount as needed.\n6. The original remains unchanged.",
      },
      {
        id: "stock-lens-prices",
        title: "Stock Lens Prices (WSPL)",
        content:
          "The Stock Lens Prices page (/admin/stock-lens-prices) manages pricing for semi-finished stock lenses sold wholesale.\n\n**Key Differences from RX:**\n• No treatment matrix — stock lenses use a list catalog only.\n• Items are auto-grouped by MF Type (Manufacturing Type).\n• Only lenses with the WSPL flag enabled appear here.\n\n**Features:**\n• Pricelist version selection with markup/discount settings.\n• BBD/USD toggle.\n• Live Preview for final pricelist layout.\n• Export to PDF and Excel.\n\n**Workflow — Reviewing Stock Lens Prices:**\n1. Navigate to Stock Lens Prices.\n2. Select the active pricelist version.\n3. Review items grouped by MF Type.\n4. Verify prices — toggle USD view if distributing internationally.\n5. Export for wholesale distribution.",
      },
      {
        id: "margin-safety",
        title: "Margin Safety & Floor Prices",
        content:
          "The system enforces margin safety to prevent unprofitable pricing.\n\n**Target Margin:**\nThe ideal gross margin percentage. Sell prices at or above this margin show green status badges.\n\n**Floor Margin:**\nThe absolute minimum margin percentage. Prices between floor and target show amber badges. Prices below floor show red badges and may trigger governance blocks.\n\n**Category-Specific Margins:**\nDifferent product categories can have different target and floor margins (configured in Settings > Pricing Parameters).\n\n**Calculation:**\n• Floor Price = Full Cost ÷ (1 − Floor Margin %)\n• If Sell Price < Floor Price → Governance alert triggered\n• If 'Block Below Floor' is ON → Save is blocked\n• If 'Require Concession Reason' is ON → Must provide justification\n\n**Margin Status Badges in Tables:**\n• 🟢 Green — Above target margin\n• 🟡 Amber — Between floor and target\n• 🔴 Red — Below floor margin",
      },
    ],
  },
  {
    id: "import-costings",
    icon: Ship,
    title: "Import Costings",
    articles: [
      {
        id: "ic-purpose",
        title: "Purpose & Scope",
        content:
          "Import Costings tracks the landed cost of goods imported into the business. It records each shipment's foreign-currency purchase price, local charges incurred during import (shipping, duties, brokerage, etc.), and allocates those charges across line items to arrive at a per-unit landed cost in BBD and USD.\n\n**What it IS:**\n• A cost-tracking and allocation tool.\n• Produces accurate landed costs for pricing decisions and financial reporting.\n• Supports both Lens and Non-Lens shipments.\n\n**What it is NOT:**\n• Not an accounting module — does not post journal entries.\n• Not a payment system — does not track supplier payments.\n• Not a purchase order system — PO references are informational only.\n\n**Navigation:**\nImport Costings is accessed via the sidebar. The shipments list shows all shipments with filters for type, status, and supplier.",
      },
      {
        id: "ic-status-workflow",
        title: "Status Workflow",
        content:
          "Every shipment follows a three-stage lifecycle:\n\n**Draft** → **Reviewed** → **Locked**\n\n**Draft:** Fully editable. All header fields, charges, and line items can be added, changed, or removed.\n\n**Reviewed:** Still editable but signals data has been checked. Admin can move back to Draft if needed.\n\n**Locked:** No edits allowed. Freezes all values. Only Admins can lock. To make changes after locking, create a Revision.\n\n**Role Permissions:**\n• Admin — Can change status in any direction, lock, and create revisions.\n• Operator — Can create/edit Draft and Reviewed. Cannot lock.\n• Viewer — Read-only access to all shipments.\n\n**Revisions:**\nWhen a locked shipment needs correction:\n1. Open the locked shipment.\n2. Click 'Create Revision' (Admin only).\n3. A new Draft is created with all data cloned, version incremented (v1 → v2).\n4. Original locked shipment is preserved unchanged.",
      },
      {
        id: "ic-create-shipment",
        title: "Creating a Shipment",
        content:
          "**Step-by-step:**\n1. Navigate to Import Costings and click '+ New Shipment'.\n2. Fill in header fields:\n   • Type — Lens or Non-Lens.\n   • Supplier — Select from active suppliers.\n   • Commodity — Description of goods.\n   • Date Received, Invoice Number, Invoice Date.\n   • Currency — Foreign currency (default: USD).\n   • Exchange Rate (XR) — BBD per 1 unit of foreign currency (typically 2.00 for USD).\n   • FOB (Foreign) — Free On Board value in foreign currency.\n   • Invoice Total (Foreign) — Full invoice amount.\n3. Optional: PO Reference, Date Ordered.\n4. Click 'Create' — Charges and Line Items tabs become available.\n\n**FOB vs Invoice Total:**\nFOB is the goods value used for cost allocation. Invoice Total is the supplier's billed amount (may include supplier-side freight). They can differ.\n\n**Attachments:** Upload scanned invoices, packing lists, and broker statements for audit trail.",
      },
      {
        id: "ic-add-charges",
        title: "Adding Charges",
        content:
          "Charges are local costs in BBD incurred during import, entered on the Charges tab.\n\n**Charge Types:**\n• Shipping, Landing, Duties & VAT, Brokerage, Local Freight, Courier, Bank Expenses, Miscellaneous, Storage.\n\n**How to Enter:**\n1. Click '+ Add Charge'.\n2. Select charge type.\n3. Enter Amount (BBD).\n4. Optionally enter VAT (BBD).\n5. For 'Duties & VAT' type: additional Duty (BBD) and VAT Reclaimable toggle.\n\n**Important Rules:**\n• Do NOT enter supplier payment as a charge — that's captured in FOB/Invoice Total.\n• All charge amounts must be in BBD — do not mix currencies.\n• Enter duty only in the Duties & VAT row — don't duplicate.\n\n**Row Total and Total Charges are calculated automatically.**",
      },
      {
        id: "ic-line-items",
        title: "Adding Line Items",
        content:
          "Line items represent individual products within a shipment, entered on the Line Items tab.\n\n**Product Types (Non-Lens shipments):**\n• Supply — Links to Supply catalog record.\n• Add-On — Links to Add-On catalog record.\n• Free Item — No catalog link (for samples, promos, uncatalogued goods).\n\n**For Lens shipments:** All line items link to Lens catalog records.\n\n**Fields:**\n• Product (searchable dropdown) — select from catalog.\n• Quantity — number of units.\n• Unit FOB (Foreign) — price per unit in foreign currency.\n• Line FOB — auto-calculated (Qty × Unit FOB).\n\nAll computed columns (Line FOB BBD, Landed Unit Cost BBD/USD) update automatically once charges are entered.",
      },
      {
        id: "ic-calculations",
        title: "Understanding the Calculations",
        content:
          "Import Costings uses proportional allocation to distribute charges across line items based on FOB value.\n\n**Key Formulas:**\n\n**FOB (BBD)** = FOB (Foreign) × Exchange Rate\nExample: $5,000 USD × 2.00 = $10,000 BBD\n\n**Total Charges (BBD)** = Sum of all charge row totals\nExample: Shipping $500 + Duties $1,000 + Brokerage $200 = $1,700 BBD\n\n**Multiplier** = (FOB BBD + Total Charges BBD) ÷ FOB BBD\nExample: ($10,000 + $1,700) ÷ $10,000 = 1.17\nThis means local charges add 17% to the goods cost.\n\n**Landed Line (BBD)** = Line FOB (BBD) × Multiplier\nExample: $2,000 line × 1.17 = $2,340 BBD\n\n**Landed Unit Cost (BBD)** = Landed Line (BBD) ÷ Quantity\nExample: $2,340 ÷ 100 units = $23.40 per unit\n\n**Landed Unit Cost (USD)** = Landed Unit Cost (BBD) ÷ Exchange Rate\nExample: $23.40 ÷ 2.00 = $11.70 USD\n\n**Markup % (optional):**\nMarkup on line items is cost-plus, NOT margin:\nMarkup % = (Sell Price − Cost) ÷ Cost × 100\nExample: 50% markup on $10 cost → $15 sell price.",
      },
      {
        id: "ic-exports",
        title: "Exports & Reporting",
        content:
          "**Shipment Exports (per shipment):**\nEach shipment has an Exports tab with three CSV downloads:\n• Shipment Summary — Header fields, FOB, exchange rate, charges, multiplier, status.\n• Charges — All charge rows with type, amount, VAT, duty, and totals.\n• Line Items — Product details, qty, unit FOB, line FOB, landed costs, markup/sell values.\n\n**Reports Page:**\nThe Import Costings Reports page provides:\n• KPI cards — Total shipments, total FOB, average multiplier, total landed cost.\n• Charts — Shipment values over time, charge breakdown by type.\n• Summary tables — Aggregated data across all shipments.\n\n**Handing Off to Finance:**\nExport the Line Items CSV — the 'Landed Unit Cost (BBD)' column is the key value for updating sell prices. Export the Charges CSV for reconciling import expenses.",
      },
    ],
  },
  {
    id: "quotations",
    icon: FileSpreadsheet,
    title: "Quotations",
    articles: [
      {
        id: "qt-overview",
        title: "Quotations Overview",
        content:
          "The Quotations module (/admin/quotations) lets you build, save, and export customer quotes. Quotes pull products directly from the Product Catalog and snapshot pricing at creation time.\n\n**Quote Types:**\n• **Stock Quote** — For wholesale stock items. GP% threshold: 28%.\n• **Rx Quote** — For prescription lens orders including add-ons and supplies. GP% threshold: 48%.\n\n**Lifecycle:** Draft → Sent → Accepted / Rejected / Expired / Void.\n\n**Key Features:**\n• Real-time profitability tracking with GP% and profit status per line.\n• Automatic governance alerts for below-cost or below-threshold pricing.\n• Rx Details for prescription entry (OD/OS SPH, CYL, Axis, Add, PD).\n• PDF export with company branding.\n• Rounding tools for clean totals.",
      },
      {
        id: "qt-creating",
        title: "Creating a Quote",
        content:
          "**Step-by-step:**\n1. Navigate to Quotations in the sidebar.\n2. Click 'New Quote'.\n3. Choose Stock Quote or Rx Quote — type cannot be changed after creation.\n4. An auto-generated quote number is assigned (e.g., Q-000001).\n5. Fill in the header:\n   • Customer name and contact details.\n   • Currency (default BBD).\n   • Validity date and lead time (days).\n6. Add Customer Notes (visible on exported quote) and Internal Notes (team only).\n7. Add line items (see next article).\n8. Review profitability in the right sidebar.\n9. Export or change status as needed.\n\n**Quote Number Format:** Auto-incrementing, prefixed with 'Q-'. Cannot be manually changed.",
      },
      {
        id: "qt-adding-lines",
        title: "Adding Line Items",
        content:
          "Click 'Add Line' to open the product picker.\n\n**Stock Quotes:** Show all active supplies.\n\n**Rx Quotes:** Three tabs:\n• **Lenses** — Active lenses from catalog. After adding, click the eye icon to enter Rx Details.\n• **Add-Ons** — Coatings, tints, treatments.\n• **Supplies** — Cases, cloths, accessories.\n\n**Each line snapshots:**\n• Unit Cost (Landed) — From catalog, cannot be changed.\n• Unit Base Price — Default sell price from catalog.\n• Unit Sell Price — Editable, defaults to base price.\n• Quantity — Defaults to 1, editable inline.\n\n**Calculated Per Line:**\n• Line Sell Total = Qty × Unit Sell Price\n• Line Cost Total = Qty × Unit Cost (Landed)\n• GP $ = Line Sell Total − Line Cost Total\n• GP % = (GP $ ÷ Line Sell Total) × 100",
      },
      {
        id: "qt-pricing-profitability",
        title: "Pricing & Profitability",
        content:
          "**Core Rule:** Profitability is always calculated against Landed Cost (BBD).\n\n**Profit Status per line (visual badges):**\n• 🟢 Profitable — Selling above landed cost.\n• 🟡 AtCost — Selling at exactly landed cost.\n• 🔴 BelowCost — Selling below landed cost.\n• ⚪ NoCost — No landed cost available.\n\n**Threshold Status (compares GP% to quote-type threshold):**\n• 🟢 AboveThreshold — GP% ≥ threshold (28% Stock / 48% Rx).\n• 🟡 BelowThreshold — GP% < threshold but still profitable.\n\n**Right Sidebar Summary:**\n• Subtotal, Grand Total, Total GP $ and GP %.\n• Risk flag counters: below-cost lines, below-threshold lines, edited lines, no-cost lines.\n\n**Example:**\n• Lens cost: $50 BBD. Sell price: $120 BBD.\n• GP $ = $70. GP % = ($70 ÷ $120) × 100 = 58.3%.\n• Rx threshold is 48% → Status: AboveThreshold (green).",
      },
      {
        id: "qt-price-overrides",
        title: "Price Overrides & Concessions",
        content:
          "When you edit the Unit Sell price, the line shows an 'Edited' amber badge.\n\nIf the price falls below landed cost, you must provide an override reason:\n• Match competitor\n• Strategic account/relationship\n• Clearance/aging stock\n• Pricing error correction\n• Bundle/package deal\n• Warranty/remake/service recovery\n• Other (requires written note)\n\n**Rules:**\n• Draft quotes can be saved with below-cost lines, but override reasons are required before marking as Sent.\n• The right sidebar risk panel shows counts of all flagged lines.\n\n**Rounding Tools:**\nRound the grand total up to nearest 1, 5, or 10 BBD. The system adds a 'Rounding Adjustment' fee line for the difference, keeping the quote auditable.",
      },
      {
        id: "qt-rx-details",
        title: "Rx Details (Prescription Entry)",
        content:
          "For Rx Quotes, each lens line has an Rx Details button (eye icon) that opens a prescription form.\n\n**Available Fields:**\n• **OD** (Right Eye): SPH, CYL, Axis, Add, BC, Prism (value + direction), PD, OC, Fitting Height\n• **OS** (Left Eye): Same fields as OD.\n• **PD** — Pupillary Distance.\n• **Seg Height** and **Fitting Height**.\n• **Rx Notes** — Free text for special instructions.\n\n**Advanced Fields (expandable):**\n• ERCD, Face Form Angle, Panto, Vertex (fitted/refracted), Inset, Eye Level, Object Distance, Slab Off, Special Thickness, FPD, NPD.\n\n**Validation:** If CYL is entered without Axis, a warning appears (but saving is not blocked).\n\nRx details are stored separately and linked to the lens line item. They appear on the exported PDF when the internal toggle is used.",
      },
      {
        id: "qt-exporting",
        title: "Exporting Quotes",
        content:
          "The quote editor provides three export options:\n\n• **Download PDF** — Branded PDF with company logo, quote details, line items, and totals.\n• **Print** — Opens browser print dialog.\n• **Copy Summary** — Plain-text summary to clipboard.\n\n**Customer-Facing Export includes:**\nQuote number, date, customer name, validity, lead time, line items (description, qty, unit sell, line total), subtotal, grand total, and customer notes.\n\n**Internal Export (toggle) additionally shows:**\nLanded costs, margins, GP%, override reasons, and internal notes.\n\n**Workflow — Sending a Quote:**\n1. Complete all line items and verify profitability.\n2. Add customer notes (visible on PDF).\n3. Click 'Download PDF' for the customer-facing version.\n4. Email the PDF to the customer.\n5. Change the quote status to 'Sent'.\n6. When the customer responds, update status to Accepted, Rejected, or Void.",
      },
    ],
  },
  {
    id: "users-audit",
    icon: Users,
    title: "Users & Audit",
    articles: [
      {
        id: "managing-admin-users",
        title: "Managing Admin Users",
        content:
          "The Users page (/admin/users) is Admin-only and manages all system users.\n\n**Features:**\n• View all users with email, role, and status.\n• Search and filter by role.\n• Invite new users by email.\n• Assign or change roles (Admin, Operator, Viewer, Customer).\n• Reset user passwords.\n• Delete users (Admin only).\n\n**Customer Users:**\nCustomer-role users are tied to a customer account. After assigning the Customer role, you can:\n• Allocate specific pricelists (WSPL, PL, or WEB) via the Customer Pricing Access panel.\n• Customers can only view and export their allocated pricelists.\n\n**Permission Grid:**\nExpand the 'Permissions' section to see the global RBAC matrix. Each feature (Catalog, Reference, Imports, etc.) has View and Edit checkboxes per role. Changes apply immediately to all users with that role.\n\n**Example Workflow — Setting Up a Customer User:**\n1. Click 'Invite User' and enter the customer's email.\n2. Select 'Customer' role.\n3. After the user is created, expand their row.\n4. In the Customer Pricing Access panel, allocate the relevant pricelists.\n5. The customer can now log in and see only their assigned pricelists.",
      },
      {
        id: "viewing-audit-logs",
        title: "Viewing Audit Logs",
        content:
          "The Audit Log is accessed via Settings (/admin/parameters) under the Audit Log tab.\n\n**What's Logged:**\n• Every create, update, and delete action in the admin tool.\n• User who made the change.\n• Timestamp.\n• Table and record affected.\n• Summary of old vs. new values.\n\n**Search & Filter:**\n• Search by user email, table name, or action type.\n• Filter by date range.\n• Sort by timestamp (newest first by default).\n\n**Use Cases:**\n• Track who changed a sell price and when.\n• Investigate unexpected data changes.\n• Review import batch activity.\n• Verify concession overrides were properly justified.\n\n**Retention:** Audit logs are retained indefinitely and cannot be deleted.",
      },
      {
        id: "company-settings",
        title: "Company Settings & Parameters",
        content:
          "The Settings page (/admin/parameters) has multiple tabs:\n\n**Company Info Tab:**\n• Company Name, Slogan, Logo.\n• Contact details (email, phone, fax).\n• Physical, Billing, and Shipping addresses.\n• Tax TIN, Base Currency, Default VAT, Business Calendar.\n\n**Pricing Parameters Tab:**\n• Exchange rates (FX Rates) for currency conversion.\n• Duty rates by product category.\n• Freight method and costs.\n• Target margin %, Floor margin %, Category-specific margins.\n• Governance toggles: Block Below Floor, Block Loss, Require Concession Reason.\n• Overhead %, Labour %, Insurance %, Brokerage Fee.\n• Rounding rules and psychological rounding.\n• Price change thresholds.\n\n**PDF Settings:**\n• Custom header/footer HTML for exported quotes and pricelists.\n\n**Audit Log Tab:**\n• Full audit trail of all system changes (see previous article).\n\n**Example Workflow — Updating Exchange Rate:**\n1. Navigate to Settings > Pricing Parameters.\n2. Find the FX Rates section.\n3. Update the USD → BBD rate.\n4. Click Save — all pricing calculations across the system will use the new rate.",
      },
    ],
  },
];
