import { BookOpen, Glasses, Package, Upload, Database, DollarSign, Users, Ship, FileSpreadsheet, Settings, LayoutGrid, BookMarked, Globe } from "lucide-react";

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
        title: "Platform Overview",
        content:
          "OpticAdmin is the internal pricing, catalog, and quotation management tool for OptiLens — an optical wholesale business specialising in Rx semi-finished and finished lenses, lab and optical supplies, and eyewear accessories.\n\n**Core Modules:**\n• **Product Catalog** — Manage lenses, add-ons, and supplies with full pricing controls and flag toggles.\n• **Pricing Engine** — Treatment matrices, pricelist versions, and markup/discount hierarchies for RX, Stock, and Supplies pricing.\n• **Catalog Publisher** — Build and publish branded multi-section PDF catalogs combining pricelists and content articles.\n• **Quotations** — Build, price, and export customer quotes with real-time profitability tracking.\n• **Import Costings** — Track landed costs of imported goods with proportional charge allocation.\n• **Contacts & CRM** — Manage business contacts, companies, and customer relationships.\n• **Content Management** — Manage wiki articles, knowledge base, FAQs, and legal pages.\n\nThe platform also powers a public-facing online store and technical knowledge base for customers.",
      },
      {
        id: "navigation",
        title: "Navigation & App Launcher",
        content:
          "The admin interface uses a two-tier navigation system:\n\n**App Launcher** (grid icon in top bar)\nThe App Launcher is the central hub for all modules. It opens automatically on your first visit to the admin area each session. Access it anytime by clicking the grid icon (⊞) in the top bar.\n\nAvailable apps: OptiLens (Catalog Publisher), Contacts, CRM, Helpdesk, Web Orders, RX Orders, Website, Quotations, Costings, Content, Users, and Settings.\n\n**Sidebar** (left panel)\nThe sidebar provides quick access to core daily-use pages:\n• **Catalog Publisher** — Build and manage published catalogs.\n• **Product Catalog** (expandable) — Lenses, Add-Ons, Supplies, plus Reference Data, Imports, and Exports.\n• **RX Lens Prices** — Treatment matrices and Rx pricelist management.\n• **Stock Lens Prices** — Semi-finished wholesale stock lens pricing (WSPL).\n• **Supplies Prices** — Supplies catalog pricelists.\n\n**Footer Links:**\n• Help / Wiki — This documentation (you are here).\n• Back to Site — Return to the public storefront.\n\nYou can collapse/expand the sidebar using the panel toggle at the top. The sidebar auto-collapses when editing a catalog or quotation to maximise workspace.\n\n**Top Bar:**\n• Global search (supports wildcard %).\n• User email and role badge.\n• Help (?) icon — opens the contextual help panel showing articles relevant to the current page.\n• Sign out button.",
      },
      {
        id: "user-roles",
        title: "User Roles & Permissions",
        content:
          "The system uses four roles with tiered access:\n\n**Admin** — Full control of everything: users/roles, customers, pricelist definitions, reference data, products/lenses, active/inactive toggles, imports/exports, pricelist generation, customer pricelist allocation, company settings, and audit log. Can see Cost columns. Can edit all rows and perform deletions.\n\n**Operator** — Day-to-day operations: can set items/lenses active/inactive, generate pricelists, run imports/exports, maintain catalog updates. Cannot change RBAC rules, cannot allocate customer access unless Admin allows. Cost visibility is configurable by Admin (default: visible).\n\n**Viewer** — Read-only internal access: can search/filter/sort the Product Catalog, Lens Prices, and Help/Wiki. Can view and export ALL pricelists (PDF/CSV/Excel). Cannot edit any rows, cannot deactivate items/lenses. Cost column is NEVER visible.\n\n**Customer** — External read-only: can search/filter/sort and export ONLY pricelists allocated to their customer account by Admin. Cannot edit, cannot deactivate. Cost column is NEVER visible.\n\n**Visibility Rules:**\n• Viewer can access/export ALL pricelists.\n• Customer can access/export ONLY assigned pricelists.\n• Viewer and Customer: Cost is hidden everywhere and not retrievable from endpoints.\n\n**Permission Grid:**\nPermissions are managed via a checkbox grid on the Users page. Each feature has View and Edit toggles per role. Changes apply immediately to all users with that role.",
      },
    ],
  },
  {
    id: "catalog-publisher",
    icon: BookMarked,
    title: "Catalog Publisher",
    articles: [
      {
        id: "cp-overview",
        title: "Catalog Publisher Overview",
        content:
          "The Catalog Publisher (/admin/catalog-publisher) is the default landing page of the admin tool. It lets you build branded, multi-section PDF catalogs that combine pricelist data, content articles, and custom cover pages.\n\n**Key Concepts:**\n• **Catalog Templates** — Named catalog configurations that define structure, sections, and branding.\n• **Sections** — Individual blocks within a catalog: pricelists, content articles, or custom pages.\n• **Cover Page** — Customisable title, subtitle, and gradient colours.\n• **Customer Assignment** — Assign catalogs to specific customers for distribution.\n\n**List Page Features:**\n• Search and filter catalogs.\n• Duplicate, assign to customers, delete, or export as PDF.\n• Click any row to open the full-screen editor.\n\n**Editor Features:**\n• Drag-and-drop section ordering.\n• Add pricelist versions, content articles, or custom sections.\n• Live preview pane showing the final PDF layout.\n• Cover page branding with gradient colour picker.\n• Save & Exit or Publish actions in the top bar.",
      },
      {
        id: "cp-building",
        title: "Building a Catalog",
        content:
          "**Step-by-step:**\n1. Navigate to Catalog Publisher from the sidebar or App Launcher.\n2. Click 'New Catalog' and enter a name.\n3. Click the new row to open the full-screen editor.\n4. Configure the cover page — set title, subtitle, and gradient colours.\n5. Add sections using the palette:\n   • **Pricelist** — Select from available pricelist versions (RX, Stock, Supplies).\n   • **Article** — Pull in content articles from the CMS (e.g., lens guides, FAQ).\n   • **Custom** — Add free-form titled sections.\n6. Drag sections to reorder.\n7. Toggle sections on/off with the include checkbox.\n8. Use the live preview to verify the final layout.\n9. Click 'Save & Exit' to return to the list, or 'Publish' to finalise.\n\n**Assigning to Customers:**\nFrom the list page, use the Assign action to link a catalog to one or more customers. Assigned customers can then access their catalog through their account.",
      },
    ],
  },
  {
    id: "product-catalog",
    icon: Glasses,
    title: "Product Catalog",
    articles: [
      {
        id: "catalog-overview",
        title: "Product Catalog Overview",
        content:
          "The Product Catalog (/admin/catalog) is the central hub for managing all products. It has three tabs:\n\n**Lenses Tab** — All lens products with supplier, brand, material, lens type, finish type, MF type, index value, SPH/CYL/ADD ranges, base price, sell price, and flag toggles.\n\n**Add-Ons Tab** — Coatings, tints, and extras that attach to lens orders. Each has name, SKU, category, supplier, cost, price, and flags.\n\n**Supplies Tab** — Non-lens items (cases, cloths, tools) with name, SKU, category, supplier, brand, base price, sell price, currency, unit, and quantity per unit.\n\n**Global Search:** The search bar supports wildcard matching with the % symbol (e.g., 'CR%SV' matches 'CR-39 SV'). Without wildcards, it defaults to case-insensitive substring matching.\n\n**Export:** Click the Export button to download the current filtered view as an Excel file.",
      },
      {
        id: "adding-editing-lenses",
        title: "Adding & Editing Lenses",
        content:
          "Open the Lenses tab and click 'Add Lens' or click any row to edit. The form has two sections:\n\n**Item Info (left column):**\n• Name — Descriptive lens name.\n• Supplier, Brand, Material, Lens Type, Finish Type, MF Type — Select from active reference data.\n• Index Value — Refractive index (1.50, 1.53, 1.59, 1.60, 1.67, 1.74).\n• SPH Range — Min/Max sphere power.\n• CYL Range — Min/Max cylinder power.\n• ADD Range — Min/Max addition power (for progressives/bifocals).\n\n**Flags & Pricing (right column):**\n• **PL** (Price List) — Include on standard Rx pricelist.\n• **Full Lab** — Requires full laboratory surfacing (adds duty, freight, labour to pricing).\n• **WSPL** (Wholesale) — Show on wholesale stock pricelist as a semi-finished stock lens.\n• **Web** — Display on public website Rx order form.\n• Notes — Free-text notes.\n• Base Price — Cost from supplier.\n• Sell Price — Your selling price.\n• Calculated Values — FX Cost, CIF Cost, Landed Cost, Full Cost, Strategic Price (read-only).\n\n**Important:** If a lens has Web enabled, it can be sold through the Rx order form. If WSPL is enabled, it shows as a semi-finished stock lens for wholesale purchase.",
      },
      {
        id: "understanding-flags",
        title: "Understanding Product Flags",
        content:
          "Flags control where and how products appear across the system:\n\n**Lens Flags:**\n• **PL (Price List)** — Lens appears in the RX Lens Prices pricelist catalog for sharing with opticians.\n• **Full Lab** — Pricing engine adds duty, freight/CIF charges, and labour percentages to cost calculation.\n• **WSPL (Wholesale Stock Pricelist)** — Lens appears as a semi-finished stock lens in Stock Lens Prices.\n• **Web** — Lens can be sold through the Rx order form on the public website.\n\n**Supply Flags:**\n• Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid — Operational flags.\n• Show in Price List, Stk WSPL — Controls pricelist inclusion.\n• Show on Website — Controls public store visibility.\n\n**Add-On Flags:**\n• Active — Whether the add-on is available for selection.\n• Auto — Automatically applied based on rules (e.g., auto-apply AR coating to progressives).\n• Show on Website — Display on public Rx order form.\n\n**Critical Rule:** Add-ons are only available on pricelists and on the RX order form. They do not have standalone product pages.",
      },
      {
        id: "calculated-pricing",
        title: "Calculated Pricing Values",
        content:
          "When a lens is saved, the pricing engine computes several values using parameters from Settings:\n\n**Calculation Chain:**\n1. **FX Cost** = Base Price × Exchange Rate\n   Example: $50 USD × 2.00 = $100 BBD\n\n2. **CIF Cost** = FX Cost + Freight + Insurance\n   Example: $100 + $5 + $2 = $107 BBD\n\n3. **Landed Cost** = CIF Cost + Import Duty\n   Example: $107 + $10.70 (10% duty) = $117.70 BBD\n\n4. **Full Cost** = Landed Cost + Labour % + Overhead %\n   Example: $117.70 × (1 + 0.15 + 0.08) = $144.77 BBD\n\n5. **Strategic Price** = Full Cost ÷ (1 − Target Margin)\n   Example: $144.77 ÷ (1 − 0.40) = $241.28 BBD\n\nThese values appear as read-only fields in the lens form. The Strategic Price serves as the recommended selling price. If Full Lab is OFF, duty/freight/labour steps are skipped.\n\n**Floor Price** = Full Cost ÷ (1 − Floor Margin %). Selling below this triggers governance alerts.",
      },
      {
        id: "governance-rules",
        title: "Governance & Margin Safety",
        content:
          "Governance rules protect against selling below cost or below minimum margin thresholds.\n\n**How It Works:**\n• If the sell price falls below the calculated floor price, a governance alert banner appears.\n• The alert shows the current margin vs. the floor margin and the minimum acceptable price.\n\n**Settings (configured in Settings > Pricing Parameters):**\n• **Require Concession Reason** — User must select or type a reason before saving a below-floor price.\n• **Block Below Floor** — Saving is prevented entirely if the price is below floor.\n• **Block Loss** — Selling below landed cost (at a loss) is blocked.\n\n**Concession Reasons:** Match competitor, Strategic account, Clearance stock, Pricing error, Bundle deal, Warranty/remake, Other.\n\n**Margin Status Badges:**\n• 🟢 Green — Healthy margin (above target).\n• 🟡 Amber — Thin margin (above floor, below target, 0–15%).\n• 🔴 Red — Below floor or loss-making.\n• Row shading: Pink = zero cost, Red = selling at a loss, Amber = thin margin.",
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
          "Supplies are non-lens items managed on the Supplies tab of the Product Catalog.\n\n**Fields:**\n• Name, SKU, Category (Cases, Cloths, Tools, etc.).\n• Supplier, Brand.\n• Base Price (cost from supplier), Sell Price.\n• Currency, Unit of Measure, Qty per Unit.\n• Bin, Detail, Notes.\n\n**Flag Toggles:** Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid, Show in Price List, Stk WSPL, Show on Website.\n\n**Row Shading (pricing health):**\n• Pink — Zero cost (no base price entered).\n• Red — Selling at a loss (sell price < base price).\n• Amber — Thin margin (0–15%).",
      },
      {
        id: "managing-addons",
        title: "Managing Add-Ons",
        content:
          "Add-ons are extras attached to lens orders (coatings, tints, UV protection, etc.), managed on the Add-Ons tab.\n\n**Fields:**\n• Name, SKU, Category (Coating, Tint, Treatment, etc.).\n• Supplier.\n• Cost (what you pay), Price (what you charge).\n• Sort Order (controls display position on pricelists).\n\n**Flags:**\n• Active — Whether the add-on is available for selection.\n• Auto — Automatically applied based on rules. Configure auto-application rules (e.g., always add AR coating to progressive lenses).\n• Show on Website — Display on the public Rx order form.\n\n**Pricelist Integration:**\nAdd-ons can have price overrides per pricing sheet. Go to the add-on's pricing sheets panel to set custom prices for specific pricelists.\n\n**Important:** Add-ons appear only on pricelists and the RX order form. They do not have standalone product pages.",
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
          "The Pricing Engine drives all pricing across three sidebar modules:\n\n• **RX Lens Prices** (/admin/rx-lens-prices) — Prescription lens pricelists with treatment matrices.\n• **Stock Lens Prices** (/admin/stock-lens-prices) — Semi-finished stock lenses for wholesale (WSPL).\n• **Supplies Prices** (/admin/supplies-prices) — Supplies catalog pricelist.\n\nAll three use the same underlying architecture:\n• **Pricelist Versions** — Multiple named versions with master markup/discount settings.\n• **List Catalog** — Organised rows grouped by section (lens type, treatment, category).\n• **Live Preview** — Real-time preview of the final formatted pricelist.\n• **Export** — PDF, CSV, and Excel export options.\n\n**Pricelist Types:**\n• **WSPL** = Wholesale Stock Pricelist.\n• **PL** = Wholesale Rx Pricelist for Sharing.\n• **WEB/Public** = Retail website/public prices/Rx Order.\n\n**Critical Website Pricing Rule:**\nWEB/Public prices are exclusively linked to the Price Catalog (the website reads pricing directly from the Price Catalog). A Pricelist does NOT change website product pricing unless explicitly configured. A setting/flag controls this: 'Use Pricelist as Website Pricing Source (yes/no)'. Default = NO.",
      },
      {
        id: "rx-lens-prices",
        title: "RX Lens Prices — Treatment Matrices",
        content:
          "The RX Lens Prices page has two main tabs:\n\n**Matrix Tab:**\nThe treatment matrix is a grid showing prices by Treatment Type (rows) × Material Index (columns: 1.50, 1.53, 1.59, 1.60, 1.67, 1.74). Each cell contains the price for that treatment+index combination.\n\n• Prices flow from the base Price Matrix table.\n• Empty columns (where no lenses exist for that index) can be auto-collapsed.\n• Cells can be individually overridden with a reason.\n\n**List Catalog Tab:**\nAll items included in the pricelist as a flat, ordered list grouped by section. Items include lenses (from catalog with PL flag), add-ons, and manual entries.\n\n• Reorder items with drag or sort-order fields.\n• Add/remove items from the pricelist.\n• Override individual line prices.\n\n**BBD/USD Toggle:** All prices can be viewed in BBD or USD (using the configured exchange rate).\n\n**Workflow — Building an Rx Pricelist:**\n1. Navigate to RX Lens Prices (sidebar).\n2. Select or create a pricelist version.\n3. Go to the Matrix tab — review treatment prices across material indices.\n4. Override any cells as needed (provide a reason).\n5. Switch to the List Catalog tab — verify all items and sections.\n6. Click Preview to see the formatted pricelist.\n7. Export as PDF for distribution.",
      },
      {
        id: "stock-lens-prices",
        title: "Stock Lens Prices (WSPL)",
        content:
          "The Stock Lens Prices page (/admin/stock-lens-prices) manages pricing for semi-finished stock lenses sold wholesale.\n\n**Key Differences from RX:**\n• No treatment matrix — stock lenses use a list catalog only.\n• Items are auto-grouped by MF Type (Manufacturing Type).\n• Only lenses with the WSPL flag enabled in the Product Catalog appear here.\n\n**WSPL-Specific Margin Rules:**\nStock lenses use a **separate margin floor and target margin** from the standard RX lenses category. These are configured in **Settings → Pricing Parameters** under the JSONB fields:\n\n• **Category Margin Floors → `wspl`** — The minimum acceptable margin for wholesale stock lenses (default: 25%, compared to 30% for RX lenses).\n• **Category Target Margins → `wspl`** — The target margin for WSPL pricing (default: 40%, compared to 50% for RX lenses).\n\n**How It Works:**\n1. When viewing the Stock Lens Prices page, all margin badges and governance warnings use the `wspl` floor instead of the generic `lenses` floor.\n2. The Line Override Dialog also enforces the `wspl` floor — if an override pushes the margin below this threshold, a warning appears and a reason is required.\n3. These values are fully configurable per pricing settings version. Adjusting the `wspl` floor or target in Settings immediately affects all margin calculations on this page.\n\n**Why a Lower Floor?**\nWSPL lenses are semi-finished stock items sold at wholesale volume. The lower margin floor reflects the higher volume / lower margin wholesale business model, while RX lenses carry higher margins due to custom lab work and smaller order quantities.\n\n**Features:**\n• Pricelist version selection with markup/discount settings.\n• BBD/USD toggle.\n• Live Preview for final pricelist layout.\n• Export to PDF and Excel.",
      },
      {
        id: "supplies-prices-page",
        title: "Supplies Prices Page",
        content:
          "The Supplies Prices page (/admin/supplies-prices) manages the supplies pricelist.\n\n**Features:**\n• **Pricelist Versions** — Create and manage multiple versions with different markup/discount settings.\n• **List Catalog** — View all supplies grouped by category with BBD and optional USD pricing columns.\n• **Live Preview** — See exactly how the pricelist will look when exported or shared.\n• **Export** — Download as PDF or Excel.\n\n**BBD/USD Toggle:** Switch between local currency and USD display using the toggle in the header.",
      },
      {
        id: "markup-hierarchy",
        title: "Markup & Discount Hierarchy",
        content:
          "Pricelist versions support a multi-level markup/discount hierarchy:\n\n**Master Level:**\n• Master Markup % — Applied to all prices in the version.\n• Master Discount % — Applied after markup.\n• Formula: Final Price = Base Price × (1 + Markup%) × (1 − Discount%)\n\n**Section Level (Child Sections):**\nEach section (e.g., 'Coatings', 'Tints') can have its own markup and discount that override or layer on top of the master settings.\n\n**Line Level (Overrides):**\nIndividual line items can have price overrides that bypass all hierarchy calculations.\n\n**Priority:** Line Override > Section Markup/Discount > Master Markup/Discount > Base Price.\n\n**Example:**\n• Base Price: $100.00\n• Master Markup: 20% → $120.00\n• Master Discount: 10% → $108.00\n• If section has Markup 15% / Discount 5% → $109.25\n• If line override = $95.00 → final is $95.00 regardless.",
      },
      {
        id: "pricelist-versions",
        title: "Pricelist Versions",
        content:
          "Pricelist versions let you maintain multiple pricing configurations simultaneously.\n\n**Fields:**\n• Name — Descriptive version name (e.g., 'Q1 2026 Standard', 'Wholesale Tier 2').\n• Format Type — Matrix or List.\n• Base Currency — BBD or USD.\n• Master Markup % / Master Discount %.\n• Template Flag — Mark as a template for duplicating.\n\n**Version Management:**\n• Create new versions from scratch or duplicate existing ones.\n• When duplicating, all matrix allocations, catalog rows, and section settings are cloned.\n• Only one version is active for export at a time (selected in the version dropdown).\n• Previous versions are preserved for historical reference.",
      },
    ],
  },
  {
    id: "reference-imports",
    icon: Database,
    title: "Reference Data & Imports",
    articles: [
      {
        id: "managing-ref-tables",
        title: "Reference Data Tables",
        content:
          "Reference Data (/admin/reference) manages the lookup tables used throughout the system. Each table has:\n\n• **Name** — Display name.\n• **Code** — Short code for data exchange.\n• **Abbreviation** — Compact label for tables and reports.\n• **Active/Inactive** — Controls whether the entry appears in dropdown selections.\n\n**Available Tables:**\n• Suppliers — Companies that supply products.\n• Brands — Product brand names.\n• Materials — Lens materials (CR-39, Polycarbonate, Hi-Index, etc.).\n• Lens Types — Single Vision, Progressive, Bifocal, Trifocal, etc.\n• Finish Types — Surface finish classifications.\n• MF Types — Manufacturing type classifications.\n• Lens Options — Additional lens options/treatments.\n\n**Wildcard Search:** Use % for pattern matching (e.g., 'Poly%' finds 'Polycarbonate').\n\n**Deactivation vs Deletion:**\n• Deactivate to hide from dropdowns while preserving existing references.\n• Items in use by lenses/supplies cannot be deleted — only deactivated.\n• Deactivated entries still appear in data tables (greyed out) for reactivation.",
      },
      {
        id: "importing-csv",
        title: "Importing from CSV",
        content:
          "The Imports page (/admin/imports) supports bulk data upload via CSV files with four tabs: Lenses, Supplies, Add-Ons, and Frames.\n\n**Step-by-step:**\n1. Select the appropriate tab.\n2. Upload CSV or drag-and-drop.\n3. Preview parsed rows and auto-matched column mappings.\n4. Resolve any reference mapping issues.\n5. Click 'Import' to process.\n6. Review the summary showing success/error counts.\n\n**Reference Mapping:**\nWhen CSV values don't exactly match reference data (e.g., CSV says 'Essilor' but data has 'Essilor International'), you map them once. Mappings are saved and remembered for future imports.\n\n**Duplicate Handling:**\n• Overwrite — Replace existing record with new data.\n• Skip — Keep existing record unchanged.\n\n**Error Handling:**\nRows with validation errors are flagged in red. Common errors: missing required fields, invalid number formats, unresolved references. Fix errors inline before confirming.",
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
          "Import Costings (accessed via the App Launcher → Costings) tracks the landed cost of goods imported into the business. It records each shipment's foreign-currency purchase price, local charges, and allocates costs across line items to arrive at a per-unit landed cost in BBD and USD.\n\n**What it IS:**\n• A cost-tracking and allocation tool.\n• Produces accurate landed costs for pricing decisions and financial reporting.\n• Supports both Lens and Non-Lens shipments.\n\n**What it is NOT:**\n• Not an accounting module — does not post journal entries.\n• Not a payment system — does not track supplier payments.\n• Not a purchase order system — PO references are informational only.",
      },
      {
        id: "ic-status-workflow",
        title: "Status Workflow",
        content:
          "Every shipment follows a three-stage lifecycle:\n\n**Draft** → **Reviewed** → **Locked**\n\n**Draft:** Fully editable. All header fields, charges, and line items can be added, changed, or removed.\n\n**Reviewed:** Still editable but signals data has been checked. Admin can move back to Draft.\n\n**Locked:** No edits allowed. Freezes all values. Only Admins can lock. To make changes, create a Revision.\n\n**Role Permissions:**\n• Admin — Can change status in any direction, lock, and create revisions.\n• Operator — Can create/edit Draft and Reviewed. Cannot lock.\n• Viewer — Read-only access.\n\n**Revisions:**\nWhen a locked shipment needs correction, click 'Create Revision' (Admin only). A new Draft is created with cloned data and incremented version number. The original remains preserved.",
      },
      {
        id: "ic-create-shipment",
        title: "Creating a Shipment",
        content:
          "**Step-by-step:**\n1. Navigate to Costings (App Launcher) and click '+ New Shipment'.\n2. Fill in header fields:\n   • Type — Lens or Non-Lens.\n   • Supplier — Select from active suppliers.\n   • Commodity — Description of goods.\n   • Date Received, Invoice Number, Invoice Date.\n   • Currency — Foreign currency (default: USD).\n   • Exchange Rate (XR) — BBD per 1 unit of foreign currency.\n   • FOB (Foreign) — Free On Board value in foreign currency.\n   • Invoice Total (Foreign) — Full invoice amount.\n3. Optional: PO Reference, Date Ordered.\n4. Click 'Create' — Charges and Line Items tabs become available.\n\n**FOB vs Invoice Total:**\nFOB is the goods value used for cost allocation. Invoice Total is the supplier's billed amount (may include supplier-side freight). They can differ.",
      },
      {
        id: "ic-charges-lines",
        title: "Charges & Line Items",
        content:
          "**Charges (local costs in BBD):**\nCharge types: Shipping, Landing, Duties & VAT, Brokerage, Local Freight, Courier, Bank Expenses, Miscellaneous, Storage.\n\n• Click '+ Add Charge', select type, enter Amount (BBD).\n• For 'Duties & VAT': additional Duty (BBD) and VAT Reclaimable toggle.\n• Do NOT enter supplier payment as a charge — that's captured in FOB/Invoice Total.\n• All amounts must be in BBD.\n\n**Line Items (products within a shipment):**\n• For Lens shipments: all items link to Lens catalog records.\n• For Non-Lens: Supply, Add-On, or Free Item types.\n• Fields: Product (searchable), Quantity, Unit FOB (foreign), Line FOB (auto-calculated).\n• Computed columns (Landed Unit Cost BBD/USD) update automatically once charges are entered.",
      },
      {
        id: "ic-calculations",
        title: "Understanding the Calculations",
        content:
          "Import Costings uses proportional allocation to distribute charges across line items based on FOB value.\n\n**Key Formulas:**\n\n**FOB (BBD)** = FOB (Foreign) × Exchange Rate\nExample: $5,000 USD × 2.00 = $10,000 BBD\n\n**Total Charges (BBD)** = Sum of all charge row totals\nExample: Shipping $500 + Duties $1,000 + Brokerage $200 = $1,700 BBD\n\n**Multiplier** = (FOB BBD + Total Charges BBD) ÷ FOB BBD\nExample: ($10,000 + $1,700) ÷ $10,000 = 1.17\n\n**Landed Line (BBD)** = Line FOB (BBD) × Multiplier\n**Landed Unit Cost (BBD)** = Landed Line (BBD) ÷ Quantity\n**Landed Unit Cost (USD)** = Landed Unit Cost (BBD) ÷ Exchange Rate\n\n**Markup % (optional):**\nMarkup on line items is cost-plus, NOT margin:\nMarkup % = (Sell Price − Cost) ÷ Cost × 100",
      },
      {
        id: "ic-exports",
        title: "Exports & Reporting",
        content:
          "**Per-Shipment Exports (CSV):**\n• Shipment Summary — Header fields, FOB, exchange rate, charges, multiplier, status.\n• Charges — All charge rows with type, amount, VAT, duty, and totals.\n• Line Items — Product details, qty, unit FOB, line FOB, landed costs, markup/sell values.\n\n**Reports Page:**\n• KPI cards — Total shipments, total FOB, average multiplier, total landed cost.\n• Charts — Shipment values over time, charge breakdown by type.\n• Summary tables — Aggregated data across all shipments.\n\n**Handing Off to Finance:**\nExport the Line Items CSV — the 'Landed Unit Cost (BBD)' column is the key value for updating sell prices.",
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
          "The Quotations module (accessed via App Launcher → Quotations) lets you build, save, and export customer quotes. Quotes pull products directly from the Product Catalog and snapshot pricing at creation time.\n\n**Quote Types:**\n• **Stock Quote** — For wholesale stock items. GP% threshold: 28%.\n• **Rx Quote** — For prescription lens orders including add-ons and supplies. GP% threshold: 48%.\n\n**Lifecycle:** Draft → Sent → Accepted / Rejected / Expired / Void.\n\n**Key Features:**\n• Real-time profitability tracking with GP% and profit status per line.\n• Automatic governance alerts for below-cost or below-threshold pricing.\n• Rx Details for prescription entry (OD/OS SPH, CYL, Axis, Add, PD).\n• PDF export with company branding.\n• Rounding tools for clean totals.",
      },
      {
        id: "qt-creating",
        title: "Creating a Quote",
        content:
          "**Step-by-step:**\n1. Open Quotations from the App Launcher.\n2. Click 'New Quote'.\n3. Choose Stock Quote or Rx Quote — type cannot be changed after creation.\n4. An auto-generated quote number is assigned (e.g., Q-000001).\n5. Fill in the header: customer name, contact details, currency, validity date, lead time.\n6. Add Customer Notes (visible on exported quote) and Internal Notes (team only).\n7. Click the row to open the full-screen quote editor.\n8. Add line items from the product picker.\n9. Review profitability in the right sidebar.\n10. Export or change status as needed.",
      },
      {
        id: "qt-adding-lines",
        title: "Adding Line Items",
        content:
          "Click 'Add Line' to open the product picker.\n\n**Stock Quotes:** Show all active supplies.\n\n**Rx Quotes — Three tabs:**\n• **Lenses** — Active lenses from catalog. After adding, click the eye icon to enter Rx Details.\n• **Add-Ons** — Coatings, tints, treatments.\n• **Supplies** — Cases, cloths, accessories.\n\n**Each line snapshots:**\n• Unit Cost (Landed) — From catalog, cannot be changed.\n• Unit Base Price — Default sell price from catalog.\n• Unit Sell Price — Editable, defaults to base price.\n• Quantity — Defaults to 1, editable inline.\n\n**Calculated Per Line:**\n• Line Sell Total = Qty × Unit Sell Price\n• Line Cost Total = Qty × Unit Cost (Landed)\n• GP $ = Line Sell Total − Line Cost Total\n• GP % = (GP $ ÷ Line Sell Total) × 100",
      },
      {
        id: "qt-profitability",
        title: "Pricing & Profitability",
        content:
          "**Core Rule:** Profitability is always calculated against Landed Cost (BBD).\n\n**Profit Status per line:**\n• 🟢 Profitable — Selling above landed cost.\n• 🟡 AtCost — Selling at exactly landed cost.\n• 🔴 BelowCost — Selling below landed cost.\n• ⚪ NoCost — No landed cost available.\n\n**Threshold Status (GP% vs quote-type threshold):**\n• 🟢 AboveThreshold — GP% ≥ threshold (28% Stock / 48% Rx).\n• 🟡 BelowThreshold — GP% < threshold but still profitable.\n\n**Right Sidebar Summary:**\n• Subtotal, Grand Total, Total GP $ and GP %.\n• Risk flag counters: below-cost lines, below-threshold lines, edited lines, no-cost lines.\n\n**Price Overrides:**\nEditing the Unit Sell price shows an 'Edited' badge. Below-cost prices require an override reason: Match competitor, Strategic account, Clearance stock, Pricing error, Bundle deal, Warranty/remake, or Other.\n\n**Rounding Tools:**\nRound the grand total up to nearest 1, 5, or 10 BBD. A 'Rounding Adjustment' fee line is added for the difference.",
      },
      {
        id: "qt-rx-details",
        title: "Rx Details (Prescription Entry)",
        content:
          "For Rx Quotes, each lens line has an Rx Details button (eye icon) that opens a prescription form.\n\n**Standard Fields:**\n• OD (Right Eye): SPH, CYL, Axis, Add, BC, Prism (value + direction), PD, OC, Fitting Height.\n• OS (Left Eye): Same fields as OD.\n• PD — Pupillary Distance.\n• Seg Height and Fitting Height.\n• Rx Notes — Free text for special instructions.\n\n**Advanced Fields (expandable):**\n• ERCD, Face Form Angle, Panto, Vertex (fitted/refracted), Inset, Eye Level, Object Distance, Slab Off, Special Thickness, FPD, NPD.\n\nRx details are stored separately and linked to the lens line item. They appear on the exported PDF when the internal toggle is used.",
      },
      {
        id: "qt-exporting",
        title: "Exporting Quotes",
        content:
          "Three export options:\n\n• **Download PDF** — Branded PDF with company logo, quote details, line items, and totals.\n• **Print** — Opens browser print dialog.\n• **Copy Summary** — Plain-text summary to clipboard.\n\n**Customer-Facing Export includes:**\nQuote number, date, customer name, validity, lead time, line items, subtotal, grand total, and customer notes.\n\n**Internal Export (toggle) additionally shows:**\nLanded costs, margins, GP%, override reasons, and internal notes.\n\n**Workflow — Sending a Quote:**\n1. Complete all line items and verify profitability.\n2. Add customer notes.\n3. Download PDF (customer-facing version).\n4. Email to customer.\n5. Change status to 'Sent'.\n6. Update status to Accepted, Rejected, or Void when customer responds.",
      },
    ],
  },
  {
    id: "administration",
    icon: Settings,
    title: "Administration",
    articles: [
      {
        id: "managing-users",
        title: "Managing Users",
        content:
          "The Users page (App Launcher → Users) is Admin-only and manages all system users.\n\n**Features:**\n• View all users with email, role, and status.\n• Search and filter by role.\n• Invite new users by email.\n• Assign or change roles (Admin, Operator, Viewer, Customer).\n• Reset user passwords.\n• Delete users (Admin only).\n\n**Customer Users:**\nCustomer-role users are tied to a customer account. After assigning the Customer role:\n• Allocate specific pricelists (WSPL, PL, or WEB) via the Customer Pricing Access panel.\n• Customers can only view and export their allocated pricelists.\n\n**Permission Grid:**\nExpand the 'Permissions' section to see the global RBAC matrix. Each feature has View and Edit checkboxes per role. Changes apply immediately.\n\n**Setting Up a Customer User:**\n1. Click 'Invite User' and enter the customer's email.\n2. Select 'Customer' role.\n3. After creation, expand their row.\n4. Allocate relevant pricelists in the Customer Pricing Access panel.\n5. The customer logs in and sees only their assigned pricelists.",
      },
      {
        id: "company-settings",
        title: "Company Settings & Parameters",
        content:
          "The Settings page (App Launcher → Settings) has multiple tabs:\n\n**Company Info:**\n• Company Name, Slogan, Logo.\n• Contact details (email, phone, fax).\n• Physical, Billing, and Shipping addresses.\n• Tax TIN, Base Currency, Default VAT, Business Calendar.\n\n**Pricing Parameters:**\n• Exchange rates (FX Rates) for currency conversion.\n• Duty rates by product category.\n• Freight method and costs.\n• Target margin %, Floor margin %, Category-specific margins.\n• Governance toggles: Block Below Floor, Block Loss, Require Concession Reason.\n• Overhead %, Labour %, Insurance %, Brokerage Fee.\n• Rounding rules and psychological rounding.\n• Price change thresholds.\n\n**PDF Settings:**\n• Custom header/footer HTML for exported quotes and pricelists.\n\n**Audit Log:**\n• Full trail of all create, update, and delete actions.\n• User, timestamp, table, record, and old vs. new values.\n• Search by user email, table, or action type. Filter by date range.\n• Retention: Audit logs are kept indefinitely and cannot be deleted.",
      },
      {
        id: "content-management",
        title: "Content Management",
        content:
          "The Content Manager (App Launcher → Content) is a centralised CMS for managing:\n\n• **Wiki articles** — Internal documentation (like this wiki).\n• **Knowledge Base** — Technical articles for the public website.\n• **FAQs** — Frequently asked questions displayed on the public site.\n• **Legal Pages** — Copyright, Privacy Policy, Terms of Service.\n\n**Visibility Levels:**\n• Draft — Not published anywhere.\n• Internal — Visible only to admin users.\n• Customer — Visible to logged-in customer users.\n• Public — Visible on the public website.\n\n**Features:**\n• Search and filter articles by type and visibility.\n• Rich-text editor with formatting tools.\n• Metadata editing (slug, category, sort order).\n• Articles can be pulled into Catalog Publisher sections.",
      },
      {
        id: "contacts-crm",
        title: "Contacts & CRM",
        content:
          "The Contacts module (App Launcher → Contacts) manages business relationships:\n\n**Contact Types:**\n• Companies — Business entities (suppliers, customers, partners).\n• Individuals — People linked to companies or standalone contacts.\n\n**Fields:**\n• Name, Email, Phone, Address (street, city, state, zip, country).\n• Industry, Tags (custom categories with colours).\n• Pipeline Stage (New, Qualified, Proposal, Won, Lost).\n• Lead Source, Salesperson, Website, Tax ID.\n• Notes and avatar.\n\n**Customer Flag:**\nContacts marked as 'Is Customer' can be linked to the Customers table for pricelist allocation and quotation integration.\n\n**Tags System:**\nConfigurable tags with categories and colours for flexible contact classification (e.g., 'VIP', 'Government', 'Wholesale').",
      },
    ],
  },
];
