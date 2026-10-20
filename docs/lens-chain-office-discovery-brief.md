# Lens chain: office-side discovery brief (for a session on classic main)

Paste this into a Claude Code session on the machine that can reach the Innovations
database and the `optilens-local` repo. **Read-only discovery: change nothing, push
nothing.** Report back the answers in the table at the end.

## Goal

We are making every lens traceable from "turned on in Innovations" to "ordered at the
listed price and invoiced". The cloud (cvweb) half is being built from data it already
has. The Innovations half (stages 1-4) is not synced at all today, so we need to know
where those facts live before specifying a new `innovations-sync` entity.

The identity that exists at both ends is the 13-digit **LensAlias** (material code +
style code + colour code). Everything below is per alias.

## Stages to locate in Innovations

1. **Lens turned on.** Which table/column says a lens (and its option item) is active?
   The existing alias feed already derives `is_active` from this; confirm the exact rule
   in `optilens-local` (`lib/innovations-sync.js`, `rx-catalog-sync`).
2. **Price group.** Which table links a lens/alias to a price group, and can an alias
   have none or several?
3. **On an Innovations pricelist.** Which table(s) hold pricelist membership/prices for a
   lens, and which pricelist(s) count as the "real" ones?
4. **Cost source.** Either an entry on a **supplier cost list**, or a **reorder cost on
   the option item**. Which tables, how do they relate to the alias, and what is the rule
   when both exist or neither?

## Rules for the discovery

- Read-only queries only (`SELECT`). No writes, no sync runs, no `commit:true`.
- `Flags` integer columns: the same bit means different things on different tables.
  Confirm any flag bit against one known-ON and one known-OFF real row before relying on
  it (see `supabase/functions/innovations-sync/AGENTS.md`).
- Spot-check values across a meaningful sample. Columns that look like prices are
  sometimes always 0 (e.g. `MiscItems.Price`).
- **Do not paste cost values anywhere.** We only want to know *whether* a cost source
  exists, never the amount.

## Proposed payload (to confirm against what you find)

One row per alias, pushed as a new `innovations-sync` entity (working name
`lens_chain_facts`):

| field | meaning |
|---|---|
| `alias` | 13-digit key, matches `innovations_lens_aliases.alias` |
| `lens_on` | boolean, stage 1 |
| `price_group` | name/code or null, stage 2 |
| `on_pricelist` | boolean (optionally pricelist names), stage 3 |
| `cost_source` | `supplier_cost_list` / `reorder_cost` / `none`, stage 4 |
| `synced_at` | push timestamp |

## Report back

| Question | Table(s) / column(s) | Rule / caveat | Sample verified (ON and OFF) |
|---|---|---|---|
| Lens on | | | |
| Price group | | | |
| Pricelist membership | | | |
| Supplier cost list | | | |
| Option-item reorder cost | | | |
| Can the office read all of the above from the sync's source pool, or only the live pool? | | | |
