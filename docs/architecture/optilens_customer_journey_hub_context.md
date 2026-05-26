# Optilens Customer Journey Hub — Project Context

Prepared for Classic Visions / Russell Hunte

## 1. Core business problem

Classic Visions needs to scale customer acquisition, customer onboarding, current customer re-onboarding, pricing delivery, document delivery, follow-up, and sales support without everything depending on Russell’s memory, judgment, and manual follow-up.

The current need is not simply “a CRM.” The need is an AI-guided business operating system for sales, customer activation, re-onboarding, pricing, documentation, and service readiness.

The system should help Classic Visions move from manual prospecting, manual pricing, manual emailing, manual WhatsApp follow-up, manual document sending, manual remembering of customer status, manual explanation of products, and manual reactivation of dormant customers to guided team execution, AI-assisted next steps, controlled pricing, tailored price list generation, customer launch rooms, document automation, team work queues, customer health monitoring, customer re-onboarding, and exception-based management.

The goal is for Classic Visions to spend less time running processes and more time delivering product, service, training, and relationship support.

## 2. Strategic principle

The system should not copy Outplay, HubSpot, Salesforce, or any other sales tool.

Those tools are built around sales activity: calls, emails, tasks, open rates, sequences, and pipelines.

Classic Visions should build around customer readiness.

The core question should always be: What does this prospect or customer need in order to be ready to order, reorder, grow, or receive service properly?

So the system should manage prospect readiness, new customer readiness, existing customer readiness, price list readiness, account readiness, credit/payment readiness, ordering readiness, training readiness, product expansion readiness, and reactivation readiness.

The system should quietly prepare the next step and bring the human in only when judgment, approval, relationship management, or service is required.

## 3. Working concept name

Possible names:

- Optilens Customer Journey Hub
- Optilens Sales Copilot
- Optilens Customer Launch Engine
- Classic Visions Customer Hub
- Optilens Growth Engine
- Classic Visions Commercial Operating System

Best current working name: Optilens Customer Journey Hub.

This name is broad enough to cover prospects, current customers, re-onboarding, pricing, customer launch rooms, documents, AI next steps, and team execution.

## 4. Main system idea

Every prospect and customer should have a living journey.

The system should know who they are, what country they are in, what type of optical business they run, what they are likely to need, what prices they are allowed to see, what documents they need, what stage they are in, what the team should do next, what the customer should receive next, what should be blocked, what requires approval, what can be automated, and what needs Russell or management review.

The system should then prepare the next best action, the correct email, the correct WhatsApp message, the correct price list, the correct documents, the correct follow-up task, the correct customer launch room, and the correct internal warning.

## 5. Key rule

Optilens owns the truth. External tools execute tasks.

Classic Visions should build and own customer data, prospect data, pricing logic, margin rules, customer-specific price lists, product catalogue logic, sales playbook, customer journey stages, re-onboarding workflows, credit/payment rules, quote logic, document package logic, approval gates, customer launch rooms, customer health scoring, AI recommendation logic, and audit history.

External APIs should only help with execution: email sending, WhatsApp messaging, payment links, accounting sync, shipping/tracking, scheduling, forms, analytics, error monitoring, AI text generation/classification, and automation glue.

External tools may act as arms and legs. They should not become the brain.

## 6. Cloud versus on-premise decision

The recommended architecture is cloud-first hybrid.

Do not run the whole system on-premise.

The main Optilens Customer Journey Hub should run in the cloud because it needs to serve customers across the Caribbean, provide customer launch rooms, send emails, handle forms, use AI APIs, connect to payment/shipping/email providers, allow team access from different locations, provide customer portal access, handle external webhooks, and scale without office-server exposure.

However, sensitive local/legacy systems such as Actian PSQL / Innovations can remain on-premise initially.

The best model is: cloud runs the customer journey, on-premise protects legacy operational data, and a controlled connector moves only the needed data.

### Recommended architecture

Cloud:

