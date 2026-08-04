# Rx order form: Innovations as the catalogue

Decisions from the 2026-08-03 design session, with the evidence measured against the
live database on the same day. This supersedes the "locked" availability rule in
[`useOrderableCatalog.ts`](../src/features/rx-order/hooks/useOrderableCatalog.ts) and
sets the direction for the Rx order form, its pricing, and its submission back to
Innovations.

---

## 1. The closed loop we are building toward

1. Innovations holds the database of options our suppliers can provide.
2. We add supplier costs against those options.
3. Prices are derived from landed cost.
4. Derived prices populate the pricelists.
5. The same prices are simultaneously available for live quoting in the order form.
6. An order is placed and sent back through optilens-local.
7. It arrives in Innovations, is matched to the database, processed, and **invoiced at
   the price that was quoted**.

We are not full circle yet. Everything below is in service of closing it.

---

## 2. Decisions

### 2.1 Innovations is the catalogue; the alias mapping is reporting

If a lens is turned on in Innovations, then its MF type, material, lens type and lens
option are available, and the order form may offer them. That applies to lenses **and
misc items**. Availability is not re-decided on our side.

The CV↔alias mapping (`lens_alias_map`, `/admin/pricing/alias-mapping`) becomes
reporting for the REST order process. It is **not** retired yet — see §4.1.

### 2.2 `show_on_website` must stop gating the Rx form

`show_on_website` means *stock semi-finished / uncut lenses sold in bulk boxes to labs
who surface their own*. It was never meant to gate prescription ordering. Free-form and
custom lenses were never intended for the website store.

The Rx form reusing that flag is a mistake and is currently throttling it to **10 of
1,011 active lenses** (5 Semifinished, 3 Finished, 1 Finished PAL, 1 Lab Uncut).

### 2.3 Price comes from the matrix, keyed group × family × material

A selection like *1.50 Photochromic Single Vision TGNS Amber* resolves to:

| axis | value | source |
| ---- | ----- | ------ |
| group | TRANS GEN S™ | `normTreatment()` on the colour text |
| family | Adept Single Vision | `TIER_MAP[MFType\|LensType]` |
| material | 1.50 | material → index column |

Only decision junctions for final routing and matching — no per-lens configuration.

### 2.4 Unpriced combinations are quote-only, and prompt for assistance

A null price means *not offered*. We do not want to push these, but customers ask
occasionally. The form shows the option, shows no price, and surfaces a **request
assistance** prompt so the customer selects what they want and we counsel them on what
we recommend.

No separate "deliberately excluded" flag — a null price carries that meaning.

### 2.5 Trifocal bundles with bifocal / multifocal

Already true and requires no change: [`classifier.ts:124`](../src/lib/pricing/classifier.ts)
maps both `Trifocal|Flat Top 7x28` and `Trifocal|Flat Top 8x35` to
`Specific Use - Adept Bifocal`, and the form only ever offered two vision segments.

### 2.6 No margin on Rx lines at order time

Cost stays in the Innovations ERP. Margin is finalised upstream, before a user can
purchase. The form does not compute it.

**No change needed.** An earlier draft of this document claimed a missing lens row would
make `computeLineProfit` record a 100% margin. That was wrong —
[`useQuotes.ts:161`](../src/hooks/useQuotes.ts) already short-circuits on zero cost and
returns `gp_amount: 0, gp_percent: 0, profit_status: "NoCost", threshold_status: "NoCost"`.
An Rx line with no cost source is already reported honestly as `NoCost`, which is exactly
what we want when cost lives in the ERP.

### 2.7 The quoted price travels as a check value, not an instruction

Innovations prices the order as normal, compares against the quoted figure, and a
mismatch raises a **helpdesk ticket** for review.

- Tolerance: **1% or $1.00 BBD per line, whichever is greater**; the order total is
  checked separately at the same tolerance so compensating errors cannot cancel out.
- Severity by direction: invoiced **above** quote reaches the customer — higher priority.
  Invoiced **below** quote is a margin leak — lower.
