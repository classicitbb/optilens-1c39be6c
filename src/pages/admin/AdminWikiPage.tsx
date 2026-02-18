import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Glasses, Package, Layers, Upload, Database, DollarSign, Users, Ship } from "lucide-react";

const categories = [
{
  icon: BookOpen,
  title: "Getting Started",
  articles: [
  {
    title: "Overview of the Admin Tool",
    content:
    "OptiPricing is the internal pricing and catalog management tool for OptiLens Pro. It lets authorized users manage lenses, supplies, add-ons, pricing parameters, and reference data. The sidebar on the left gives quick access to every section."
  },
  {
    title: "Navigating the Sidebar",
    content:
    "The sidebar lists all available sections: Lenses, Supplies, Add-Ons, Reference Data, Lens Prices, Imports, Runs/History, Exports, Parameters, Users, and Audit Log. Sections marked with a lock icon are only visible to admins. You can collapse the sidebar by clicking the panel toggle at the top."
  },
  {
    title: "User Roles & Permissions",
    content:
    "There are three roles: Admin, Operator, and Viewer. Admins can manage users, view audit logs, and change all data. Operators can add, edit, and import catalog data. Viewers have read-only access to the catalog and pricing pages."
  }]

},
{
  icon: Glasses,
  title: "Lens Catalog",
  articles: [
  {
    title: "Adding & Editing Lenses",
    content:
    "Open the Lenses page and click 'Add Lens' or click any row to edit. The modal has two columns: Item Info on the left (name, supplier, brand, material, lens type, finish type, manufacturing type, index, SPH/CYL/ADD ranges) and Flags/Pricing on the right (notes, toggle flags, base price, sell price, and calculated values)."
  },
  {
    title: "Understanding Flags",
    content:
    "PL (Price List): Include this lens on the standard price list. Full Lab: Lens requires full-lab surfacing (affects pricing calculations — duty, freight, labour are added). WSPL (Wholesale Price List): Show on the wholesale/stock price list. Web: Display this lens on the public website store."
  },
  {
    title: "Calculated Pricing Values",
    content:
    "When a lens is saved, the pricing engine computes several values: FX Cost (base price × exchange rate), CIF Cost (FX + freight + insurance), Landed Cost (CIF + duty), Full Cost (Landed + labour + overhead), and Strategic Price (Full Cost × target margin). These appear as read-only fields in the modal."
  },
  {
    title: "Governance Rules",
    content:
    "If the sell price falls below the calculated floor price, a governance alert is shown. Depending on settings, saving may be blocked or a concession reason may be required. This protects against selling at a loss or below the minimum margin threshold."
  }]

},
{
  icon: Package,
  title: "Supplies & Add-Ons",
  articles: [
  {
    title: "Managing Supplies",
    content:
    "Supplies are non-lens items like cleaning cloths, cases, and tools. Each supply has a name, SKU, category, supplier, brand, base price, sell price, currency, unit, and quantity per unit. Flag toggles control visibility: Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid, Show in Price List, Stk WSPL, and Show on Website."
  },
  {
    title: "Managing Add-Ons",
    content:
    "Add-ons are extras that can be attached to lens orders (e.g. coatings, tints). Each add-on has a name, SKU, category, supplier, cost, price, and flags for Active, Auto (automatically applied based on rules), and Show on Website."
  },
  {
    title: "Pricing & Cost Fields",
    content:
    "Base Price is the cost from the supplier in the specified currency. Sell Price is what you charge. The difference determines your margin. Row shading in the data table indicates pricing health: pink = zero cost, red = selling at a loss, amber = thin margin (0–15%)."
  }]

},
{
  icon: Upload,
  title: "Imports",
  articles: [
  {
    title: "Importing from CSV",
    content:
    "Go to the Imports page and choose the tab for the data type (Lenses, Supplies, Add-Ons, or Frames). Upload a CSV file matching the expected column format. The system will parse the file and show a preview of rows to be imported."
  },
  {
    title: "Resolving Reference Mappings",
    content:
    "If CSV values for supplier, brand, material, or lens type don't exactly match existing reference data, the import wizard will ask you to map them. Mappings are remembered for future imports so you only resolve each value once."
  },
  {
    title: "Handling Duplicates",
    content:
    "When an imported row matches an existing record (by name or SKU), you can choose to overwrite the existing record with the new data or skip/ignore the duplicate. This is configured per import batch."
  }]

},
{
  icon: Database,
  title: "Reference Data",
  articles: [
  {
    title: "Managing Reference Tables",
    content:
    "Reference Data includes Suppliers, Brands, Materials, Lens Types, Finish Types, Manufacturing Types, and Lens Options. Each entry has a name, code, abbreviation, and an active/inactive flag. These values are used as dropdowns throughout the lens and supply forms."
  },
  {
    title: "Deactivating vs. Deleting",
    content:
    "Reference data items that are in use by lenses or supplies cannot be deleted. Instead, mark them as inactive. Inactive items won't appear in dropdown selections but existing records that reference them remain valid."
  }]

},
{
  icon: DollarSign,
  title: "Pricing Engine",
  articles: [
  {
    title: "How Pricing Is Calculated",
    content:
    "The pricing engine follows this chain: Base Price → FX Cost (× exchange rate) → CIF Cost (+ freight + insurance) → Landed Cost (+ import duty) → Full Cost (+ labour % + overhead %) → Strategic Price (÷ (1 − target margin)). Each step uses parameters from the Parameters page."
  },
  {
    title: "What Full Lab Means",
    content:
    "When the Full Lab flag is enabled on a lens, it means the lens requires full laboratory surfacing rather than being a pre-finished stock lens. Full Lab lenses include additional cost components: duty, freight/CIF charges, and labour percentages are applied during pricing calculation."
  },
  {
    title: "Margin Status Badges",
    content:
    "Each lens row shows a margin badge: green for healthy margins (above target), amber for thin margins (above floor but below target), and red for below-floor or loss-making prices. This gives a quick visual overview of pricing health across your catalog."
  },
  {
    title: "Governance Alerts & Concession Reasons",
    content:
    "When a sell price is set below the calculated floor, a governance alert warns the user. If 'Require Concession Reason' is enabled in settings, the user must select or type a reason before saving. If 'Block Below Floor' is enabled, saving is prevented entirely. These controls are configured on the Parameters page."
  }]

},
{
  icon: Layers,
  title: "Import Costings",
  articles: [
  {
    title: "Module Overview",
    content:
    "Import Costings tracks landed costs for shipments of lenses and non-lens items (supplies, add-ons). Navigate via the sidebar: Import Costings > Shipments (all), Lens Shipments, Non-Lens Shipments, or Reports. Each shipment records the supplier, invoice details, FOB and invoice totals in foreign currency (usually USD), and an exchange rate (BBD per 1 USD). All local costs are in BBD."
  },
  {
    title: "Creating a Shipment",
    content:
    "Click '+ New Shipment' on any list page. Fill in the required fields: Type, Supplier, Commodity, Date Received, Invoice Number, Invoice Date, Currency, Exchange Rate, FOB (Foreign), and Invoice Total (Foreign). Click 'Create' to save. After saving, the Charges and Line Items tabs become available."
  },
  {
    title: "Charges Tab",
    content:
    "Charges are local costs entered in BBD only. Pick a charge type from the dropdown (Shipping, Landing, Duties & VAT, Brokerage, Local Freight, Courier, Bank Expenses, Misc, Storage). Enter Amount (BBD), optional VAT (BBD). The Duty and VAT Reclaimable fields only appear for the 'Duties & VAT' charge type. The Row Total and overall Total Charges (BBD) are computed automatically."
  },
  {
    title: "Line Items Tab",
    content:
    "Line items represent individual products in the shipment. For Lens shipments, lines link to Lens catalog records via a product selector dropdown. For Non-Lens shipments, choose Supply, Add-On, or Free item. Enter Quantity and Unit FOB (Foreign) — Line FOB auto-calculates. Computed columns show Line FOB (BBD), Landed Unit Cost (BBD and USD using the multiplier), and optional Sell prices with a markup percentage."
  },
  {
    title: "Cost Allocation & Multiplier",
    content:
    "The multiplier distributes local charges across line items proportionally by FOB value. Formula: Multiplier = (FOB_BBD + Total_Charges_BBD) / FOB_BBD. Each line's Landed Cost = Line_FOB_BBD × Multiplier. Landed Unit Cost = Landed Line / Quantity. USD outputs divide BBD by the exchange rate and are read-only."
  },
  {
    title: "Status Workflow",
    content:
    "Shipments follow a Draft → Reviewed → Locked workflow. Draft: fully editable. Reviewed: can still be edited or sent back to Draft (admin only). Locked: no edits allowed — admins can create a Revision (clone to a new version) from a locked shipment."
  },
  {
    title: "Exports",
    content:
    "The Exports tab on each shipment provides CSV downloads for the shipment summary, charges, and line items — all include both BBD and USD values."
  },
  {
    title: "Reports",
    content:
    "The Reports page shows KPI cards (total shipments, total FOB BBD, average exchange rate, locked count), monthly shipment volume charts, exchange rate trends, FOB summary by supplier, and status breakdown."
  }]
},
{
  icon: Users,
  title: "Users & Audit",
  articles: [
  {
    title: "Managing Admin Users",
    content:
    "The Users page (admin-only) shows all users with assigned roles. Admins can add new users by email and assign them a role (Admin, Operator, or Viewer). Roles can be changed or removed at any time. Only admins can access this page."
  },
  {
    title: "Viewing Audit Logs",
    content:
    "The Audit Log (admin-only) records every create, update, and delete action performed in the admin tool. Each entry shows who made the change, when, what table and record were affected, and a summary of old vs. new values. Use this to track changes and investigate issues."
  }]

}];


const AdminWikiPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const lower = searchTerm.toLowerCase();

  const filtered = categories.
  map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
      !searchTerm ||
      a.title.toLowerCase().includes(lower) ||
      a.content.toLowerCase().includes(lower)
    )
  })).
  filter((cat) => cat.articles.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary" style={{ color: "hsl(0 0% 100%)" }}>
            Help / Wiki
          </h1>
          <p className="text-sm" style={{ color: "hsl(210 15% 65%)" }}>
            Browse articles about how to use OptiPricing.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(210 15% 65%)" }} />
          <Input
            placeholder="Search articles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
            style={{
              background: "hsl(215 25% 15%)",
              borderColor: "hsl(215 25% 22%)",
              color: "hsl(0 0% 100%)"
            }} />

        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {filtered.map((category, catIndex) =>
        <Card
          key={category.title}
          className="border"
          style={{
            background: "hsl(215 25% 13%)",
            borderColor: "hsl(215 25% 20%)"
          }}>

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: "hsl(215 65% 50% / 0.15)" }}>

                  <category.icon className="h-4 w-4" style={{ color: "hsl(215 65% 65%)" }} />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold" style={{ color: "hsl(0 0% 100%)" }}>
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-xs" style={{ color: "hsl(210 15% 55%)" }}>
                    {category.articles.length} article{category.articles.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {category.articles.map((article, aIdx) =>
              <AccordionItem
                key={aIdx}
                value={`${catIndex}-${aIdx}`}
                className="border-b"
                style={{ borderColor: "hsl(215 25% 20%)" }}>

                    <AccordionTrigger
                  className="text-left text-[13px] font-medium py-2.5 hover:no-underline"
                  style={{ color: "hsl(210 20% 88%)" }}>

                      {article.title}
                    </AccordionTrigger>
                    <AccordionContent
                  className="text-[13px] leading-relaxed pb-3"
                  style={{ color: "hsl(210 15% 65%)" }}>

                      {article.content}
                    </AccordionContent>
                  </AccordionItem>
              )}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>

      {filtered.length === 0 &&
      <div className="text-center py-12">
          <p className="text-sm" style={{ color: "hsl(210 15% 55%)" }}>
            No articles match "{searchTerm}".
          </p>
        </div>
      }
    </div>);

};

export default AdminWikiPage;