- Optilens web app
- Customer portal
- Launch rooms
- Sales cockpit
- Pricing engine
- Document generator
- Price list generator
- AI copilot
- Task queue
- Audit logs
- Email/API integrations
- Customer database
- Prospect database
- Document storage
- Analytics
- Error monitoring

On-premise:

- Actian PSQL / Innovations
- Legacy order/invoice data
- Internal operational records
- Local connector service

Connector:

- Outbound-only sync from office to cloud
- No public inbound access to the office database
- Only selected fields synced
- No direct exposure of Actian PSQL to the internet

This reduces the security burden while keeping the business safer.

## 7. Security model

The system should use controlled access, not blind trust.

Security rules:

- Every staff member has their own login.
- MFA should be required.
- Roles control what users can see and do.
- Customers only see their own information.
- Price list access is customer-specific.
- Price lists have version numbers and expiry dates.
- Every sent document is logged.
- Every generated price list is logged.
- Every AI recommendation is logged.
- Discounts below margin floor require approval.
- Credit terms require approval.
- Customers on credit hold cannot receive new credit offers.
- API keys are stored server-side only.
- No card information is stored by Classic Visions.
- AI does not get full database access.
- AI cannot invent prices, approve discounts, or promise credit/delivery terms.

The AI should assist. It should not control the business.

## 8. Core customer journeys

The system should manage three separate journeys.

### A. Prospect journey

For businesses that are not yet customers.

Stages:

- Lead identified
- Contact made
- Qualified
- Needs assessed
- Price list/catalogue sent
- Account application started
- Account approved
- Starter quote or trial order prepared
- First order placed
- First order delivered
- Second order follow-up
- Converted to active customer

Goal: turn interested businesses into approved, ordering customers.

### B. New customer journey

For customers recently approved or recently ordering.

Stages:

- Account approved
- Launch room created
- Portal access sent
- Price list delivered
- Ordering instructions sent
- First order placed
- Payment confirmed
- Shipment sent
- Delivery confirmed
- Feedback requested
- Second order requested
- Active buying routine established

Goal: make the customer comfortable and get the second order. The second order is the real proof of conversion.

### C. Current customer / re-onboarding journey

For existing customers.

Stages:

- Customer profile reviewed
- Contact details confirmed
- Price tier confirmed
- Portal access sent
- Updated price list generated
- Documents delivered
- Ordering process explained
- Product expansion opportunity identified
- Training opportunity identified
- Payment/credit status reviewed
- Follow-up scheduled
- Customer reactivated or expanded

Goal: reintroduce Classic Visions in a more organized, professional, and profitable way.

## 9. Customer launch rooms

This is one of the most important fresh ideas.

Instead of sending customers scattered emails, price lists, forms, and WhatsApp messages, each customer or prospect should receive a private Customer Launch Room.

A launch room is a personalized workspace inside Optilens.

It should contain:

- Welcome message
- Company introduction
- Customer-specific price list
- Relevant product categories
- Starter order recommendation
- Account application
- Credit application, if needed
- Payment instructions
- Shipping instructions
- Ordering guide
- Training material
- Product guides
- Support button
- Upload area
- Quote request
- Order request
- Status of onboarding/re-onboarding steps

The customer should feel:

- I know what Classic Visions offers.
- I know what prices apply to me.
- I know how to order.
- I know what documents I need.
- I know who to contact.
- I can start without waiting on Russell for every detail.

The customer launch room should vary by country, customer type, product interest, price sensitivity, relationship status, account status, credit/prepaid status, product history, and training needs.

## 10. Team-side experience

The team should not be forced to figure out the sales process manually.

The system should provide a Sales Command Center or Team Cockpit.

Each team member should see:

- Today’s work
- Customers needing response
- Prospects needing qualification
- Price lists ready for review
- Account applications incomplete
- Quotes awaiting follow-up
- Dormant customers needing reactivation
- Customers on credit hold
- High-value customers requiring Russell review
- Messages drafted and ready
- Documents ready to send
- Tasks overdue
- Follow-ups due today

