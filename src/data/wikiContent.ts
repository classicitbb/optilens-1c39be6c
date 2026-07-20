import {
  BookOpen,
  DollarSign,
  ShoppingCart,
  Users,
  Search,
  Target,
  BookMarked,
  Globe,
  Settings,
  ScrollText,
  LifeBuoy,
} from "lucide-react";

import changelogMarkdown from "../../CHANGELOG.md?raw";
import deliveryPlanMarkdown from "../../docs/phase2-phase3-delivery.md?raw";
import releaseNotesMarkdown from "../../docs/release-notes.md?raw";

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  context_slugs?: string[];
}

export interface WikiCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  articles: WikiArticle[];
}

export const wikiCategories: WikiCategory[] = [
  {
    id: "release-ledger",
    icon: ScrollText,
    title: "Release Ledger",
    articles: [
      { id: "release-notes-md", title: "Release Notes (Markdown)", content: releaseNotesMarkdown },
      { id: "changelog-md", title: "Changelog (Markdown)", content: changelogMarkdown },
      { id: "delivery-plan-md", title: "Delivery Plan (Markdown)", content: deliveryPlanMarkdown },
    ],
  },
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      {
        id: "platform-overview",
        title: "Platform Overview and Navigation",
        content: `## What this platform does

This platform is a unified business operating system designed for optical laboratories and lens distributors. It brings together pricing management, sales operations, customer relationship management, lead generation, helpdesk support, website content governance, internal knowledge management, and strategic execution planning into a single environment.

Every feature is accessible through the App Launcher, which organises the platform into distinct business applications. Each application has its own sidebar navigation, and every page within an application can display context-sensitive help through the Help panel.

## How to navigate

The platform uses a consistent navigation model across all applications.

- Open the App Launcher from the top bar to switch between business applications such as Pricing, Sales, CRM, Leads, Helpdesk, Website, Knowledge, and Settings
- Each application has a dedicated sidebar with links to its individual pages
- The Help panel is available on every page and displays articles relevant to the current view
- The Global Search bar in the top navigation allows you to find records, articles, and pages across the entire platform
- Notifications appear in the bell icon and include sync progress updates, task reminders, and runtime error alerts

## User roles and access

The platform enforces role-based access control with four distinct roles.

- **Admin** has full control over all features, users, pricing, and system configuration
- **Operator** handles day-to-day operations including catalog management, imports, pricelist generation, and support workflows
- **Viewer** has read-only access to product catalogs, lens prices, pricelists, and the Help Wiki, but cannot see cost data or edit any records
- **Customer** has external read-only access limited to pricelists specifically assigned to their account, with cost data always hidden

Access is enforced both in the user interface and at the database level through row-level security policies.`,
      },
      {
        id: "route-coverage-matrix",
        title: "Application and Route Reference",
        content: `## Application structure

The operations console is split into admin domains with one canonical route per runtime page, plus legacy redirect paths for migrated URLs.

## Pricing application

- **Product Catalog** manages SKUs, lens specifications, add-ons, and supplies across segmented tabs with search, column filters, and active/inactive controls
- **RX Lens Prices** maintains the prescription lens pricing matrix (base prices, upgrades, and material options)
- **Stock Lens Prices** manages wholesale stock lens pricing with WSPL visibility
- **Supplies Prices** manages non-lens accessory and supply pricing
- **Supplier Compare** provides supplier-level pricing comparison to support sourcing decisions
- **Lens Catalog Builder** publishes customer-facing catalog/proposal content
- **Import Costings** tracks shipment landed costs (freight, duties, currency effects)
- **Costing Reports** analyzes landed cost trends and margin exposure
- **Reference Data** governs shared lookups (brands, finish types, charge types, suppliers)
- **Imports** supports bulk data loads for pricing domains
- **Pricing Settings** defines global pricing parameters and defaults

## Sales application

- **Proposals** builds consultative proposal documents
- **Quotations** handles formal quote creation/editing
- **Quotation Print Preview** provides print-ready output for signed or shared quotes
- **Web Orders** processes orders submitted through the public website store
- **RX Orders** handles prescription lens orders submitted via the RX order form

## Contacts application

- **All Contacts** maintains account/contact master data and sync status
- **Tags Config** governs contact tag taxonomy
- **Industries Config** governs industry segmentation taxonomy

## Leads application

- **Lead Finder** runs multi-provider prospect discovery
- **My Leads** manages qualification, status, and conversion to CRM opportunities
- **Campaigns & Sequences** manages outreach orchestration
- **Audit Reports** tracks source and conversion performance
- **AI Assistant** supports campaign/outreach content generation
- **Settings** controls lead policy and scoring configuration

## CRM application

- **Dashboard** surfaces KPI, pipeline health, and overdue activity risk
- **Pipeline** manages opportunities by stage
- **Activities** tracks calls, meetings, emails, and task follow-ups

## Helpdesk application

- **Overview** centralizes operational ticket health and SLA posture
- **Tickets** manages lifecycle, assignments, and SLA status
- **Teams** defines service ownership groups and assignment mode
- **Stages** defines lifecycle states and closure semantics
- **SLA Policies** defines response/resolution commitments
- **Config** controls tagging/types and operational defaults

## Website application

- **Pages / Content** governs managed site content and article publishing
- **Feature Pages** governs feature-page content surfaces
- **Website Portals** manages website portal content surfaces
- **Store / Products** manages store-facing catalog experiences

## Knowledge application

- **Wiki Articles** houses operational docs, SOPs, and release-ledger references
- **Help Assignments** maps help articles to route contexts for in-page guidance

## Settings application

- **Company** manages business identity and default settings
- **Users** manages identity lifecycle and role assignment
- **Roles & Permissions** configures feature-level authorization
- **Audit Log** tracks system changes for accountability
- **Integrations** governs external connectors and sync operations (admin-guarded)
- **Runtime Errors** surfaces production error telemetry for triage

## Ops domain

- \`/ops/*\` routes currently redirect to \`/admin/dashboard\` and do not expose a separate active UI surface yet.

## Public site routes

Key active public-facing pages managed through this platform:

- **Lens guides** — \`/lenses/lens-types\`, \`/lenses/single-vision\`, \`/lenses/progressive\`, \`/lenses/anti-fatigue\`, \`/lenses/office-occupational\`, \`/lenses/bifocals\`, \`/lenses/myopia-control\`, \`/lenses/blue-filter\`, \`/lenses/polarized\`, \`/lenses/tints-fashion-colors\`, \`/lenses/materials\`, \`/lenses/thickness-chart\`
- **Coatings** — \`/coatings/ultraclear-ar\`, \`/coatings/blueblock-ar\`, \`/coatings/scratch-resistant\`, \`/coatings/uv-shield\`, \`/coatings/hydrophobic-oleophobic\`, \`/coatings/mirror\`
- **Photochromic** — \`/photochromic\`
- **Patient hub** — \`/patients\` with sub-pages for lens differences, progressive, anti-fatigue, caring for glasses, computer/mobile use, sunlight protection, regular eye exams, and night driving aids
- **Professional hub** — \`/professionals\` with sub-pages for dispensing tips, lens ordering tips, lab process overview, tracing/cutting guide, customer-supplied frames policy, freight/delivery policy, repairs policy, returns/replacements, and Chemistrie lens system
- **ZenVue collection** — \`/zenvue\`, \`/zenvue/brilliance\`, \`/zenvue/single-vision\`, \`/zenvue/darkun\`, \`/zenvue/compare\`, \`/zenvue/wholesale\`
- **Retailer directory** — \`/find-a-retailer\`, \`/find-a-retailer/barbados\`
- **Knowledge base** — \`/knowledge\`
- **Legal** — \`/legal/:slug\` (privacy-policy, terms, cookie-policy, disclaimer, accessibility)`,
      },
      {
        id: "daily-rhythm",
        title: "Daily Workflow and Best Practices",
        content: `## Recommended daily rhythm

A structured daily workflow ensures that no critical task falls through the cracks and that every team member contributes to pipeline momentum.

1. Begin in the **CRM Dashboard** to review overnight changes, overdue activities, and pipeline health indicators
2. Check **Helpdesk Tickets** for any urgent support requests or SLA breaches that require immediate attention
3. Move to **Lead Finder** to run targeted searches and discover new prospects based on your current campaign focus
4. Qualify and score new leads in **My Leads**, then convert high-potential records to CRM opportunities
5. Manage active deals in the **CRM Pipeline** by updating stages, logging activities, and scheduling follow-ups
6. Assemble and send **Proposals** or **Quotations** for deals that have reached the offer stage
7. Review **Product Catalog** and **Pricing** pages for any items that need activation, deactivation, or price adjustments
8. Process any pending **Imports** for new product data, costing references, or bulk price updates
9. End the day by reviewing the **Audit Log** for any unexpected changes and clearing notification alerts

## Weekly cadence

- **Monday** — Review CRM pipeline, update outstanding activities, and plan the week
- **Tuesday to Thursday** — Execute on pipeline activities, lead outreach, and operational tasks
- **Friday** — Run costing reports, review integration sync health, and clear any outstanding helpdesk tickets

## Best practices

- Always update CRM pipeline stages promptly to maintain accurate forecasting
- Log every customer interaction as an activity with a due date for the next action
- Use the Help panel on any page when you are unsure about a workflow step
- Keep product catalog data clean by deactivating discontinued items rather than deleting them
- Review the audit log weekly to catch any unintended changes early`,
      },
    ],
  },
  {
    id: "pricing-app",
    icon: DollarSign,
    title: "Pricing App",
    articles: [
      {
        id: "product-catalog-guide",
        title: "Product Catalog Management",
        content: `## Overview

The Product Catalog is the central repository for all sellable items in the system. It is organised into three segments: Lenses, Add-ons, and Supplies. Each segment has its own tab with independent search, column filters, and active/inactive management.

## Navigating the catalog

- Use the segment tabs at the top to switch between Lenses, Add-ons, and Supplies
- Each tab displays a live count of active items matching your current search and filter criteria
- The global search bar filters across all visible columns simultaneously
- Column-specific filter popovers allow you to narrow results by individual fields such as brand, material, or category
- Click any column header to sort ascending or descending
- Use the column chooser to show or hide specific data columns

## Managing lenses

Each lens record contains specifications including brand, material, index, design, finish type, diameter range, and power range. Key fields include:

- **SKU/OPC** — The unique product code used for ordering and identification
- **Web enabled** — When toggled on, this lens appears on the RX order form and can be sold through the website
- **WSPL enabled** — When toggled on, this lens appears as a semi-finished stock lens available for wholesale purchase
- **Active/Inactive** — Controls whether the lens appears in pricing sheets and order forms

To add a new lens, click the Add Lens button and complete the form dialog. To edit an existing lens, click the edit icon on any row.

## Managing add-ons

Add-ons represent optional treatments, coatings, and services that can be applied to lens orders. They are available exclusively on pricelists and the RX order form.

- Each add-on has a category, SKU, description, cost, and selling price
- Auto-rules can be configured to automatically include certain add-ons based on lens selections
- Add-ons can be linked to specific pricing sheets for customer-specific pricing

## Managing supplies

Supplies cover accessories, cleaning products, cases, and other non-lens items. They follow the same active/inactive pattern and can be included in pricing sheets.

## Visibility rules

- **Admin and Operator** can see cost columns and edit records
- **Viewer and Customer** never see cost data — it is hidden in the interface and excluded from API responses`,
      },
      {
        id: "pricing-workflow",
        title: "Pricing Workflow: Catalog to Costings",
        content: `## End-to-end pricing workflow

The pricing workflow follows a specific sequence to ensure data consistency and accurate margin calculations.

1. **Maintain product data** — Start in the Product Catalog to ensure all SKUs, specifications, and status flags are current
2. **Set base prices** — Configure lens pricing matrices in the RX Lens Prices and Stock Lens Prices pages
3. **Configure treatment pricing** — Set up material upgrade matrices and treatment combination pricing
4. **Update reference data** — Ensure brands, finish types, charge types, and suppliers are correctly defined
5. **Run imports** — Use the Imports page to bulk load any data changes from external sources
6. **Verify landed costs** — Review Import Costings to confirm duty, freight, and currency conversion calculations
7. **Analyse margins** — Use Costing Reports to identify items with margin pressure or pricing anomalies
8. **Adjust settings** — Fine-tune global parameters in Pricing Settings including VAT rates, duty percentages, and profit margins

## Price hierarchy

The system supports a multi-level price hierarchy that determines the final price shown to each customer.

- **Base catalog price** — The default price set in the product catalog
- **Pricelist overrides** — Customer-specific or channel-specific pricing adjustments
- **Treatment matrices** — Automated price calculations based on lens material, coating, and treatment combinations
- **Manual line overrides** — One-off price adjustments applied at the quotation level

## Critical rule about website pricing

Website and public prices are exclusively linked to the Price Catalog. A pricelist does not change website product pricing unless the system is explicitly configured to use the pricelist as the website pricing source. This setting defaults to off and must be consciously enabled by an administrator.`,
      },
      {
        id: "rx-lens-prices-guide",
        title: "RX Lens Prices",
        content: `## Overview

The RX Lens Prices page displays the complete prescription lens pricing matrix. This is where you manage base prices for lenses that are sold through the RX order form.

## How the matrix works

The pricing matrix is organised by lens design and material combination. Each cell in the matrix represents the base price for a specific design-material pair, with additional rows for power range and diameter variations.

- Rows represent lens designs such as single vision, progressive, bifocal, and occupational
- Columns represent material and index combinations such as CR-39 1.50, Polycarbonate 1.59, and High Index 1.67
- Treatment upgrades are managed through the Treatment Matrices accordion, which calculates additional costs for coatings and finishes

## Editing prices

- Click any cell to open the inline editor and enter a new price value
- Changes are highlighted until saved to help you track modifications
- Use the Matrix Export bar to download the current pricing state as a spreadsheet for offline review
- The price matrix supports bulk operations through the Imports page

## Treatment matrices

Treatment matrices define the additional charges applied when specific coating or treatment combinations are selected. These work as additive layers on top of the base lens price.

- Each treatment matrix covers a specific category such as anti-reflective coatings, photochromic treatments, or tinting options
- Prices within treatment matrices can vary by lens material and index
- The accordion interface allows you to expand and collapse individual treatment categories for focused editing`,
      },
      {
        id: "stock-lens-prices-guide",
        title: "Stock Lens Prices",
        content: `## Overview

The Stock Lens Prices page manages pricing for semi-finished and finished stock lenses that are sold wholesale. Only lenses with the WSPL flag enabled in the Product Catalog appear on this page.

## WSPL explained

WSPL stands for Wholesale Stock Pricelist. When a lens has WSPL enabled, it becomes available as a semi-finished stock lens for wholesale purchase by optical retailers and dispensers.

- Stock lens prices are distinct from RX lens prices and can be set independently
- The wholesale stock percentage configured in Pricing Settings applies a global markup or discount factor to stock lens pricing
- Stock lens pricing appears on WSPL-type pricelists allocated to wholesale customers

## Managing stock prices

- Review the stock lens grid to see current pricing across all WSPL-enabled items
- Use column filters to narrow the view by brand, material, or design
- Export the current pricing state for distribution or review using the export toolbar`,
      },
      {
        id: "supplies-prices-guide",
        title: "Supplies Prices",
        content: `## Overview

The Supplies Prices page manages pricing for non-lens accessories and consumable items. This includes lens cases, cleaning solutions, microfibre cloths, display materials, and other retail accessories.

## How supplies pricing works

- Each supply item has a cost price and a selling price maintained in the product catalog
- Supplies can be included in pricelists alongside lens products for comprehensive customer price sheets
- Active and inactive status controls whether a supply item appears in new orders and pricing sheets
- The supplies pricing view mirrors the same search, filter, and export capabilities available in the lens pricing pages`,
      },
      {
        id: "catalog-publisher-guide",
        title: "Lens Catalog Builder",
        content: `## Overview

The Lens Catalog Builder assembles professional customer-facing catalogs by combining pricelist data, product information, and editorial content into a structured, publishable document.

## Building a catalog

1. **Select or create a catalog template** with a name, cover title, subtitle, and gradient colour scheme
2. **Add sections** to the catalog using the section editor — available section types include pricelist tables, wiki articles, and custom content blocks
3. **Configure each section** with a custom title, sort order, and inclusion toggle
4. **Link pricelist versions** to pricing sections so the catalog displays the correct price data
5. **Link wiki articles** to content sections for product descriptions, technical guides, or terms and conditions
6. **Preview the assembled catalog** in the proposal preview panel before finalising
7. **Export to PDF** using the export toolbar for distribution to customers

## Catalog assignment

Completed catalogs can be assigned to specific customer accounts through the catalog assignment system. This allows different customers to receive different catalog configurations tailored to their product range and pricing tier.

## Custom packages

The Build Custom Package feature allows you to create one-off catalog configurations for specific customer proposals without creating a permanent template.`,
      },
      {
        id: "import-costings-guide",
        title: "Import Costings and Shipments",
        content: `## Overview

Import Costings tracks the landed cost of goods imported from international suppliers. It calculates the true cost of each item by factoring in purchase price, shipping fees, customs duty, insurance, and currency exchange rates.

## Creating a shipment

1. Navigate to Import Costings and click to create a new shipment
2. Enter shipment details including supplier, invoice reference, shipping date, and freight costs
3. Add line items with quantities, unit costs in the supplier currency, and product references
4. The system automatically calculates landed costs using the duty rates, import multiples, and currency exchange rates configured in Pricing Settings

## Reviewing shipment details

Each shipment detail page shows a complete breakdown of costs per item including:

- Original supplier cost in foreign currency
- Exchange rate applied at time of import
- Duty amount based on the configured import duty percentage
- Freight allocation proportional to item value
- Final landed cost in the base currency

## Costing reports

The Costing Reports page provides analytical views across all shipments, allowing you to identify cost trends, compare supplier pricing over time, and flag items where landed costs exceed current selling prices.`,
      },
      {
        id: "reference-data-guide",
        title: "Reference Data Management",
        content: `## Overview

Reference Data maintains the shared lookup tables used across the entire pricing system. These tables provide standardised values for dropdowns, filters, and classification throughout the platform.

## Reference tables

- **Brands** — Lens manufacturer brands with codes, abbreviations, and active status
- **Finish Types** — Lens finish classifications such as uncoated, hard coated, and multi-coated
- **Charge Types** — Fee categories for services, treatments, and surcharges
- **Suppliers** — Vendor records used in costings, product sourcing, and purchase tracking

## Managing reference data

- Use the tabbed interface to switch between reference tables
- Add new entries using the form dialog accessible from the add button on each tab
- Edit existing entries by clicking the edit icon on any row
- Toggle active status to retire obsolete values without deleting historical associations
- Reference data changes take effect immediately across all dependent pages including pricing matrices, product catalog filters, and import forms`,
      },
      {
        id: "imports-guide",
        title: "Bulk Data Imports",
        content: `## Overview

The Imports page provides bulk data loading capabilities for lenses, add-ons, supplies, and costing references. This is the primary tool for loading large datasets from spreadsheets or external systems.

## Import workflow

1. Select the import type tab — Lenses, Add-ons, Supplies, or Costing References
2. Download the import template to see the required column format
3. Prepare your data file according to the template structure
4. Upload the file and review the parsed data in the import preview
5. Use the review filters to identify rows with warnings, errors, or duplicate keys
6. Confirm the import to write validated records to the database

## Import validation

The system validates each row during import and flags issues including:

- Missing required fields such as SKU or product name
- Duplicate SKU or OPC codes that conflict with existing records
- Invalid reference data values that do not match existing brands, materials, or finish types
- Numeric values outside expected ranges for prices, costs, or measurements

## Best practices

- Always import reference data before product data to ensure lookup values are available
- Review the full import preview before confirming, paying special attention to flagged rows
- Run imports during off-peak hours to minimise impact on concurrent users
- Keep a backup of the import file for audit purposes`,
      },
      {
        id: "pricing-settings-guide",
        title: "Pricing Settings",
        content: `## Overview

Pricing Settings configures the global parameters that influence price calculations, margin analysis, and cost computations throughout the platform.

## Key settings

- **Default VAT** — The standard value-added tax percentage applied to pricing calculations
- **Import Duty** — The customs duty rate used in landed cost calculations for imported goods
- **Frames Duty** — A separate duty rate applied specifically to frame imports
- **Import Multiple** — A multiplier factor applied during import cost calculations
- **Labour Percent** — The labour cost percentage factored into manufacturing cost estimates
- **Profit Percent** — The target profit margin percentage used in pricing recommendations
- **Wholesale Stock Percentage** — The markup or discount factor applied to wholesale stock lens pricing
- **Base Currency** — The primary currency used for all pricing displays and calculations
- **Currency Exchange Rates** — Configurable exchange rates for converting foreign supplier costs

## When to update settings

- Update duty rates when customs regulations change
- Adjust profit percentages when competitive pricing strategy shifts
- Update exchange rates regularly to reflect current market conditions
- Review labour percentages when manufacturing process costs change significantly`,
      },
      {
        id: "proposals-workflow",
        title: "Proposals Workflow",
        content: `## Overview

Proposals are consultative, presentation-style offers used when a sales approach requires more context than a standard quotation. They combine product recommendations with narrative content to create a compelling case for the customer.

## Creating a proposal

1. Open the Proposals page and create a new proposal
2. Add products from the approved catalog entries using the product picker
3. Structure content blocks including problem statement, recommendation, offer details, and next steps
4. Customise the cover page with customer-specific branding and messaging
5. Review pricing accuracy and narrative consistency before finalising
6. Export or share the proposal and link it to the relevant CRM opportunity

## When to use proposals versus quotations

Use proposals when the customer needs educational context, competitive comparison, or a structured recommendation before receiving formal pricing. Use quotations when the customer is ready for a specific priced offer with line items and payment terms.`,
      },
    ],
  },
  {
    id: "sales-app",
    icon: ShoppingCart,
    title: "Sales App",
    articles: [
      {
        id: "quotations-lifecycle",
        title: "Quotations Lifecycle",
        content: `## Overview

Quotations are formal priced offers sent to customers. Each quotation follows a structured lifecycle from draft creation through to acceptance or expiry.

## Creating a quotation

1. Navigate to Quotations and click to create a new quote
2. Select the customer and populate identification details
3. Add frame selections with specifications and pricing
4. Configure lens options including design, material, coatings, and treatments
5. Enter prescription details in the Rx section if applicable
6. Add any required add-ons from the available options
7. Review the complete quote summary including line totals, discounts, and final amount

## Quote statuses

- **Draft** — The quote is being prepared and has not been sent to the customer
- **Sent** — The quote has been delivered to the customer and is awaiting response
- **Accepted** — The customer has approved the quote and it can be converted to an order
- **Expired** — The quote validity period has passed without customer action
- **Cancelled** — The quote has been withdrawn or superseded by a revised version

## Working with line items

Each quotation supports multiple line items with independent pricing. The system calculates:

- Base lens price from the pricing matrix
- Treatment and coating surcharges from treatment matrices
- Add-on charges for optional services and products
- Frame pricing with any applicable markups
- Margin indicators showing the relationship between cost and selling price

## Margin badges

The margin badge on each line item provides a visual indicator of pricing health. Green indicates healthy margins, amber indicates margins below target, and red flags items where the selling price is below cost.`,
      },
      {
        id: "quote-print-preview-guide",
        title: "Print and PDF Preview",
        content: `## Overview

The Print Preview page generates a professional, print-ready view of any quotation. This is used to create PDF documents for customer delivery.

## Using print preview

1. Complete all quote inputs in the quotation editor
2. Click the Print or Preview button to open the print-ready layout
3. Validate the document including customer details, pricing blocks, terms, and notes
4. Configure paper size and orientation if needed
5. Export to PDF or print directly from the browser

## Formatting tips

- Disable browser headers and footers in your print settings for a clean output
- Keep the print scale at 100 percent for consistent formatting
- Use the company logo and branding configured in Company Settings
- The PDF header and footer HTML configured in Company Settings automatically appears on printed documents

## Troubleshooting

- If text appears truncated, check that the quote notes and description fields are within reasonable length
- If pricing columns misalign, verify that all line items have complete pricing data
- If the company logo does not appear, confirm it has been uploaded in Company Settings`,
      },
      {
        id: "web-orders-guide",
        title: "Web Orders",
        content: `## Overview

Web Orders processes orders placed through the public-facing website. When a customer completes a purchase on the website store, the order appears here for fulfillment processing.

## Order processing workflow

1. Review incoming orders in the Web Orders queue
2. Verify customer details, shipping address, and payment status
3. Confirm product availability and pricing accuracy
4. Process the order for fulfillment and update the status accordingly
5. Track shipping and delivery through the integrated tracking system

## Pricing relationship

Web order pricing is determined by the Price Catalog, not by pricelists. This is a critical distinction — changing a pricelist does not affect website prices unless the system has been explicitly configured to use the pricelist as the website pricing source.`,
      },
      {
        id: "rx-orders-guide",
        title: "RX Orders",
        content: `## Overview

RX Orders handles prescription lens orders submitted through the RX order form. This is the primary channel for optical professionals to place custom lens orders with specific prescription parameters.

## Order form workflow

1. Select the patient and practitioner details
2. Choose the lens design, material, and index from web-enabled catalog items
3. Enter the full prescription including sphere, cylinder, axis, addition, and prism values
4. Select coatings, treatments, and add-ons from the available options
5. Review the order summary including pricing, estimated delivery, and special instructions
6. Submit the order for laboratory processing

## Which lenses appear on the RX order form

Only lenses with the Web flag enabled in the Product Catalog appear as selectable options on the RX order form. This ensures that only currently available and approved products can be ordered.`,
      },
    ],
  },
  {
    id: "contacts-app",
    icon: Users,
    title: "Contacts App",
    articles: [
      {
        id: "contacts-management",
        title: "Contact Records Management",
        content: `## Overview

The Contacts page is the master directory for all business relationships. It stores both company and individual contact records with detailed information including location, communication details, and classification data.

## Contact types

- **Company** contacts represent business entities such as optical retailers, clinics, and wholesale distributors
- **Individual** contacts represent people within those organisations such as optometrists, dispensers, and practice managers
- Individual contacts can be linked to company contacts through the parent relationship

## Key contact fields

- **Name and business name** for identification
- **Email, phone, and website** for communication
- **Country, state, and city** using constrained dropdown selections where the state and city options are filtered based on the selected country
- **Industry** classification using values from the Industries Config
- **Tags** for segmentation and campaign targeting
- **Lead source and lead score** for tracking acquisition channel and qualification level
- **Pipeline stage** indicating the current sales relationship status
- **Integration sync status** showing whether the contact is synchronised with external systems

## Creating and editing contacts

- Click the Add Contact button to create a new record
- Fill in the required fields including name, type, and country
- Apply tags for segmentation and classification
- Link individual contacts to their parent company where applicable
- Use the edit dialog to update any contact field, with location dropdowns constrained by the selected country

## Contact archiving

Contacts can be archived rather than deleted to preserve historical data integrity. Archived contacts do not appear in standard views but remain accessible through filtered searches.`,
      },
      {
        id: "tags-config-guide",
        title: "Contact Tags Configuration",
        content: `## Overview

Contact Tags provide a flexible classification system for segmenting and organising contacts. Tags are organised by category and support colour coding for visual identification.

## Managing tags

- Create new tags with a name, category, and colour
- Edit existing tags to update their properties
- Tags are applied to contacts through the contact edit dialog
- Multiple tags can be assigned to a single contact for multi-dimensional classification

## Tag categories

Tags are grouped into categories to maintain organisational clarity. Common categories include:

- Customer type such as retail, wholesale, or lab partner
- Service level such as premium, standard, or basic
- Geographic region for territory management
- Campaign targeting for marketing segmentation

## Impact on other modules

Tags assigned to contacts flow through to the Leads and CRM modules, enabling targeted filtering, campaign selection, and pipeline reporting based on tag classifications.`,
      },
      {
        id: "industries-config-guide",
        title: "Industries Configuration",
        content: `## Overview

The Industries Configuration page maintains the lookup table of industry classifications applied to contact records. Standardising industry values ensures consistent reporting and segmentation across the platform.

## Managing industries

- Add new industry entries with a name and optional description
- Edit existing entries to correct naming or merge duplicates
- Deactivate obsolete industries rather than deleting them to preserve historical contact associations
- Industry values appear in the contact edit dialog as a selectable dropdown

## Why industry standardisation matters

Consistent industry classification enables accurate pipeline reporting by market segment, targeted lead finder searches, and reliable campaign audience selection. Before launching any regional campaign, review and normalise industry values to ensure accurate targeting.`,
      },
    ],
  },
  {
    id: "leads-app",
    icon: Search,
    title: "Leads App",
    articles: [
      {
        id: "lead-finder-playbook",
        title: "Lead Finder",
        content: `## Overview

Lead Finder is an intelligent prospecting tool that discovers potential business customers using multi-provider intelligence searches. It aggregates data from business directories, social media platforms, and mapping services to build comprehensive prospect profiles.

## How to search

1. Enter your search criteria including business type, location, and keywords
2. Select the geographic area and radius for the search
3. Run the search to query multiple data providers simultaneously
4. Review the returned results with enriched data including business name, address, phone, website, social media presence, and customer reviews

## Understanding search results

Each result includes intelligence gathered from available providers:

- **Google Places** data including ratings, review counts, and business hours
- **Social media** presence including Instagram handles and Facebook pages
- **Business directory** listings with contact details and categorisation
- **AI intent scoring** that estimates the likelihood of the prospect being a viable customer

## Saving and qualifying leads

- Click to save promising results to your My Leads queue
- Each saved lead receives an initial score based on the available intelligence data
- Review and adjust scores manually as you gather additional qualification information

## Graceful degradation

If the intelligence service is temporarily unavailable, Lead Finder displays a clear warning and continues to function with cached data. Search operations handle failures gracefully and report controlled error messages rather than crashing.`,
      },
      {
        id: "my-leads-guide",
        title: "My Leads Management",
        content: `## Overview

My Leads is your personal lead qualification workspace. It contains all leads you have saved from Lead Finder or created manually, and serves as the staging area before converting qualified prospects to CRM opportunities.

## Lead lifecycle

1. **New** — A freshly saved or manually created lead
2. **Contacted** — Initial outreach has been made
3. **Qualified** — The lead has been assessed and meets targeting criteria
4. **Converted** — The lead has been promoted to a CRM opportunity
5. **Disqualified** — The lead does not meet criteria and has been removed from active pursuit

## Lead scoring

Each lead has a numeric score based on multiple factors including:

- Business size and type relevance
- Online presence strength
- Geographic fit
- Engagement response history
- AI intent analysis from available intelligence data

## Converting to CRM

When a lead is fully qualified, use the Save to CRM action to create a new contact and opportunity record in the CRM pipeline. The conversion process transfers all lead data including contact details, scoring history, and activity notes.`,
      },
      {
        id: "campaigns-guide",
        title: "Campaigns and Sequences",
        content: `## Overview

Campaigns and Sequences organises structured outreach programs targeting qualified leads. Each campaign consists of a sequence of communication steps executed over a defined timeline.

## Creating a campaign

1. Define the campaign name, target audience criteria, and timeline
2. Build the outreach sequence with steps for email, WhatsApp, social media, and phone touchpoints
3. Assign leads to the campaign based on tag, industry, or geographic filters
4. Activate the campaign to begin the sequence execution

## Sequence builder

The sequence builder allows you to design multi-step outreach workflows:

- Define the channel for each step such as email, WhatsApp, LinkedIn, or phone
- Set timing delays between steps
- Create message templates with personalisation variables
- Configure follow-up conditions based on response status

## Compliance

All campaign activities must comply with the lead targeting policy. The system enforces guardrails around contact frequency, opt-out handling, and data usage to prevent compliance violations.`,
      },
      {
        id: "lead-reports-guide",
        title: "Lead Audit Reports",
        content: `## Overview

Lead Audit Reports provides analytical views of lead generation performance, conversion rates, and compliance metrics. Use these reports to evaluate the effectiveness of prospecting activities and identify areas for improvement.

## Available report views

- **Source performance** — Tracks which lead sources generate the highest quality prospects
- **Conversion funnel** — Visualises the progression from new leads through qualification to CRM conversion
- **Activity compliance** — Monitors adherence to targeting policies and contact frequency limits
- **Team performance** — Compares lead generation and conversion metrics across team members`,
      },
      {
        id: "ai-assistant-workflow",
        title: "AI Assistant and Campaign Assets",
        content: `## Overview

The AI Assistant generates professional outreach content for lead nurturing campaigns. It creates contextually relevant copy for email, WhatsApp, social media, and other communication channels.

## How to use

1. Provide the account context including business type, size, and current relationship status
2. Describe the target persona such as practice owner, dispenser, or purchasing manager
3. Select the communication channel and desired tone
4. Generate outreach copy and review the output
5. Edit the generated content for compliance, accuracy, and brand tone
6. Publish the approved assets into your campaign workflow

## Important guardrails

- Always human-review generated copy before sending to any customer or prospect
- Verify that product claims and pricing references are current and accurate
- Ensure the tone matches your brand guidelines and is appropriate for the target audience
- Check that any generated statistics or performance claims are verifiable`,
      },
      {
        id: "lead-settings-guide",
        title: "Lead Settings",
        content: `## Overview

Lead Settings configures the rules, policies, and parameters that govern lead generation and qualification across the platform.

## Configurable settings

- **Scoring rules** — Define the weight and criteria used to calculate lead scores
- **Targeting policies** — Set geographic, industry, and business type filters for lead finder searches
- **Compliance guardrails** — Configure contact frequency limits, opt-out handling procedures, and data retention policies
- **Integration settings** — Manage connections to external intelligence providers and data sources
- **Default assignments** — Set the default team member or queue for newly created leads`,
      },
    ],
  },
  {
    id: "crm-app",
    icon: Target,
    title: "CRM App",
    articles: [
      {
        id: "crm-dashboard-guide",
        title: "CRM Dashboard",
        content: `## Overview

The CRM Dashboard provides an at-a-glance view of sales performance, pipeline health, and team activity. It is the recommended starting point for each workday.

## Dashboard components

- **KPI cards** display key metrics including total pipeline value, deals won this period, conversion rate, and average deal size
- **Pipeline funnel** visualises the distribution of opportunities across pipeline stages
- **Revenue trends** chart shows sales performance over time with period-over-period comparison
- **Overdue activities** alert highlights tasks and follow-ups that have passed their due date

## Using the dashboard effectively

- Check the overdue activities section first each morning to identify urgent follow-ups
- Use the pipeline funnel to spot bottlenecks where deals are stalling
- Compare current KPIs against previous periods to track improvement trends
- Drill into specific metrics by clicking through to the Pipeline or Activities pages`,
      },
      {
        id: "pipeline-guide",
        title: "CRM Pipeline Management",
        content: `## Overview

The Pipeline page visualises all active opportunities across customisable stages. It provides a Kanban-style board for managing deal progression from initial qualification through to closure.

## Pipeline stages

Opportunities move through sequential stages that represent their position in the sales cycle. Common stages include:

- **New** — Initial opportunity identified
- **Qualification** — Assessing fit and requirements
- **Proposal** — Preparing or presenting an offer
- **Negotiation** — Terms discussion and pricing alignment
- **Won** — Deal successfully closed
- **Lost** — Opportunity did not convert

## Managing opportunities

- Create new opportunities from the Pipeline page or by converting qualified leads
- Update the stage by moving cards across columns or using the stage dropdown
- Add notes, activities, and follow-up tasks directly from the opportunity card
- Link opportunities to proposals and quotations for seamless document access
- Set expected close dates and deal values for pipeline forecasting

## Pipeline best practices

- Update stages immediately when an opportunity status changes to maintain accurate forecasting
- Never leave an opportunity without a scheduled next action
- Use the activity log to document every customer interaction
- Review stalled deals weekly and either advance them or mark them as lost`,
      },
      {
        id: "activities-guide",
        title: "CRM Activities",
        content: `## Overview

Activities tracks all customer interactions and follow-up tasks across the CRM. Every call, email, meeting, and task is logged with an owner, due date, and completion status.

## Activity types

- **Call** — Phone conversations with contacts
- **Email** — Email correspondence sent or received
- **Meeting** — In-person or virtual meetings
- **Task** — Internal action items related to an opportunity

## Creating activities

1. Navigate to Activities or open an activity from within an opportunity
2. Select the activity type and link it to a contact and optionally an opportunity
3. Add descriptive content summarising the interaction or task
4. Set a due date for follow-up actions
5. Mark activities as completed when finished

## Activity management tips

- Always set a due date when creating activities to prevent follow-ups from being forgotten
- Use the status filter to focus on overdue or pending activities
- Review completed activities before customer meetings to prepare context
- The CRM Dashboard highlights overdue activities so they can be addressed promptly`,
      },
    ],
  },
  {
    id: "helpdesk-app",
    icon: LifeBuoy,
    title: "Helpdesk App",
    articles: [
      {
        id: "helpdesk-tickets-workflow",
        title: "Helpdesk Tickets",
        content: `## Overview

The Tickets page is the primary workspace for managing support requests. Each ticket represents a customer inquiry, technical issue, or internal support need that requires tracking through to resolution.

## Creating a ticket

1. Click to create a new ticket
2. Enter the requester details, subject, and description
3. Set the priority level to determine SLA targets
4. Assign the ticket to a team based on the issue type
5. Set the initial stage such as New or In Progress

## Ticket lifecycle

Each ticket moves through defined stages from creation to closure:

- **New** — The ticket has been created but not yet triaged
- **In Progress** — Active work is being done to resolve the issue
- **Waiting** — The ticket is pending external input or customer response
- **Resolved** — The issue has been addressed and a solution provided
- **Closed** — The ticket has been verified as complete and archived

## SLA monitoring

Each ticket displays an SLA badge showing its current compliance status:

- **On Track** — The ticket is within its target resolution window
- **At Risk** — The ticket is approaching its SLA deadline
- **Breached** — The ticket has exceeded its SLA target and requires escalation

## Resolving tickets

1. Investigate and document the resolution steps
2. Update the stage to Resolved with resolution notes
3. Verify with the requester that the issue is fully addressed
4. Close the ticket when confirmation is received
5. Reopen if the resolution proves insufficient`,
      },
      {
        id: "helpdesk-teams-guide",
        title: "Helpdesk Teams",
        content: `## Overview

Teams organise support staff into functional groups aligned to service domains. Each team can have its own assignment mode, visibility settings, and SLA policies.

## Creating a team

1. Navigate to Teams and click to create a new team
2. Enter the team name and optional description
3. Select the assignment mode — manual assignment or automatic round-robin
4. Set the visibility to control whether the team appears in public ticket submission forms
5. Toggle active status to enable or disable the team

## Assignment modes

- **Manual** — Tickets are assigned to specific team members by a supervisor or the ticket creator
- **Round Robin** — Tickets are automatically distributed across team members in rotation

## Best practices

- Create separate teams for distinct service areas such as technical support, onboarding, and billing inquiries
- Keep team sizes manageable to ensure clear accountability
- Review team workload distribution regularly to prevent burnout and ensure balanced assignment`,
      },
      {
        id: "helpdesk-stages-guide",
        title: "Helpdesk Stages",
        content: `## Overview

Stages define the lifecycle phases that tickets move through from creation to closure. Each stage has configurable properties that control its behaviour in the ticket workflow.

## Stage properties

- **Name** — The display label for the stage
- **Sequence** — The order in which stages appear in the workflow
- **Is Closed** — Whether tickets in this stage are considered resolved
- **Is Folded** — Whether the stage column is collapsed by default in board views

## Default stages

The system includes a default set of stages that can be customised to match your support workflow. Additional stages can be added for specialised processes such as escalation queues or external vendor handoffs.`,
      },
      {
        id: "helpdesk-sla-guide",
        title: "SLA Policies",
        content: `## Overview

SLA Policies define the response and resolution time targets for support tickets. Policies can be scoped by priority level and team to create differentiated service commitments.

## Creating an SLA policy

1. Navigate to SLA Policies and click to create a new policy
2. Enter the policy name and description
3. Set the target hours for the resolution window
4. Optionally filter by priority level to apply different targets for urgent versus standard tickets
5. Optionally scope to a specific team for team-level SLA differentiation
6. Link the target stage that represents the SLA completion milestone
7. Activate the policy to begin enforcement

## SLA enforcement

Once activated, the system automatically tracks SLA compliance for matching tickets:

- A deadline is calculated when a ticket is created based on the matching SLA policy
- The ticket displays real-time SLA status as On Track, At Risk, or Breached
- SLA breach notifications appear in the notification bell for responsible team members
- Historical SLA performance data feeds into helpdesk reporting`,
      },
      {
        id: "helpdesk-config-guide",
        title: "Helpdesk Configuration",
        content: `## Overview

The Helpdesk Config page manages ticket types, tags, and general settings that apply across all helpdesk operations.

## Ticket types

Ticket types categorise support requests for routing and reporting. Common types include technical issue, feature request, billing inquiry, and onboarding assistance.

## Ticket tags

Tags provide flexible classification for tickets beyond the type and priority fields. Tags can be used for filtering, reporting, and identifying recurring issue patterns.

## General settings

- Configure default assignment rules for new tickets
- Set auto-response templates for ticket creation confirmations
- Define escalation paths for breached SLA tickets
- Manage notification preferences for team members`,
      },
    ],
  },
  {
    id: "website-app",
    icon: Globe,
    title: "Website App",
    articles: [
      {
        id: "content-governance",
        title: "Website Content Management",
        content: `## Overview

The Website Content Manager controls all public-facing content on the company website. It provides a structured workflow for drafting, reviewing, and publishing content across pages, articles, FAQs, and legal documents.

## Content types

- **Pages** — Core website pages including the homepage, about section, and service descriptions
- **Articles** — Blog posts and educational content about lenses, coatings, and optical technology
- **FAQs** — Frequently asked questions managed as individual content items with the FAQ category tag
- **Legal** — Privacy policy, terms of use, returns policy, and other compliance documents

## Content workflow

1. Draft or update content blocks using the rich text editor
2. Set the visibility level — Draft, Internal, Customer, or Public
3. Validate all claims, pricing references, and policy-sensitive language
4. Review formatting consistency including headings, spacing, and image placement
5. Publish the content and confirm it renders correctly on the live site
6. Log significant content changes in the release notes for team awareness

## Visibility levels

- **Draft** — Content is only visible to editors and administrators
- **Internal** — Content is accessible to all authenticated internal users
- **Customer** — Content is visible to external customer portal users
- **Public** — Content is published on the public website and accessible to everyone`,
      },
      {
        id: "feature-pages-guide",
        title: "Feature Pages",
        content: `## Overview

Feature Pages configures the product and service showcase pages on the website. These pages present lens types, coating technologies, and product benefits with rich media and structured content layouts.

## Page types

- **Lens pages** — Single vision, progressive, bifocal, anti-fatigue, and occupational lens showcases
- **Coating pages** — AR coatings, blue light filters, photochromic treatments, scratch resistance, and hydrophobic coatings
- **Brand pages** — Product line showcases for specific brands such as ZenVue
- **Material guides** — Lens material comparison pages including thickness charts and refractive index information

## Editing feature pages

Each feature page uses a consistent layout template with hero section, key features grid, detailed description, and call-to-action blocks. Content is managed through the Content Manager with context-specific editing access.`,
      },
      {
        id: "store-products-guide",
        title: "Store and Products",
        content: `## Overview

The Store and Products page manages the online store listing that customers browse on the public website. Products displayed here are sourced from the Product Catalog with pricing determined by the Price Catalog.

## Product management

- Products appear in the store when they are marked as active and web-enabled in the Product Catalog
- Store pricing is pulled directly from the Price Catalog — changing a pricelist does not affect store prices unless explicitly configured
- Product descriptions, images, and display order can be managed through this interface
- Category and filter configurations control how products are organised in the customer-facing store

## Pricing relationship reminder

This is a critical distinction in the platform — website and public store prices come from the Price Catalog only. Pricelists are used for wholesale and B2B customer-specific pricing. These are independent systems unless an administrator has explicitly enabled the pricelist-as-website-pricing-source setting.`,
      },
    ],
  },
  {
    id: "knowledge-app",
    icon: BookMarked,
    title: "Knowledge App",
    articles: [
      {
        id: "wiki-overview",
        title: "Overview: What this module does",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Overview
- **Build version:** {{release.semanticVersion}}

## What this module does
The Wiki module is the internal documentation control plane for operations teams. It unifies static handbook content, release ledger artifacts, and managed help articles in one editor + reader experience.

## Primary capabilities
1. Read baseline handbook content shipped with the application build.
2. Read and maintain database-backed help articles from the same workspace.
3. Search across article titles and bodies to resolve workflows quickly.
4. Maintain wiki headings/categories without code changes.
5. Use Help Assignments to map articles to route contexts so operators get page-level guidance.

## Governance scope
Use this module as the source of truth for runtime procedures, release communication, and route-level task guidance.`,
      },
      {
        id: "wiki-admin-capability-matrix",
        title: "Admin capability matrix (2026-03)",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Capability matrix
- **Build version:** {{release.semanticVersion}}

## Confirmed active admin surfaces
- Pricing: catalog, rx/stock/supplies pricing, supplier compare, publisher, costings, imports, settings
- Sales: proposals and quotations (web/rx order routes remain placeholders)
- Contacts: contacts + tag/industry configuration
- Leads: finder, my leads, campaigns, reports, AI assistant, settings
- CRM: dashboard, pipeline, activities
- Helpdesk: overview, tickets, teams, stages, SLA, config
- Website: content, portals, store (feature pages route currently placeholder-backed)
- Knowledge: wiki article management + help assignment mapping
- Settings: company, users, roles, audit, integrations, runtime errors

## Redirect and migration notes
1. Legacy/alias URLs should stay redirect-only.
2. Any new runtime page must ship with route registration and navigation placement.
3. Do not duplicate page implementations for aliases.

## Documentation update trigger
Update this matrix whenever a new admin runtime page becomes active, a placeholder route is implemented, or a canonical route changes.`,
      },
      {
        id: "wiki-first-run-setup",
        title: "First-run setup",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** First-run setup
- **Build version:** {{release.semanticVersion}}

## Setup checklist
1. Confirm your role can open both **Articles** and **Help Assignments** tabs.
2. Open **/admin/knowledge/wiki** and validate static categories load.
3. Validate managed categories/headings load from the database.
4. Test article search using a known route keyword (for example \`pricing/catalog\`).
5. Open **Help Assignments** and verify at least one route context has a mapped article.
6. Create a draft article and confirm it appears in filtered search results.
7. Confirm release-ledger articles (Release Notes, Changelog, Delivery Plan) render.

## Done criteria
Setup is complete when an operator can find a route article, open it, and confirm the same article is assigned as contextual help on its target route.`,
      },
      {
        id: "wiki-daily-workflow",
        title: "Daily workflow",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Daily workflow
- **Build version:** {{release.semanticVersion}}

## Daily operator routine
1. Start with latest release notes/changelog check.
2. Open route docs for today’s active tasks.
3. Execute procedures exactly as documented.
4. Flag stale content as soon as route behavior changes.
5. Capture end-of-day doc updates or open edit requests.

## Expected output
Operations stay consistent even when team members rotate coverage.`,
      },
      {
        id: "wiki-team-workflow",
        title: "Team workflow",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Team workflow
- **Build version:** {{release.semanticVersion}}

## Team operating model
1. Assign a documentation owner per module route family.
2. Review high-traffic docs in weekly team sync.
3. Triage update requests by business impact.
4. Require peer review before publishing major edits.
5. Announce meaningful documentation changes in release comms.

## Team standard
Treat workflow documentation defects like operational defects with explicit owner and SLA.`,
      },
      {
        id: "wiki-admin-workflow",
        title: "Admin workflow",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Admin workflow
- **Build version:** {{release.semanticVersion}}

## Admin responsibilities
1. Enforce least-privilege access for wiki editing.
2. Maintain category taxonomy and naming consistency.
3. Ensure required route docs exist for active modules.
4. Run periodic quality audits for stale or duplicate content.
5. Verify docs align with release-ledger updates.

## Governance rule
No critical workflow rollout should close until matching documentation is updated.`,
      },
      {
        id: "wiki-troubleshooting",
        title: "Troubleshooting",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Troubleshooting
- **Build version:** {{release.semanticVersion}}

## Common issues
### Missing categories or articles
- Confirm role permissions include wiki visibility.
- Check category-level visibility controls.

### Outdated content after release
- Compare article steps against latest release notes.
- Queue immediate revision for changed route behavior.

### Contextual help not showing on a page
- Validate route-to-context mapping exists.
- Ensure article contains matching context slug.

### Search returns incomplete results
- Add route keywords to article titles.
- Confirm content is saved under visible categories.`,
      },
      {
        id: "wiki-faq",
        title: "FAQ",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** FAQ
- **Build version:** {{release.semanticVersion}}

## Frequently asked questions
### Who can edit wiki docs?
Users with admin/content permissions for wiki management.

### Should every route have a dedicated article?
Yes for workflow routes; redirects/placeholders can share parent docs.

### How often should we review docs?
At minimum once per release cycle.

### How do we keep docs aligned with builds?
Update docs in the same release lane and cross-check release ledger artifacts.

### Can temporary instructions be published?
Yes, but mark as temporary and include explicit removal date.`,
      },
      {
        id: "wiki-best-practices",
        title: "Best practices",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Best practices
- **Build version:** {{release.semanticVersion}}

## Best practices
1. Keep one workflow objective per article.
2. Include explicit route path and role context.
3. Use numbered actions and short decision notes.
4. Keep troubleshooting steps concrete and testable.
5. Refresh high-impact docs every release, even if unchanged.

## Quality bar
A new operator should complete the workflow correctly without live coaching.`,
      },
      {
        id: "wiki-article-standard",
        title: "Help Article Formatting Standard",
        context_slugs: ["knowledge/wiki"],
        content: `## Metadata
- **Route segment:** /admin/knowledge/wiki
- **Article type:** Writing standard
- **Build version:** {{release.semanticVersion}}

## Required structure for every help article
1. **Purpose / Route**
2. **Step-by-step workflow**
3. **Use-case scenario**
4. **Best practices / guardrails**
5. **Troubleshooting** (when relevant)

## Formatting rules
- Use clear markdown headings (## / ###).
- Prefer numbered steps for procedural actions.
- Keep paragraphs short and operational.
- Avoid architecture-only text without user actions.

## Completion definition
An article is complete when a new operator can execute the workflow end-to-end without external coaching.`,
      },
    ],
  },
  {
    id: "settings-app",
    icon: Settings,
    title: "Settings App",
    articles: [
      {
        id: "company-settings-guide",
        title: "Company Settings",
        content: `## Overview

Company Settings configures the core business identity and operational defaults used throughout the platform. These settings affect document generation, pricing calculations, and system-wide display values.

## Business identity

- **Company name and slogan** — Used in headers, footers, and generated documents
- **Logo** — Uploaded image displayed on quotations, proposals, catalogs, and printed documents
- **Primary contact, email, telephone, and fax** — Contact information included in document templates

## Address configuration

The system maintains three address types:

- **Physical address** — The main business location
- **Billing address** — Used on invoices and financial documents, with an option to copy from the physical address
- **Shipping address** — Used for delivery documentation, with an option to copy from the physical address

Each address includes line fields, city, state or county, country, and postal code.

## Financial defaults

- **Tax TIN** — The tax identification number included on financial documents
- **Default VAT** — The standard value-added tax rate
- **Base currency** — The primary currency for all pricing and financial displays

## PDF document settings

- **PDF header HTML** — Custom HTML content rendered in the header area of generated PDF documents
- **PDF footer HTML** — Custom HTML content rendered in the footer area of generated PDF documents

## Feedback configuration

- **Feedback email** — The email address that receives help article feedback submissions from users`,
      },
      {
        id: "users-management-guide",
        title: "User Management",
        content: `## Overview

The Users page manages all user accounts with role assignments and access control. This is where administrators provision new users, modify existing roles, and manage account status.

## User roles

- **Admin** — Full control of all platform features, data, and configuration. Can see cost data and edit all records
- **Operator** — Day-to-day operational access including catalog management, imports, pricelist generation, and support workflows. Cost visibility is configurable by the administrator
- **Viewer** — Read-only internal access to product catalogs, lens prices, pricelists, and wiki articles. Cannot see cost data or edit any records
- **Customer** — External read-only access limited to specifically assigned pricelists. Cannot see cost data

## Adding a new user

1. Click the Add User button
2. Enter the user's name and email address
3. Select the appropriate role based on their job function
4. For Customer users, link them to an existing customer account
5. Save the user record — an invitation email will be sent

## Managing existing users

- Change a user's role by editing their record and selecting a new role from the dropdown
- Deactivate users who should no longer have access rather than deleting their accounts
- Review the user list periodically to ensure role assignments match current job responsibilities

## Security considerations

- Follow the principle of least privilege — assign the minimum role needed for each user's job function
- Audit role changes through the Audit Log to maintain a clear record of access modifications
- Customer users must always be tied to a customer record to ensure they only see their assigned pricelists`,
      },
      {
        id: "access-deployment-training-guide",
        title: "Access Deployment Training",
        content: `## Start in Contacts

Use **Deploy access** in Contacts to set up a customer portal login or an internal staff user. The assistant starts with a search by person, email, or Innovations account number, then shows the contact, customer account, and any existing login it found.

It never chooses an account or silently links a login. Select the right records before deployment.

## Customer portal access

1. Select the customer contact.
2. Choose **Customer portal** and select the primary customer account.
3. If a login already uses the contact email, choose **Link this login** or **Leave unchanged**.
4. If no login exists, send an invite or set a temporary password.
5. Approve portal access only after checking the customer link and email.

An unverified login can be prepared and linked, but access unlocks only after the person verifies their email. Assigned pricelist access also requires the Approved Access to Pricing tag, and statement access requires the Approved Access to Statement tag. CEO grants both.

## Internal staff access

Choose **Internal staff**, then explicitly select Admin, Operator, or Viewer. The assistant does not suggest a role because this is a business decision.

## Exceptions and safe escalation

Add a missing email in the contact before creating a login. When more than one account is found, choose the primary account yourself. If a contact and customer account are incompatible, correct the link first; do not force it.

Use **Access training** for sandbox practice and its Operations follow-up template. The template keeps the search, records found, missing decision, and attempted action together so another operator can resolve the case without repeating the investigation.

## Sync protection

Innovations sync can fill empty CRM fields. It must not overwrite a populated CRM contact field. Review the contact record when a synced value is missing or conflicts with an edited value.`,
      },
      {
        id: "roles-permissions-guide",
        title: "Roles and Permissions",
        content: `## Overview

The Roles and Permissions page defines granular feature-level access control for each role. It provides a matrix view showing which features each role can access, edit, or administer.

## Permission grid

The permission grid displays all platform features as rows and all roles as columns. Each intersection shows the access level granted:

- **View** — The user can see the feature and its data but cannot make changes
- **Edit** — The user can modify data within the feature
- **Admin** — The user has full control including configuration and management actions
- **None** — The feature is completely hidden from the user

## Configuring permissions

- Administrators can adjust the permission grid to customise access for each role
- Changes take effect immediately for all users with the affected role
- The system enforces permissions at both the interface level and the database level through row-level security policies

## Cost visibility

Cost data visibility is a special permission that can be toggled independently:

- Administrators always see cost data
- Operators can see cost data by default, but administrators can toggle this off
- Viewers and Customers never see cost data regardless of any other settings`,
      },
      {
        id: "audit-log-guide",
        title: "Audit Log",
        content: `## Overview

The Audit Log provides a chronological record of all significant data changes across the platform. Every create, update, and delete operation is logged with details about who made the change, when it occurred, and what data was affected.

## Audit log entries

Each entry records:

- **Timestamp** — When the change occurred
- **User** — Who performed the action
- **Table** — Which data table was affected
- **Action** — Whether the operation was a create, update, or delete
- **Record ID** — The identifier of the affected record
- **Old data** — The state of the record before the change
- **New data** — The state of the record after the change
- **Change summary** — A concise description of what changed
- **Reason** — An optional explanation provided by the user for the change

## Using the audit log

- Filter by action type to focus on creates, updates, or deletes
- Search by user to review a specific person's changes
- Expand any entry to see the full before and after data comparison
- Use the audit log for compliance reviews, change investigation, and troubleshooting

## Best practices

- Review the audit log weekly to catch unintended changes early
- Pay special attention to pricing changes, role modifications, and user management actions
- Use audit data to verify that bulk imports produced the expected results`,
      },
      {
        id: "integrations-guide",
        title: "Integrations and Sync Management",
        content: `## Overview

The Integrations page manages connections to external systems, synchronisation schedules, and sync job monitoring. It provides visibility into data flow between the platform and connected services.

## Integration connections

Each integration connection represents a link to an external system such as an ERP, accounting platform, or business directory service. Connections store:

- Connection name and provider type
- Authentication credentials and API endpoints
- Sync configuration including direction, frequency, and field mapping
- Current connection status and health metrics

## Sync job management

Sync jobs represent individual synchronisation operations. Each job tracks:

- **Status** — Queued, running, completed, failed, or cancelled
- **Records processed** — Count of pull and push records handled
- **Duration** — How long the sync operation took
- **Error summary** — Details of any failures encountered

## Cancelling sync jobs

If a sync job is running longer than expected or needs to be stopped:

- Click the Force Cancel button on any running or queued job
- The system will immediately mark the job as cancelled and stop processing
- Jobs that have been running for more than two hours are automatically failed by the system with a timeout error

## Monitoring sync health

- Review the sync job history to identify patterns of failures or slow performance
- Check the dead letter queue for records that failed to sync and require manual review
- Monitor the manual review queue for records with conflicts that need human resolution

## Troubleshooting sync issues

- If syncs consistently fail, verify that API credentials are still valid
- Check the error summary on failed jobs for specific error codes or messages
- Review the dead letter queue for patterns that indicate mapping or data quality issues
- Contact the integration provider if errors suggest service-side problems`,
      },
      {
        id: "runtime-errors-guide",
        title: "Runtime Error Monitoring",
        content: `## Overview

The Runtime Errors page displays application error logs captured during platform operation. It serves as a diagnostic tool for identifying and resolving stability issues.

## Error log entries

Each entry captures:

- **Timestamp** — When the error occurred
- **Error message** — The technical description of the failure
- **Component** — Which part of the application generated the error
- **Stack trace** — The technical execution path that led to the error
- **User context** — Which user was active when the error occurred

## Using runtime errors

- Review the error log regularly to identify recurring issues
- Group similar errors to understand patterns and prioritise fixes
- Use the error details to reproduce and debug specific issues
- Clear resolved errors to maintain a clean monitoring view

## When to escalate

Escalate runtime errors when:

- The same error appears repeatedly across multiple users
- Errors affect critical workflows such as order processing or pricing calculations
- Error frequency increases significantly over a short period
- Errors are accompanied by user-reported functionality failures`,
      },
    ],
  },
];