- The ticket is **internal, customer email off**. It is a reconciliation issue between us
  and Innovations, not something to notify a customer about before anyone has looked.
- Comparison is done in **BBD**, so no FX enters the reconciliation.

### 2.8 Currency model

| layer | currency |
| ----- | -------- |
| Transactional quoting | **BBD and USD only** |
| Other currencies (EUR, TTD, JMD, XCD) | **display only**, indicative, at quote time |
| Cart totals and payment | **USD** |
| Payload to Innovations | **BBD** |

Display-only currencies must be labelled as indicative. They are never the basis of a
cart total, a payment, or the price check in §2.7.

---

## 3. What already exists

Measured against live data, 2026-08-03.

| | |
| --- | --- |
| Active aliases synced | **4,087** |
| Distinct group × family × material cells they produce | **265** |
| Aliases landing in a cell that has a price | **3,754 (92%)** |
| `MFType\|Style` pairs already in `TIER_MAP` | **39 of 40**, covering 4,084 aliases |
| Matrix allocations | 1,532 across all 4 pricelist versions |
| Assistance flow (`data-assist` → `S.assists` → `quote_lines.needs_assistance`) | complete |
| Adapter seam for injecting currencies (`applyAdapterData`) | present, unused |

The family axis classifies Innovations aliases essentially out of the box. The one miss,
`Trifocal|Flat Top 8X35` (3 aliases), is a casing duplicate of `Flat Top 8x35` in the
Innovations data, not a gap.

---

## 4. Work, in dependency order

### 4.1 Sever the Rx form from `show_on_website`

Change the availability rule so the Rx form sources from the synced Innovations alias
catalogue instead of `lenses` filtered by `show_on_website`. `buildEngineData` currently
builds materials/designs/colours from lens rows; it needs an Innovations-sourced
equivalent.

**Do not wait for the feed gaps in §5.1.** Those cost ~274 lenses of coverage; the
current flag costs 1,001. Ship the switch, fast-follow the gaps.

The alias mapping stays load-bearing until this lands —
`build_rx_submission_payload` resolves the outgoing code as
`COALESCE(ql.innovations_alias, pm.innovations_alias)`, falling back to
`lens_alias_map`. Only once the form always writes the alias onto the line does that
fallback become dead. **The mapping cannot be retired before the form switch.**

### 4.2 Classify straight into matrix cells

Route the selection through `normTreatment()` + `TIER_MAP` + material index to a
`matrix_allocations` price, with no CV lens join. Two data fixes are prerequisites:

- **Duplicate treatment keys.** `trans_gen_s` (197 rows) and `transitions_gen_s_2`
  (60 rows) hold **257 allocations with zero prices** between them, alongside the real
  `transitions_gen_s` (214 rows, 160 priced). A TGNS lens can resolve to three keys.
  Merge into `transitions_gen_s` and delete the others.
  [`groupingMap.ts:24`](../src/lib/pricing/groupingMap.ts) already flags `_2` as deprecated.
- **31 aliases have no material index** — their `material_description` is bare
  `Polarized` with no index number, so they cannot reach a cell at all. Needs a rule.

### 4.3 Quote-only path for unpriced cells

Wire a null price to the existing assistance mechanism: no price in the live quote, a
`data-assist` prompt on the line, flowing through `payload.assistance` to
`quote_lines.needs_assistance` / `assistance_note`. No new plumbing required.

Scale: **635 of 1,532 allocations have a null price** — 378 of 1,275 (30%) once the dead
duplicate keys are removed. Every allocation row is `is_active = true`; the flag has
never been used to mean anything. Per §2.4 we are accepting null-price-means-not-offered
rather than introducing a distinction.

### 4.4 FX rates

- Wire the engine's hardcoded `CUR` table to `pricing_settings.fx_rates` through the
  existing `ADAPTER.data.currencies` seam.