The team should work from buttons, not blank fields.

Examples:

- Generate next step
- Send approved intro
- Generate customer price list
- Create launch room
- Send Optilens login
- Request account application
- Create trial order proposal
- Schedule follow-up
- Send payment reminder
- Mark not interested
- Escalate to Russell
- Move to reactivation campaign
- Log WhatsApp message
- Generate quote
- Approve and send package

This creates a minimum standard of execution across the team.

## 11. Guardrails for team execution

The system must prevent poor decisions.

Examples:

- A staff member should not send a full price list to a price-sensitive prospect when a starter list is better.
- A staff member should not send special pricing without approval.
- A staff member should not offer credit to a customer on credit hold.
- A staff member should not send outdated price lists.
- A staff member should not manually create prices outside the pricing engine.
- A staff member should not promise delivery timelines unless the system has approved information.
- A staff member should not send documents that do not match the customer’s country or customer type.

The system should show allowed actions, blocked actions, recommended action, reason, required approval, documents to send, documents not to send, and internal warnings.

## 12. AI copilot role

The AI should behave like a practical sales manager and assistant.

It should:

- Summarize the customer
- Classify prospects
- Recommend next actions
- Draft emails
- Draft WhatsApp messages
- Choose relevant document packages
- Suggest starter product bundles
- Identify missing information
- Flag credit or margin risk
- Suggest reactivation actions
- Suggest product expansion opportunities
- Prepare follow-up notes
- Summarize customer history
- Recommend whether Russell should handle something personally

It should not:

- Invent prices
- Change prices
- Approve discounts
- Approve credit
- Promise delivery dates
- Override account rules
- Send risky messages automatically
- Access more data than needed
- Use old price lists as current truth

The AI should work from approved data and rules.

## 13. Pricing engine

This must be built inside Optilens.

The pricing system should know:

- Supplier
- Brand
- Material
- MF Type
- Lens Type
- Option
- Finish Type
- Cost USD
- Wholesale price
- Customer-specific price
- Product tier
- Country availability
- Stock/special order
- Minimum margin
- Freight rules
- Duty/VAT assumptions
- Add-on rules
- AR/coating add-ons
- Surfacing fees
- Edging fees
- Training/service charges, if applicable
- Customer price tier
- Special pricing
- Quote expiry
- Price list version
- Approval status

Your normalized lens/pricelist structure should be the foundation:

Supplier | Brand | Material | MF Type | Lens Type | Option | Finish Type | Cost (USD)

The system can be refined later, but this is the default starting point.

Important rule: AI may explain the price list. The pricing engine must calculate the prices.

## 14. Tailored price list generator

The system should generate customer-specific price lists.

It should ask:

- Who is the customer?
- What country are they in?
- What type of optical business are they?
- What products are relevant?
- Are they budget, mid-market, premium, or mixed?
- Are they approved, pending, or prospect?
- Are they prepaid or credit?
- Do they need stock lenses, surfaced lenses, supplies, training, or starter products?
- What price tier are they allowed to see?
- What margin floor applies?

The generated price list should include:

- Customer name
- Country
- Date generated
- Valid until date
- Product sections relevant to that customer
- Currency
- Price tier
- Ordering notes
- Payment terms
- Shipping notes
- Contact details
- Optional starter order recommendation
- Terms and conditions

Internally, the system should store:

- Price list version
- Cost version
- Margin at time of issue
- Who generated it
- Who approved it
- When it was sent
- Which products were included
- Customer ID
- Expiry date

This prevents confusion months later.

## 15. Document library

Optilens should include an approved document library.

Documents may include:

- Company profile
- Why Classic Visions
- Account application
- Credit application
- Terms and conditions
- Payment instructions
- Shipping policy
- Ordering guide
- Optilens portal guide
- Starter order guide
- Lens catalogue
- Budget lens starter list
- Premium lens guide
- Photochromic lens guide
- Progressive lens guide
- Surfacing lens supply guide
- Lab supplies sheet
- Training offer
- Strategic dispensing training document
- Country-specific introduction sheet
- Reactivation customer message
- Customer statement explanation
- Quote template
- Price list templates
- WhatsApp templates
- Email templates

