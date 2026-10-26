# Private clearance catalogue operations

Status: Complete — no active handoff.

## Live access and display
The unlisted /clearance route uses a random 32-byte base64url token in the URL
fragment. The link itself is kept in approved private configuration and is never
stored in this public repository. Only the token hash is stored in the database.
The route has no menu/search/sitemap entry and uses noindex/nofollow. Anyone holding
the complete link can view; an expired or revoked snapshot returns no availability.

Families group material/manufacturer/design/colour/type, with separate diameters.
Each optical column is 80px. Quantity and BBD price are plain text, without badges.
The compact header and all grid text use sans-serif and host semantic theme tokens.
Single vision sells eaches by sphere/cylinder; multifocals sell whole pairs by base/add.

## Sale units and prices
Owner-confirmed source convention: numeric LensItem.Cost is supplier USD cost PER PAIR,
despite its BBD-each source presentation. Each selling price is Cost / 2 * 2.66;
pair selling price is Cost * 2.66, rounded directly per sale unit to two decimals.
Complete pairs are OnHand_P + min(OnHand_R,OnHand_L). Single-vision eaches are
OnHand_R + OnHand_L + 2*OnHand_P. Unmatched multifocal lenses, nonpositive costs,
invalid identities and no-longer-eligible write-off candidates are omitted.

## Admin family visibility
A signed-in admin sees Manage catalogue in the footer; /admin/clearance preserves
the private-link fragment through the existing sign-in guard. Hide/Show family
affects this sale catalogue only. It covers all diameters of the selected family
and survives daily snapshot replacement. It never changes stock or source lens status.
Every visibility change records the authenticated actor and an append-only event.

## Database boundary
Public RPC wrappers clearance_read, clearance_publish_authorized and clearance_manage
are SECURITY INVOKER functions. Elevated implementations live in the unexposed
clearance_private schema with fixed empty search paths and explicit token/key/admin checks.
Snapshot, exclusion and visibility-event tables enable RLS and grant no anonymous
table reads or direct authenticated updates. Management RPC execution is unavailable to anon;
the private implementation also checks auth.uid and the current admin role.

The publishing RPC verifies the existing catalog:write scope and validates/allowlists
every sale field. It cannot revive a revoked link or overwrite a newer snapshot.
Validation builds the JSON result with one aggregation to stay within the normal
database statement timeout. No Edge Function was added or redeployed.

## Daily operation
The approved office task runs daily at 06:00 America/Barbados under its unattended
service identity. It was executed and positively acknowledged by the receiver.
Snapshots expire after 24 hours; failures cannot silently advertise expired balances.
The first implementation timed out on separate source identity lookups; identities
now load in the same bounded read as stock. No source database write occurs.

The office command node scripts/publish-clearance-catalogue.js is dry-run by default.
--commit publishes. Names: OPTILENS_CLEARANCE_PUBLISH_URL, OPTILENS_CLEARANCE_API_KEY,
OPTILENS_CLEARANCE_LINK_TOKEN and OPTILENS_CLEARANCE_PUBLIC_KEY. The protected host
configuration is DPAPI machine-encrypted and ACL-restricted to administrators and SYSTEM.
No secret is passed in task arguments. Last publication and history are private local records.
The dedicated machine key has a one-year lifetime and must be rotated before expiry.

## Verified release
Both scoped migrations are applied and recorded. Real anonymous probes reject admin
access and invalid links return no data. A real machine publication and an independent
unattended task run both received positive acceptance. Production desktop and 360/390px
browser checks show current data, no horizontal page overflow, scrollable wide grids,
no script errors and noindex/nofollow. The 14 catalogue/transport/admin unit tests pass.
Authenticated administrator hide/restore is covered by deterministic tests; a real
signed-in admin mutation was not performed because no product suppression was requested.
