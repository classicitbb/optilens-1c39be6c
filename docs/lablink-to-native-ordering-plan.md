# Native ordering across the website

Status: Plan only — implementation and release have not started.

## Intended customer journey

| Customer need | Primary path | Website language |
|---|---|---|
| Made-to-order prescription lenses, including surfacing, edging, coatings and frame details | Sign in or sign up, then `/profile/rx-order` | “Order custom lenses with the Rx Order Form” |
| Stock lenses, supplies, accessories, and other catalogued products | `/store` and its product/cart/checkout flow | “Shop the store” |
| Drafts and placed orders | `/profile/drafts` and `/profile/orders` | “Continue an Rx draft” and “View my orders” |
| Returns, remakes, delivery questions | Existing support/returns forms and order history | “Use your order number to request help” |

The public site should present the Rx Order Form and Store as the two clear ordering actions in the header, home page, Professionals hub, lens/product pages, service pages, footer, and relevant calls to action. A signed-out custom-lens action should return to the Rx form after authentication. Store calls to action should never send a stock lens or supply shopper into an Rx form. Preserve the existing distinction between a saved draft, an Rx quote, checkout, and a submitted order; do not promise instant submission, live production status, prices, trace support, or delivery times beyond what the active flow proves.

## Access and order ownership

The current route `/profile/rx-order` is wrapped by `PortalFeatureGate feature="rx-order"`. `canAccessPortalFeature()` defaults this feature to `approved_customer`, and `PortalRxOrderForm` needs a linked `crmCustomerId` to create an account-owned Rx quote. The requested outcome is access for every signed-up **customer**, without a separate LabLink login or a discretionary trade-approval gate. Define a customer as a verified login with a server-authorized active customer membership; keep unlinked signups in account setup until the server establishes which account owns the order. Keep explicit account-level disablement where required, active-account selection, customer-scoped reads/writes, and the independent `order-prices` permission. Review quote creation, draft persistence, checkout, and direct-submit authorization on the server before widening the UI gate. Do not infer customer authorization from a browser-selected customer ID.

Authentication/authorization changes need the repository's explicit approval before implementation. If business intent instead includes unlinked newly registered people, design an account-creation and quote-ownership contract first; the current form cannot safely submit on their behalf.

## Work packages

1. **Create one ordering message and route map.** Use `/profile/rx-order` for custom lenses, `/store` for all other products, `/profile/orders` for order history, and support for problems. Add a shared ordering CTA or content definition where reuse prevents copy drift. Decide which catalogued lens SKUs are stock products; do not classify every `product_type: "lens"` as custom, because the store already sells lens variants. Check product detail and collection CTAs against that rule.
2. **Replace active LabLink copy and links.** Audit `src/components/{Header,Footer}.tsx`, `src/components/home-prototypes/homeVersionBContent.ts`, `src/pages/{ProfessionalsPage,RxLabServicesPage}.tsx`, `src/pages/professionals/{LensOrderingTipsPage,LabProcessOverviewPage,FreightDeliveryPolicyPage,ReturnsReplacementsPage}.tsx`, lens and coating pages, account draft notices, and assistant responses. Remove the separate-login and embedded-portal story. The BlueBlock AR “Shop Coatings” action currently links to LabLink; route its product-specific action to the correct store item or to the Rx form when it is a custom-lens treatment. Reword returns and freight guidance around the site’s own order history and support path, without claiming tracking data that is not actually available.
3. **Retire the legacy entry point safely.** Remove active LabLink URL constants, iframe page, and special header/footer behavior for the iframe. Keep `/rx-job-status` as a redirect to `/profile/orders` so old bookmarks do not dead-end; update `PublicRoutes.tsx`, `routeRegistry.ts`, route tests, and navigation together. Keep historical identifiers and old submitted records intelligible internally. Review any external newsletter URL already sent; it cannot be erased from recipients’ inboxes, but its linked landing path should remain useful. A future newsletter should describe native ordering.
4. **Update the assistant and saved drafts.** Change Iris’s deterministic replies and retrieval content to direct custom-lens ordering to the native form, products to the store, and status/support to real portal capabilities. Replace the old “final submission in LabLink” message. Review `ready_for_lablink` persisted draft values: migrate or normalize them compatibly rather than renaming the enum in a way that strands saved drafts. Keep the existing prefill handoff into the native form.
5. **Audit content sources, not only components.** Search rendered source, SEO text, page metadata, CMS-managed content, help/wiki articles, product descriptions, navigation data, newsletters, and the public search index. Edit authoritative content, then regenerate `src/lib/generated/publicContentIndex.ts` with `npm run search:index`; do not hand-edit generated search entries. Update active help documentation that still tells users to use LabLink. Preserve historical release notes and order audit data as records, while removing LabLink from current ordering instructions and active search results.
6. **Align access with the promise.** After approval of the access contract, update the portal route gate, menu visibility, blocked-state copy, server quote/draft/order authorization, and any required membership setup. Verify that a verified customer with an active membership can open the form on their own profile, save a draft, and reach the valid checkout/direct-submit path; an unrelated account cannot read or mutate it. Check customer identities with and without credit terms, pricing access, and explicit feature disablement. Do not broaden statements, pricelists, costs, or private-order access as a side effect.

## Verification and release gates

- Static audit: active customer-facing source and generated public search content contain no LabLink wording or LabLink URLs; any retained occurrence is explicitly historical or a compatibility test. Scan case-insensitively and include `Lab Link` variants.
- Route tests: native Rx and store CTAs resolve correctly when signed out and signed in; `/rx-job-status` redirects; no iframe or external LabLink order/tracking link remains.
- Flow tests: an eligible customer’s Rx draft and quote remain on their selected authorized account; stock lens and non-lens purchases remain in store/cart/checkout; support and order-status links open their actual destinations. Cover legacy saved draft status.
- Run focused integration tests, `npm run lint`, `npm run test -- --runInBand`, `npm run build`, `npm run qa:pr-checks`, and `npm run qa:smoke` for the route changes. Inspect the public and authenticated customer journeys in a local browser at desktop and mobile widths. Report known baseline failures separately.
- Release only after explicit deployment and authorization-change approval. After release, repeat the two customer journeys and legacy redirect on the hosted site, then verify live account scoping without placing an unapproved real order.

## Implementation boundary

This document is a plan. No current website copy, access control, database policy, customer order, or production deployment has changed.