Documents should be tagged by customer stage, customer type, country, product interest, price tier, risk level, and approval requirement.

The AI should choose from approved documents, not create uncontrolled documents from scratch.

## 16. Customer re-onboarding module

Current customers should not just receive a generic notice.

They should be re-onboarded according to their status.

Customer statuses:

- Active
- Active but underdeveloped
- Inactive
- Dormant
- High potential
- Credit watch
- Needs portal setup
- Needs price review
- Needs training
- Needs product expansion
- Re-onboarding complete

For each current customer, the system should assess:

- Last order date
- Order frequency
- Average monthly value
- Gross margin
- Payment reliability
- Product range
- Responsiveness
- Strategic value
- Portal adoption
- Credit status
- Training opportunity
- Growth opportunity

Then it should recommend:

- Send updated price list
- Send Optilens portal invitation
- Send reorder guide
- Offer training
- Suggest product expansion
- Request payment
- Move to prepaid
- Escalate to Russell
- Send reactivation message
- Generate customer launch room

## 17. Customer health score

Every customer should have a health score.

Factors:

- Order recency
- Order frequency
- Sales value
- Gross margin
- Payment behavior
- Product range
- Growth potential
- Responsiveness
- Portal usage
- Strategic importance
- Credit risk

Classifications:

- Healthy
- Needs attention
- Growth opportunity
- At risk
- Credit hold
- Dormant

This gives management a simple daily view.

## 18. Prospect scoring

Prospects should be scored by:

- Country opportunity
- Number of branches
- Estimated volume
- Business type
- Product fit
- Known pain point
- Likelihood of switching
- Responsiveness
- Relationship warmth
- Price sensitivity
- Strategic value
- Urgency
- Credit risk

Simple categories:

- A — Russell or senior person should handle
- B — team follow-up
- C — automated nurture
- D — low priority unless they engage

This prevents equal time being wasted on unequal opportunities.

## 19. Sales/re-onboarding campaigns

The system should support campaigns.

Examples:

- New Jamaica prospect campaign
- Dormant customer reactivation campaign
- Active customer portal migration campaign
- Premium lens education campaign
- Photochromic/AR expansion campaign
- Lab supplies campaign
- Credit cleanup campaign
- New customer second-order campaign
- St. Lucia photochromic strategy campaign
- Dominica ordering/logistics campaign
- Jamaica budget starter campaign

Each campaign should define:

- Target customers
- Stage
- Message sequence
- Documents
- Price list type
- Follow-up timing
- Owner
- Success metric
- Blocked conditions
- Approval requirements

## 20. External APIs and free/low-cost services

At low usage, Classic Visions can start with mostly free or low-cost services.

The recommended approach:

- Use free tiers to validate the workflow.
- Do not scatter the business across many tools.
- Keep all key records in Optilens.
- Use APIs only through connectors.
- Log every external action.
- Have fallback/manual options.
- Upgrade only when the workflow proves value.

### Recommended early stack

Frontend / hosting:

- Cloudflare Pages or Vercel

Backend / database / auth / storage:

- Supabase

Email:

- Resend for transactional/system emails
- Microsoft Graph for Outlook mailbox sending/reply tracking, if using Microsoft 365
- Gmail API only if Google Workspace is used

Forms:

- Tally for quick public forms
- Native Optilens forms later

Automation:

- Make.com for early low-volume workflow glue
- Activepieces later if you want open-source/self-hostable automation
- Avoid making Zapier/Make the core business process

AI:

- Gemini API for free/low-usage classification, drafting, summaries, embeddings
- OpenAI as a paid premium fallback where needed

Analytics:

- PostHog

Error monitoring:

- Sentry

Scheduling:

- Cal.com

WhatsApp:

- Manual/click-to-send in Phase 1
- WhatsApp Business API later

