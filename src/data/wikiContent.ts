import { BookOpen, Glasses, Package, Upload, Database, DollarSign, Users, Ship } from "lucide-react";

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
          "OptiPricing is the internal pricing and catalog management tool for OptiLens Pro. It lets authorized users manage lenses, supplies, add-ons, pricing parameters, and reference data. The sidebar on the left gives quick access to every section.",
      },
      {
        id: "navigating-sidebar",
        title: "Navigating the Sidebar",
        content:
          "The sidebar lists all available sections: Lenses, Supplies, Add-Ons, Reference Data, Lens Prices, Imports, Runs/History, Exports, Parameters, Users, and Audit Log. Sections marked with a lock icon are only visible to admins. You can collapse the sidebar by clicking the panel toggle at the top.",
      },
      {
        id: "user-roles",
        title: "User Roles & Permissions",
        content:
          "There are three roles: Admin, Operator, and Viewer. Admins can manage users, view audit logs, and change all data. Operators can add, edit, and import catalog data. Viewers have read-only access to the catalog and pricing pages.",
      },
    ],
  },
  {
    id: "lens-catalog",
    icon: Glasses,
    title: "Lens Catalog",
    articles: [
      {
        id: "adding-editing-lenses",
        title: "Adding & Editing Lenses",
        content:
          "Open the Lenses page and click 'Add Lens' or click any row to edit. The modal has two columns: Item Info on the left (name, supplier, brand, material, lens type, finish type, manufacturing type, index, SPH/CYL/ADD ranges) and Flags/Pricing on the right (notes, toggle flags, base price, sell price, and calculated values).",
      },
      {
        id: "understanding-flags",
        title: "Understanding Flags",
        content:
          "PL (Price List): Include this lens on the standard price list. Full Lab: Lens requires full-lab surfacing (affects pricing calculations — duty, freight, labour are added). WSPL (Wholesale Price List): Show on the wholesale/stock price list. Web: Display this lens on the public website store.",
      },
      {
        id: "calculated-pricing",
        title: "Calculated Pricing Values",
        content:
          "When a lens is saved, the pricing engine computes several values: FX Cost (base price × exchange rate), CIF Cost (FX + freight + insurance), Landed Cost (CIF + duty), Full Cost (Landed + labour + overhead), and Strategic Price (Full Cost × target margin). These appear as read-only fields in the modal.",
      },
      {
        id: "governance-rules",
        title: "Governance Rules",
        content:
          "If the sell price falls below the calculated floor price, a governance alert is shown. Depending on settings, saving may be blocked or a concession reason may be required. This protects against selling at a loss or below the minimum margin threshold.",
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
          "Supplies are non-lens items like cleaning cloths, cases, and tools. Each supply has a name, SKU, category, supplier, brand, base price, sell price, currency, unit, and quantity per unit. Flag toggles control visibility: Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid, Show in Price List, Stk WSPL, and Show on Website.",
      },
      {
        id: "managing-addons",
        title: "Managing Add-Ons",
        content:
          "Add-ons are extras that can be attached to lens orders (e.g. coatings, tints). Each add-on has a name, SKU, category, supplier, cost, price, and flags for Active, Auto (automatically applied based on rules), and Show on Website.",
      },
      {
        id: "pricing-cost-fields",
        title: "Pricing & Cost Fields",
        content:
          "Base Price is the cost from the supplier in the specified currency. Sell Price is what you charge. The difference determines your margin. Row shading in the data table indicates pricing health: pink = zero cost, red = selling at a loss, amber = thin margin (0–15%).",
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
          "Go to the Imports page and choose the tab for the data type (Lenses, Supplies, Add-Ons, or Frames). Upload a CSV file matching the expected column format. The system will parse the file and show a preview of rows to be imported.",
      },
      {
        id: "resolving-ref-mappings",
        title: "Resolving Reference Mappings",
        content:
          "If CSV values for supplier, brand, material, or lens type don't exactly match existing reference data, the import wizard will ask you to map them. Mappings are remembered for future imports so you only resolve each value once.",
      },
      {
        id: "handling-duplicates",
        title: "Handling Duplicates",
        content:
          "When an imported row matches an existing record (by name or SKU), you can choose to overwrite the existing record with the new data or skip/ignore the duplicate. This is configured per import batch.",
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
          "Reference Data includes Suppliers, Brands, Materials, Lens Types, Finish Types, Manufacturing Types, and Lens Options. Each entry has a name, code, abbreviation, and an active/inactive flag. These values are used as dropdowns throughout the lens and supply forms.",
      },
      {
        id: "deactivating-vs-deleting",
        title: "Deactivating vs. Deleting",
        content:
          "Reference data items that are in use by lenses or supplies cannot be deleted. Instead, mark them as inactive. Inactive items won't appear in dropdown selections but existing records that reference them remain valid.",
      },
    ],
  },
  {
    id: "pricing-engine",
    icon: DollarSign,
    title: "Pricing Engine",
    articles: [
      {
        id: "how-pricing-calculated",
        title: "How Pricing Is Calculated",
        content:
          "The pricing engine follows this chain: Base Price → FX Cost (× exchange rate) → CIF Cost (+ freight + insurance) → Landed Cost (+ import duty) → Full Cost (+ labour % + overhead %) → Strategic Price (÷ (1 − target margin)). Each step uses parameters from the Parameters page.",
      },
      {
        id: "what-full-lab-means",
        title: "What Full Lab Means",
        content:
          "When the Full Lab flag is enabled on a lens, it means the lens requires full laboratory surfacing rather than being a pre-finished stock lens. Full Lab lenses include additional cost components: duty, freight/CIF charges, and labour percentages are applied during pricing calculation.",
      },
      {
        id: "margin-status-badges",
        title: "Margin Status Badges",
        content:
          "Each lens row shows a margin badge: green for healthy margins (above target), amber for thin margins (above floor but below target), and red for below-floor or loss-making prices. This gives a quick visual overview of pricing health across your catalog.",
      },
      {
        id: "governance-alerts",
        title: "Governance Alerts & Concession Reasons",
        content:
          "When a sell price is set below the calculated floor, a governance alert warns the user. If 'Require Concession Reason' is enabled in settings, the user must select or type a reason before saving. If 'Block Below Floor' is enabled, saving is prevented entirely. These controls are configured on the Parameters page.",
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
        title: "Purpose",
        content:
          "Import Costings tracks the landed cost of goods imported into the business. It records each shipment's foreign-currency purchase price, local charges incurred during import (shipping, duties, brokerage, etc.), and allocates those charges across line items to arrive at a per-unit landed cost in BBD and USD.\n\n**What it IS:** A cost-tracking and allocation tool that produces accurate landed costs for pricing decisions and financial reporting.\n\n**What it is NOT:** It is not an accounting module — it does not post journal entries or interface with your general ledger. It is not a payment system — it does not track when or how suppliers are paid. It is not a purchase order system — PO references are informational only.",
      },
      {
        id: "ic-navigation",
        title: "Navigation",
        content:
          "Import Costings is accessed via the sidebar under **Import Costings**, which expands to show four sub-pages:\n\n• **Shipments** — All shipments regardless of type, with filters for type/status/supplier.\n• **Lens Shipments** — Filtered to show only Lens-type shipments.\n• **Non-Lens Shipments** — Filtered to show only Non-Lens-type shipments.\n• **Reports** — KPI cards, charts, and summary tables across all shipments.\n\nEach list page shows shipments in a sortable, searchable table with status badges, supplier names, dates, and FOB totals.",
      },
      {
        id: "ic-status-workflow",
        title: "Status Workflow",
        content:
          "Every shipment follows a three-stage lifecycle:\n\n**Draft** — Fully editable. All header fields, charges, and line items can be added, changed, or removed. This is the working state for data entry.\n\n**Reviewed** — Still editable but signals that the data has been checked. An Admin can move a Reviewed shipment back to Draft if corrections are needed.\n\n**Locked** — No edits are allowed. Locking freezes all values and prevents accidental changes. Only Admins can lock a shipment. Once locked, the only way to make changes is to create a **Revision** (a clone of the locked shipment as a new Draft with an incremented version number).\n\n**Who can do what:**\n• Admin — Can change status in any direction, lock shipments, and create revisions.\n• Operator — Can create and edit Draft/Reviewed shipments but cannot lock.\n• Viewer — Read-only access to all shipments.",
      },
      {
        id: "ic-create-shipment",
        title: "Creating a Shipment",
        content:
          "**Step-by-step:**\n1. Navigate to any shipment list page and click **+ New Shipment**.\n2. Fill in the required header fields:\n   • **Type** — Lens or Non-Lens.\n   • **Supplier** — Select from the active suppliers list.\n   • **Commodity** — Free-text description of the goods.\n   • **Date Received** — The date goods arrived.\n   • **Invoice Number** — The supplier's invoice reference.\n   • **Invoice Date** — Date on the supplier's invoice.\n   • **Currency** — The foreign currency of the invoice (default: USD).\n   • **Exchange Rate (XR)** — BBD per 1 unit of foreign currency. For USD this is typically 2.00.\n   • **FOB (Foreign)** — Free On Board value in foreign currency. This is the total value of goods before any local charges.\n   • **Invoice Total (Foreign)** — The full invoice amount in foreign currency.\n3. Optionally add a **PO Reference** and **Date Ordered**.\n4. Click **Create** to save the shipment header.\n5. After creation, the **Charges** and **Line Items** tabs become available.\n\n**FOB vs Invoice Total:** FOB is the goods value used for cost allocation. Invoice Total is the supplier's billed amount (may include supplier-side freight or other charges). They can differ.\n\n**Attachments:** Upload scanned invoices, packing lists, and broker statements to the shipment for audit trail. Keep file names descriptive (e.g. \"INV-2024-001-PackingList.pdf\").",
      },
      {
        id: "ic-add-charges",
        title: "Adding Charges",
        content:
          "Charges represent **local costs in BBD only** incurred during the import process. They are entered on the **Charges** tab of a shipment.\n\n**Allowed charge types:**\n• Shipping\n• Landing\n• Duties & VAT\n• Brokerage\n• Local Freight\n• Courier\n• Bank Expenses\n• Miscellaneous\n• Storage\n\n**How to enter a charge:**\n1. Click **+ Add Charge** on the Charges tab.\n2. Select the charge type from the dropdown.\n3. Enter the **Amount (BBD)**.\n4. Optionally enter **VAT (BBD)** — this is the VAT you paid on this specific charge.\n5. For the **Duties & VAT** charge type only, two additional fields appear: **Duty (BBD)** and **VAT Reclaimable** (toggle). Use these to record the actual customs duty amount and whether the VAT portion can be reclaimed.\n\nThe **Row Total** and overall **Total Charges (BBD)** are calculated automatically.\n\n**Common mistakes to avoid:**\n• **Do NOT enter the supplier payment as a charge.** Charges are local import costs only. The supplier's invoice is captured in the FOB and Invoice Total header fields.\n• Do not mix currencies — all charge amounts must be in BBD.\n• Do not duplicate duty amounts — enter duty only in the Duties & VAT row, not as a separate charge.",
      },
      {
        id: "ic-add-line-items",
        title: "Adding Line Items",
        content:
          "Line items represent the individual products within a shipment. They are entered on the **Line Items** tab.\n\n**Product type selector:**\nFor **Lens** shipments, all line items link to Lens catalog records. For **Non-Lens** shipments, each line has a product type dropdown:\n• **Supply** — Links to a Supply catalog record.\n• **Add-On** — Links to an Add-On catalog record.\n• **Free Item** — No catalog link; enter a description manually. Use this for samples, promotional items, or goods not in your catalog.\n\n**Using the product dropdown:**\nThe product dropdown is a searchable list. Type part of the product name to filter. If multiple catalog records share the same name, only one entry is shown (deduplicated). Select the product, then enter **Quantity** and **Unit FOB (Foreign)**.\n\n**Line FOB** (Quantity × Unit FOB) is calculated automatically. All other computed columns (Line FOB BBD, Landed Unit Cost BBD/USD) update once charges are entered and the multiplier is calculated.\n\n**When to use Free Item:**\nUse Free Item when the goods are not in your catalog (samples, gifts, one-off items) or when you don't need to track landed cost against a specific product record.",
      },
      {
        id: "ic-calculations",
        title: "Understanding the Calculations",
        content:
          "Import Costings uses a proportional allocation method to distribute local charges across line items based on their FOB value.\n\n**Key values:**\n\n**FOB (BBD)** = FOB (Foreign) × Exchange Rate. This is the total goods value in local currency.\n\n**Total Charges (BBD)** = Sum of all charge row totals. This is the total local import cost.\n\n**Multiplier** = (FOB BBD + Total Charges BBD) ÷ FOB BBD. This single ratio captures how much local charges add to the goods value. A multiplier of 1.25 means local charges add 25% to the goods cost.\n\n**Landed Line (BBD)** = Line FOB (BBD) × Multiplier. Each line item's share of the total landed cost, proportional to its FOB value.\n\n**Landed Unit Cost (BBD)** = Landed Line (BBD) ÷ Quantity. The per-unit landed cost in local currency.\n\n**Landed Unit Cost (USD)** = Landed Unit Cost (BBD) ÷ Exchange Rate. The per-unit landed cost converted back to USD. This is a read-only reference value.\n\n**Markup % vs Margin:**\nThe optional Markup % field on line items applies a **markup** (cost-plus), NOT a margin. Markup % = (Sell Price − Cost) ÷ Cost × 100. For example, a 50% markup on a $10.00 cost gives a $15.00 sell price. This is explicitly a markup calculation, not a gross-margin calculation.",
      },
      {
        id: "ic-locking-revisions",
        title: "Locking & Revisions",
        content:
          "**When to lock:**\nLock a shipment once all charges are entered, all line items are complete, and the data has been reviewed for accuracy. Locking signals that the shipment's cost data is final and can be used for pricing decisions.\n\n**How locking works:**\n• Only Admins can lock a shipment (by changing status to Locked).\n• Once locked, no fields can be edited — the shipment becomes read-only.\n• All computed values (multiplier, landed costs) are frozen at their current state.\n\n**How revisions work:**\nIf a locked shipment needs corrections (e.g. a charge was missed or an exchange rate was wrong):\n1. Open the locked shipment.\n2. Click **Create Revision** (Admin only).\n3. A new shipment is created as a Draft with all the same data, version incremented (v1 → v2).\n4. The new revision is fully editable. The original locked shipment is preserved unchanged.\n5. Multiple revisions can exist — each is a standalone shipment linked to the original via parent reference.",
      },
      {
        id: "ic-exports",
        title: "Exports",
        content:
          "Each shipment has an **Exports** tab that provides CSV downloads for three datasets:\n\n**Shipment Summary** — Header fields including supplier, dates, FOB, invoice total, exchange rate, total charges, multiplier, and status. Both BBD and USD values are included.\n\n**Charges** — All charge rows with type, amount, VAT, duty (where applicable), and row totals in BBD.\n\n**Line Items** — All line items with product details, quantity, unit FOB (foreign and BBD), line FOB, landed line, landed unit cost (BBD and USD), and markup/sell values if set.\n\n**Handing off to finance/pricing:**\nExport the Line Items CSV to share per-unit landed costs with your pricing team. The Landed Unit Cost (BBD) column is the key value for updating sell prices. Export the Charges CSV for finance to reconcile import expenses against invoices and payments.",
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
          "The Users page (admin-only) shows all users with assigned roles. Admins can add new users by email and assign them a role (Admin, Operator, or Viewer). Roles can be changed or removed at any time. Only admins can access this page.",
      },
      {
        id: "viewing-audit-logs",
        title: "Viewing Audit Logs",
        content:
          "The Audit Log (admin-only) records every create, update, and delete action performed in the admin tool. Each entry shows who made the change, when, what table and record were affected, and a summary of old vs. new values. Use this to track changes and investigate issues.",
      },
    ],
  },
];