- **Invert the convention in exactly one place, with a test pinning it.**
  `pricing_settings` stores BBD per unit of foreign (`USD: 2`); the engine stores foreign
  per 1 BBD (`USD: 0.5`). Wiring one to the other unconverted puts every foreign quote
  out by a factor of four, plausibly enough to ship unnoticed.
- **Do not apply `fx_risk_buffer` to customer-facing quotes.** It exists to pad supplier
  cost conversion; on a sell price it silently marks foreign quotes up 2%.
- ~~Resolve the two `pricing_settings` rows disagreeing on `fx_risk_buffer`.~~ Nothing to
  resolve — there are three rows and `is_active` picks the answer. The active one is v3
  "Classic Price Settings 2026" (`fx_rates {BBD:1, USD:2}`, `fx_risk_buffer 0`); the 0.02
  is on v1, inactive since February. Read the active row, not the first row.
- Restrict transactional currencies to BBD and USD; mark the rest indicative.

### 4.5 Price check on submission

- Add per-line `unit_price`, `amount`, `currency` and `pricelist_version_id` to
  `build_rx_submission_payload`. Today each lens line carries only
  `line_id, item_name, qty, alias, codes, rx` and each addon only
  `item_name, sku, qty, line_type` — the sole money value in the whole payload is
  `quote.grand_total`.
- Carry the priced-back figures home in the existing write-back fields
  (`result_code`, `result_message`, `rxt_data`, `last_error`) — no new transport needed.
- Raise an internal helpdesk ticket on a mismatch beyond tolerance (§2.7).

### 4.6 Stop fabricating margin

Write null cost and null profit on Rx lines rather than deriving them from a missing
lens row (§2.6).

---

## 5. Dependencies outside this repo

### 5.1 The alias export is narrower than the Innovations lens database

Confirmed by inspection of the Innovations Lens Database tree. These are present in
Innovations but absent from the feed, so under §2.1 they become unsellable:

| Missing from the feed | In Innovations as | CV lenses affected |
| --------------------- | ----------------- | ------------------ |
| `1.60 Index` | Resin → `1.60 Index` — **has matrix allocations already** | 51 |
| `Endless` | under the Single Vision MF type | 102 |
| `Endless Off` | `Endless Off - 1.3m / 2m / 4m / 6m` | 48 |
| `Endless Plus` | categorised as a progressive | 73 |

Also absent: `1.546`, `1.56`, `1.565`, `1.581 Index`, `1.595 Index`.

Two structural notes for when they arrive: `Endless Off` is a **style header** covering
four working distances, so one CV lens will span several `style_code`s; and our
`Endless SV` and `Endless Plus - Antifatigue` rows carry both Single Vision and
Progressive MF types, so that axis needs reconciling too.

### 5.2 Deactivation must be sent explicitly

The feed is upsert-only. A row that stops being sent is never removed, so deactivating in
Innovations is invisible to us until the push sends `is_active: false`. Documented in
[the sync contract](integration-innovations-sync-contract.md).

### 5.3 Misc items are not in the feed

§2.1 covers misc items as well as lenses, but `innovations_lens_aliases` carries lenses
only — `addon_alias_map` was deferred. Extending the export is a prerequisite for misc
items to follow the same model.

---

## 6. Deferred

Not decided, and not blocking:

- **Alias colour volume.** 940 distinct colour names, of which only 322 are reachable
  from an active `lens_options` row; 618 have no active option behind them. Filtering
  the mapping screen was discussed and paused. Under §2.1 this matters less, since the
  mapping stops being the ordering path — revisit only if the screen stays in use.
- **The synonym matching tier** in `aliasMatching.ts`, which expands `Photochromic` to
  Vantage / SunSync / XtrActive / Photo — different products at different costs under one
  priced line. Safe while nothing is bulk-confirmed; revisit if the mapping screen is
  used for real writes.
- **The primary-alias rule** (currently the lowest alias string, which is arbitrary
  rather than a business choice) and **what unticking a saved colour should do**
  (currently a hard delete).