Payments:

- Manual payment links/upload proof first
- Payment gateway integration later
- Possible providers to evaluate: Powertranz, First Atlantic Commerce, WiPay, Stripe only if region/support works properly

Shipping:

- Manual tracking first
- Courier API integration later

Accounting:

- Manual export first
- QuickBooks integration later

Maps:

- Avoid at first unless needed
- Manual territory/country fields are enough for Phase 1

## 21. Free-first API strategy

The system should be designed so that external APIs are replaceable.

For each provider, create a connector layer.

Examples:

- EmailConnector
- WhatsAppConnector
- PaymentConnector
- AccountingConnector
- ShippingConnector
- AIConnector
- FormsConnector
- AnalyticsConnector
- LegacyDataConnector

The core Optilens app should not be hard-wired to one vendor.

For example, the system should say sendTransactionalEmail(), not sendResendEmailOnlyForever().

This lets you replace Resend with another provider later.

## 22. Integration context cards

For every API, prepare a small context card before asking an AI code builder to integrate it.

Each card should include:

- Provider name
- Purpose in Optilens
- Free-tier limit or expected usage
- Production or prototype?
- Authentication method
- Required environment variables
- API documentation link
- Webhook events needed
- Data sent to provider
- Data received from provider
- Tables affected in Optilens
- Security concerns
- Fallback if API fails
- Human approval required?
- Test account available?
- Sample request payload
- Sample response payload
- Error handling rules
- Rate-limit behavior
- Logging requirements

This prevents AI builders from guessing and building weak integrations.

## 23. Example integration cards

### Resend

Purpose: send transactional Optilens emails such as portal invitations, price list links, password resets, document notifications, and follow-up reminders.

Expected usage: low at first, likely under 100 emails/day.

Rules:

- Only approved documents and approved price list versions can be sent.
- Every sent email must be logged.
- Failed emails create a manual follow-up task.
- Special pricing emails require approval.

Environment variables:

- RESEND_API_KEY
- RESEND_FROM_EMAIL
- RESEND_REPLY_TO_EMAIL

Affected tables:

- email_logs
- customer_timeline
- customer_documents
- follow_up_tasks

### Microsoft Graph

Purpose: send emails from Classic Visions Outlook/Microsoft 365 mailboxes and optionally detect replies.

Rules:

- Use least-privilege permissions.
- Store OAuth tokens securely.
- Do not send unapproved price-sensitive emails.
- Inbound replies should attach to the customer timeline where possible.

Environment variables:

- MS_CLIENT_ID
- MS_CLIENT_SECRET
- MS_TENANT_ID
- MS_REDIRECT_URI
- MS_SENDER_MAILBOX

Affected tables:

- email_logs
- customer_timeline
- follow_up_tasks
- communication_threads

### Gemini AI

Purpose: classify prospects, summarize customer records, recommend next actions, draft emails/WhatsApp messages, suggest document packages, and flag missing data.

Rules:

- AI must not invent prices.
- AI must not approve credit.
- AI must not change discounts.
- AI must not promise delivery.
- AI should receive minimum necessary customer context.
- AI-generated customer-facing text should require review at first.

Environment variables:

- GEMINI_API_KEY
- GEMINI_MODEL_DEFAULT
- GEMINI_EMBEDDING_MODEL

Affected tables:

- ai_recommendations
- customer_timeline
- next_actions
- draft_messages

### Tally

Purpose: quick external forms for prospect intake, account application, credit request, re-onboarding survey, and training requests.

Rules:

- Form submission creates a review task.
- No account is auto-approved from form submission.
- Webhook payloads must be validated.
- All submissions should map to customers/prospects.

Affected tables:

- prospects
- customers
- account_applications
- customer_timeline
- follow_up_tasks

### PostHog

Purpose: track portal usage, customer engagement, launch room views, price list downloads, form starts, form completions, and team activity.

Rules:

- Do not send sensitive financial or private data into analytics.
- Use customer/account IDs rather than excessive personal details.

