# Stop Re-Typing Items — Pull Them From the ERP Instead

**Date:** 2026-08-02 · **Status:** design only, nothing built yet

## 1. The problem

Right now, if an item already exists in our office system (Innovations, the ERP that runs
through OptiLens Local), someone still has to manually type it into the website's Product
Catalog (the Supplies tab, and eventually Lenses/Add-Ons too) — usually via a CSV import.

That's double entry. The ERP already knows the item's name, cost, price, and whether it's
stocked. We want the website to just **read that information automatically**, instead of a
person copying it by hand.

## 2. The goal (simple version)

> If an item is already set up in the ERP — and it's marked as something we stock or keep
> in inventory — it should show up on the website automatically, without anyone typing it in.

Manual entry should only be needed for things that **don't** exist in the ERP at all (rare —
most of what we sell already lives there).

## 3. What we have today

- **The website's Supplies list** (screenshot you shared) lives in a database table called
  `supplies`. Every row there was either typed in by hand or uploaded via a CSV file
  (`Import Supplies` tab). Nothing about it knows whether the item still exists in the ERP,
  or whether the ERP's price has changed since.
- **The ERP side** (Innovations) already has a table called `MiscItems` — this is where
  lab supplies, lens cleaners, repair items, etc. live. Each row already has:
  - a unique ID number
  - a SKU
  - a name/description
  - a cost and a sell price
  - a quantity on hand
  - a group/category it belongs to
  - a set of on/off flags (one of which we know means "inactive")
- **The connection already works.** OptiLens Local can already read `MiscItems` live —
  it does this today for a different feature (building the Rx lens catalog). We're not
  building a new connection, just pointing an existing kind of connection at a new table
  and a new destination.
- **There's already a proven pattern for "push data from the office to the website safely."**
  It's used today for customers, contacts, and account statements: the office reads its
  data, sends it to the website in a test ("dry run") mode first so someone can check it
  looks right, then commits it for real. Every record carries the ERP's own ID number, so
  re-running it never creates duplicates — it just updates the same row.

We're proposing to reuse that same proven pattern for items, rather than invent something new.

## 4. What "done" looks like

1. Someone at the office clicks "sync now" (or it runs on a schedule, e.g. hourly).
2. OptiLens Local reads the ERP's item list, keeping only the items that are actually set
   up and in use (see open question below for exactly what that filter means).
3. It sends that list to the website.
4. The website matches each ERP item to an existing website row (by SKU or name) if one
   exists, or creates a new row if it doesn't.
5. From then on, that row's **cost and SKU** are controlled by the ERP — no one edits them
   by hand on the website anymore, because the next sync would just overwrite a manual
   change anyway. (Sell price is different — see the note below.)
6. Website-only details (like whether it's shown on the public store, its photo, extra
   marketing text) stay editable on the website, because the ERP doesn't have an opinion
   about those.

## 5. Where each field comes from

| Website field | Comes from ERP field | Notes |
|---|---|---|
| (new) ERP item ID | `MiscItemID` | The permanent link — this is how we avoid duplicates on re-sync |
| SKU | `SKU` | |
| Name | `Desc1` | |
| Category | the item's group name | e.g. "Lab Supplies", "Eyewear Accessories" |
| Cost | `Cost` | |
| Sell price | *(not synced)* | see note below — the ERP's `Price` field turned out to be unusable |
| Quantity on hand | `OnHand` | new field we'd add to the website table; 0 is fine, still syncs |
| Active / inactive | "Inactive" checkbox | items marked inactive in the ERP shouldn't show up |
| *(sync filter, not a website field)* | "Stocked Item" checkbox | this is the actual on/off switch for "does this belong in Supplies" — see §7 |
| Show on website | *(website only)* | not controlled by the ERP — staff still choose this per item |
| Photo, description | *(website only)* | not controlled by the ERP |

**Why sell price isn't synced:** we checked the ERP's `Price` field directly against live data —
it's `0` on every single stocked item (confirmed across all 106). The real prices live in a
separate multi-pricelist system where one item can have a dozen different price rows depending
on which price list/customer group applies — there's no single "the" price to pull automatically.
Rather than guess which one, or reinvent the margin/markup math the website already has (the same
formula the CSV import already uses to suggest a price), a newly-synced item arrives with its
cost filled in and sell price left for a staff member to set through that same existing pricing
review screen — same as manual entry today, just without re-typing the cost/SKU/name part.

## 6. What happens to items we already typed in manually

We don't want a sync to silently blow away things staff already set up. So the plan is:

1. First sync run is a **dry run** — it shows a list of matches: "this ERP item looks like
   it's the same as this existing website row" (matched by SKU or name), plus a list of
   brand-new items the website doesn't have yet.
2. Staff review that list once.
3. After approval, matched rows get "adopted" by the ERP (their price/cost/SKU now come
   from the sync going forward). Anything the ERP doesn't recognize stays exactly as it is,
   untouched, still editable by hand.

This is the same "review before it writes" idea already used elsewhere in the site's admin
tools — nothing changes without a human looking at it first, at least the first time.

## 7. Resolved: what "stocked" actually means (confirmed 2026-08-02)

This was an open question — now confirmed directly from the ERP's own item screen, checked
against the live on-hand inventory export.

The ERP's "Misc Item" edit screen has an explicit **"Stocked Item" checkbox** — it isn't a
hidden flag we have to guess at, it's a real field staff set per item. Two examples make the
difference obvious:

