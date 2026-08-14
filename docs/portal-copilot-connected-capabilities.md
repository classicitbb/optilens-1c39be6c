# Portal Copilot connected-capability map

The Portal Copilot uses one governed pattern for connected work:

1. Read a bounded snapshot from an existing application data path.
2. Pass that snapshot to a deterministic planner that separates evidence from inference.
3. Store proposed work as a Copilot run with pending actions.
4. Require an administrator to approve each action before an existing write boundary is called.

Models may classify a request or draft wording. They do not invent records, execute SQL, or bypass the action queue.

## Qualified CRM opportunity scan

This is the first connected vertical slice. The command **Scan CRM for lapsed buyers and qualified follow-up opportunities** reads:

- `contacts` for pipeline, stage, score, next-action date and business contact completeness;
- `customer_order_health` for last-order date, quiet days, observed order cadence and current health;
- `opportunities` to avoid suggesting duplicate active opportunities; and
- `activities` to suppress contacts already covered by open work.

The deterministic planner selects at most one highest-priority reason per contact: lapsed buyer, overdue next action, incomplete business contact details, or a progressed prospect with no active opportunity. Each proposal shows evidence, a separately labelled inference, priority, due date, recommended next action and optional outreach wording.

Preparing the scan does not create CRM work. Approval creates an existing `activities` task owned by the approving administrator. It never creates an `opportunities` row automatically.

## Pricing advisor seam

Customer list prices must be resolved through the assigned price-list path (`customers.assigned_pricelist_id` to `pricelist_versions` and its matrix allocations/views), not a generic product-price lookup. The existing pricing engine and `pricing_settings` own converted, landed and full-cost calculations, target margins and floor rules; saved quote lines provide frozen sell/base/landed-cost evidence where available.

A future pricing-advisor planner should return current price, known cost components, profit dollars, margin, configured safe floor and a target offer with evidence and assumptions. Missing cost or demand inputs must remain visibly unknown. Offers should default to controlled time or volume conditions. Any price-list change must be stored as a draft Copilot action and require explicit approval through the owning pricing workflow.

## Public-web CRM enrichment seam

Enrichment starts from a selected CRM contact/lead and only public company clues such as company name, domain and location. Proposed country, address, website, public business phone, public/general email and role findings need field-level before/after values plus source URL, retrieval date and confidence.

No existing field is overwritten during research. Review must support accepting fields individually, accepting all, or retaining findings only as sourced notes. Restricted or personal data is out of scope. The web-research adapter and durable field-proposal schema are intentionally not implemented by the first CRM slice; they must be added before enrichment can be enabled.