Affected areas:

- launch rooms
- portal events
- user engagement
- conversion tracking

### Sentry

Purpose: error monitoring.

Rules:

- Use from day one.
- Do not log API keys, passwords, customer-sensitive payloads, or price tables in error reports.

## 24. MVP build recommendation

Do not start by building everything.

Start with the core system that proves the workflow.

### Phase 1 — Core Optilens brain

Build:

- Customer database
- Prospect database
- Customer profile pages
- Prospect profile pages
- Customer journey stages
- Prospect journey stages
- Re-onboarding status
- Price tier assignment
- Product/pricing database
- Basic price list generator
- Document library
- Customer launch rooms
- Next action engine
- Team cockpit
- Follow-up tasks
- Customer timeline
- Role permissions
- Audit logs
- Manual WhatsApp logging
- Manual payment tracking
- Basic AI drafting/classification
- Basic email sending
- Basic forms intake

Do not yet build:

- Full WhatsApp API
- Full payment gateway
- Full shipping integration
- Full QuickBooks sync
- Complex AI research
- Full automation of sending
- Advanced maps/geocoding
- Deep legacy system integration

### Phase 2 — Integrations

Add:

- Microsoft Graph or Gmail email integration
- Resend transactional emails
- Tally webhooks
- Gemini AI integration
- PostHog analytics
- Sentry monitoring
- Cal.com scheduling links
- Make.com or Activepieces workflow glue
- Basic Actian/Innovations outbound sync
- Generated PDFs/Excel price lists
- Customer portal invitations

### Phase 3 — Controlled automation

Add:

- Auto-generate launch room packages
- Auto-generate price list packages
- Auto-create follow-up tasks
- Auto-send low-risk messages
- Auto-escalate high-value/risky accounts
- Auto-detect inactive customers
- Auto-suggest product expansion
- Auto-suggest second-order follow-up
- AI customer summaries
- AI meeting-note processing
- Manager approval workflows

### Phase 4 — Deeper business integration

Add:

- WhatsApp Business API
- Payment gateway webhooks
- QuickBooks sync
- Shipping/tracking API
- Advanced customer health scoring
- Margin-aware quote builder
- Inventory-aware recommendations
- Customer-specific reorder suggestions
- Full legacy system connector
- AI knowledge base trained on Classic Visions documents
- Customer self-service ordering
- Statements/invoices in portal

## 25. Suggested database modules

The first build should probably include these major tables/modules:

- Users
- Roles
- Permissions
- Customers
- Prospects
- Contacts
- CustomerBranches
- CustomerStages
- ProspectStages
- CustomerHealthScores
- CustomerPriceTiers
- Products
- Suppliers
- Brands
- Materials
- MFTypes
- LensTypes
- LensOptions
- FinishTypes
- ProductPrices
- PriceVersions
- CustomerPriceLists
- GeneratedPriceLists
- Documents
- DocumentPackages
- CustomerLaunchRooms
- Quotes
- QuoteLines
- Tasks
- FollowUps
- CustomerTimeline
- Emails
- WhatsAppLogs
- FormsSubmissions
- AccountApplications
- CreditApplications
- Approvals
- AIRecommendations
- AIDrafts
- AuditLogs
- IntegrationLogs
- SyncLogs

Start simple. Expand gradually.

## 26. AI code builder high-level instruction

Build Optilens Customer Journey Hub as the source of truth for Classic Visions’ prospect management, customer re-onboarding, pricing delivery, document packages, customer launch rooms, and team sales execution.

The system must not be a generic CRM. It must guide the team through the correct next action for each prospect or customer.

Core principle: Optilens owns customers, pricing, quotes, documents, stages, approvals, tasks, and audit history. External APIs only execute specialized actions such as email, forms, AI drafting, analytics, scheduling, payments, shipping, or accounting sync.

The system must include prospect profiles, customer profiles, journey stages, health scores, next-best-action recommendations, customer launch rooms, price list generation, document library, team cockpit, follow-up tasks, AI-assisted drafting, and audit logs.

