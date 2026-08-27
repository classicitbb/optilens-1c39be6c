# Merge Scotia gateway status, config and secret into one compact section

Today the Scotia eCom+ gateway is spread over three separate cards on Admin → Integrations → Service integrations:

- "Gateway configuration" (Store ID, Environment, Currency, Timezone, Enable live processing)
- "Shared Secret" (secret field, Save configuration, Test configuration)
- "Status" (Store ID, Environment, Secret stored, Live processing, Last tested, Updated)

That is a lot of vertical space for one integration, and the Status card just repeats fields already shown above.

## What changes

Collapse all three into a single card, "Scotia eCom+ payment gateway":

- Card header shows the title, a one-line description, and the current status badge on the right.
- A compact meta line under the header: last tested and last updated timestamps (the only status facts not already visible as form fields).
- One tight field grid: Store ID, Environment, Timezone, Shared Secret (password field, with the "a secret is stored" hint), and the fixed USD currency note reduced to helper text rather than a read-only input.
- The "Enable live processing" checkbox and the Save / Test buttons sit together in one footer row.
- The green "Gateway is configured" / amber "Add a Store ID and Shared Secret" hint stays, as a single small line in the footer.

No behaviour changes: same queries, same save and test mutations, same disabled-state rules, same test-payment dialog. Only layout and grouping.

## Technical notes

- Single file: `src/pages/admin/settings/IntegrationsPage.tsx`, lines ~320-511 — the three `<Card>` blocks become one.
- Remove the now-redundant `Store ID / Environment / Secret stored / Live processing` readouts from the Status card since the form fields already show those values.
- The page-header status badge is kept as-is; the card badge reuses the same `statusMeta[currentStatus]` styling.
- DHL Express, QBO, Innovations Sync cards and the Gatekeeper / AI Agents tabs are untouched.