| | **SUPERAR** (Super-AR+ coating) | **2817200** (1oz Vizionize AI Lens Cleaner) |
|---|---|---|
| Stocked Item | ☐ unchecked | ☑ checked |
| Coat | ☑ checked | ☐ unchecked |
| Shows up in the on-hand inventory export? | **No** — never appears | **Yes** — 810 units on hand |

The on-hand inventory export (a plain list of "quantity, SKU" for everything currently
counted in stock) backs this up: `2817200` and `2817200X10` both appear in that list with
real quantities, and so do other known stocked items like the Purity Lens Cleaner
(`2017210`, 486 on hand). `SUPERAR` never appears in that list at all — because a coating
isn't a physical thing you count on a shelf, it's a service/treatment applied during job
entry.

**What this means for the sync filter:**
- **Sync = "Stocked Item" is checked.** Not "has a nonzero quantity right now" — a stocked
  item can legitimately be at 0 on hand (just sold out, restocking) and should still sync;
  it's still a real physical product we sell.
- **Exclude anything that's really a service/treatment**, even though it lives in the same
  `MiscItems` list — coatings, tints, wafers, freight charges. Those are marked "Coat" /
  "Tint" / "Lens Wafer" / "Freight" instead of "Stocked Item," and they belong with lens
  add-ons/treatments (already handled separately by the Rx catalog's coatings sync), not
  with physical Supplies.
- "Inactive" still means what we thought — skip those regardless of the Stocked Item flag.
- "Available in Job Entry" / "Available for Outsourcing" / "Editable Description" are about
  how the item behaves inside the ERP's own order screens — not relevant to whether it
  should appear on the website.

### How the checkbox is actually stored (confirmed by live query)

The ERP doesn't store "Stocked Item" as its own database column — like most of its checkboxes,
it's one bit inside a single numeric `Flags` column on `MiscItems`. We pulled the two example
items directly from the live database and confirmed which bit:

| | SUPERAR (coating) | 2817200 (cleaner) |
|---|---|---|
| `Flags` (raw) | 131666 | 147462 |
| bit 2 (value 4) | 0 | **1** |

We didn't stop at one pair, in case that was a coincidence — we pulled **all 724 rows** of
`MiscItems` and cross-checked bit 2 against every item's category label (`Desc2`) and against
your full on-hand-quantity export (355 SKUs):

| Category | Items | Bit 2 set |
|---|---|---|
| Coating | 51 | 1 |
| TOG Coating | 6 | 0 |
| ESCA Coating | 3 | 0 |
| Lab Extra (services/fees) | 116 | 13 |
| Lab Product / Wholesale | 71 | 70 |
| Bridge | 59 | 57 |
| Solid Sunlens | 48 | 48 |

Bit 2 is cleanly *off* for coatings/services and cleanly *on* for physical product categories —
exactly the split we need. (One dead end worth recording so it isn't re-tried: the `StockItems`
table joined by `MiscItemID` — used elsewhere in OptiLens Local's inventory metrics — turned out
to have a row for *every* `MiscItems` record, coatings included, so it does not distinguish
stocked items at all; the `Flags` bit is the real signal.)

**"Inactive" is a different bit than expected, and it mattered that we checked.** OptiLens
Local already has a convention elsewhere (`Flags & 2`) for a different table's "inactive"
concept — trying that same bit on `MiscItems` would have been wrong: it's set on *both* known
active examples above, which would have silently excluded most real stock. The user pulled up
a genuinely inactive item from the ERP (`BLUE JOB TRAY`, item **501**, "Inactive" visibly
checked) so we could isolate the real bit directly instead of guessing:

| | BLUE JOB TRAY (confirmed Inactive) | SUPERAR (active) | 2817200 (active) |
|---|---|---|---|
| `Flags` (raw) | 139809 | 131666 | 147462 |
| bit 0 (value 1) | **1** | 0 | 0 |

Checked at population scale too: bit 0 is set on only 14 of all 724 rows (1.9%) — the right
shape for "a small minority is actually inactive," unlike the borrowed bit's 71–76% (which was
never a plausible "inactive" rate for an active product catalog).

**Confirmed filter, verified against all three known items before shipping:**
```sql
WHERE (Flags & 4) <> 0   -- "Stocked Item" checked
  AND (Flags & 1) = 0    -- not "Inactive" (bit 0 — confirmed against a real Inactive item; NOT
                          -- the Flags & 2 convention used for a different table elsewhere)
```
422 of the 724 `MiscItems` rows currently match.

## 8. Suggested build order

1. ~~Run the read-only check above to nail down the filter.~~ Done — see §7.
2. Add a few new columns to the website's `supplies` table: the ERP ID, where the row came
   from (ERP vs. manual), when it last synced, and quantity on hand.
3. Build the office-side query (OptiLens Local already knows how to talk to this ERP table
   — we're pointing it at a new destination, not building new plumbing).
4. Build the website-side receiving endpoint, reusing the same dry-run/commit/undo-safe
   pattern already used for customers and statements.
5. Run it as a dry run, review the matches, adopt them.
6. Turn on price/cost/SKU editing lock for ERP-owned rows.
7. Once this works well for Supplies, do the same thing for Lenses and Add-Ons, which are
   set up the same way in the ERP.

## 9. Not doing (yet)

- Two-way sync (website never writes back to the ERP — same rule as everywhere else in
  this system: the office system is the source of truth, the website only reads).
- Real-time, instant updates — hourly (or on-demand) sync is enough for pricing/stock data
  that doesn't change minute to minute.
- Touching Lenses/Add-Ons in this first pass — get Supplies right first, then repeat the
  same recipe for the others.