AI must not invent prices, approve discounts, approve credit, change payment terms, or promise delivery dates. Prices must come from the structured pricing database and pricing engine only.

Every generated price list must store customer ID, price version, products included, validity date, generated by, approval status, and sent timestamp.

Every customer-facing message or document package must be logged to the customer timeline.

The system should support low-cost/free-tier integrations through replaceable connectors, beginning with Supabase, Cloudflare Pages or Vercel, Resend, Microsoft Graph or Gmail API, Tally, Gemini API, PostHog, Sentry, and Cal.com.

WhatsApp, payments, shipping, QuickBooks, and deeper legacy integrations should be designed as future connectors, not hard-coded dependencies.

The user experience should be simple enough for the team to operate with minimal judgment errors. Staff should see recommended actions, allowed actions, blocked actions, required approvals, prepared messages, documents to send, and follow-up tasks.

Customer-side experience should be through personalized launch rooms where customers receive everything needed to get started: welcome message, price list, product guide, account form, payment instructions, shipping instructions, ordering guide, training resources, and support contact.

The first build should focus on the core workflow, not full automation.

## 27. Where to begin

The best starting point is not APIs. It is the data model and workflow model.

### Step 1: Define the customer/prospect stages

Create the exact stages for prospects, new customers, current customers, dormant customers, and credit-risk customers.

### Step 2: Build the customer/prospect profile

Each customer/prospect needs:

- Business name
- Country
- Contact person
- Email
- WhatsApp
- Customer type
- Branches
- Stage
- Price tier
- Product interest
- Credit status
- Last contact
- Next action
- Owner
- Notes
- Documents sent
- Price lists sent
- Order history summary
- Payment status summary

### Step 3: Build the product/pricing database

Use the existing normalized structure:

Supplier | Brand | Material | MF Type | Lens Type | Option | Finish Type | Cost (USD)

Then add:

- Selling price
- Price tier
- Product tier
- Margin floor
- Customer-specific price
- Validity date
- Status
- Notes

### Step 4: Build the next-action engine

Start rule-based before making it highly AI-driven.

Examples:

- If prospect country = Jamaica and price sensitivity = high, recommend budget starter package.
- If customer has no order in 90 days, recommend reactivation package.
- If customer has overdue balance, block new credit offer.
- If customer has no portal login, recommend Optilens launch room invitation.
- If first order delivered but no second order, create second-order follow-up task.

### Step 5: Build customer launch rooms

This gives immediate practical value.

Launch rooms should show:

- Customer-specific welcome
- Price list
- Documents
- Ordering guide
- Support contact
- Next steps
- Forms
- Training resources

### Step 6: Add AI drafting

Use AI only after the system knows customer type, stage, country, allowed price list, allowed documents, next action, and restrictions.

Then AI drafts the email/WhatsApp message.

### Step 7: Add low-cost integrations

Add Resend or Microsoft Graph for email. Add Tally for forms. Add Gemini for AI. Add PostHog for analytics. Add Sentry for errors. Add Cal.com for scheduling.

## 28. Final strategic summary

Classic Visions should build a cloud-first, AI-guided customer operating system inside Optilens.

The system should help the whole team manage prospects and current customers with clear guidance, controlled pricing, prepared documents, tailored price lists, customer launch rooms, and next-best-action workflows.

It should not be a generic CRM and should not depend on Russell’s memory.

The system should be cloud-first, hybrid where needed, AI-assisted, rules-controlled, team-safe, customer-friendly, API-connected, free-tier-friendly at the start, built around Classic Visions’ pricing and customer journey, and designed to scale across the Caribbean.

The simplest way to describe the entire vision is:

Prospect or customer enters Optilens → system classifies them → system determines readiness gaps → system recommends next action → system prepares the right price list, message, documents, and launch room → team approves/responds → customer gets everything needed to move forward → system tracks the result and recommends the next step.

That is the foundation to begin building.
