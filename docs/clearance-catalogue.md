# Private clearance catalogue operations

Status: Local implementation; production publication pending.

## Sale data
Office snapshot prices are BBD per sale unit. The source numeric LensItem.Cost
is supplier USD per pair, despite its source BBD-each label. Each price is half
that cost times 2.66; pair price is the pair cost times 2.66. Prices round directly
at the sale-unit level. Complete multifocal pairs are paired stock plus min(right,left).
Single-vision eaches count right+left+2*pairs. Unknown or invalid costs/metadata are excluded.

## Private link and visibility
The canonical route is /clearance with a random 32-byte base64url token in its fragment.
Only its SHA-256 hash is stored server-side. The route is hidden in the route registry,
has no menu/search/sitemap entry and uses noindex/nofollow. It is capability-link access:
anyone with the complete link can view, without needing a website account.
The standalone route does not mount the shop shell or its assistant.

The owner-only footer link opens /admin/clearance retaining the fragment. The existing
AdminOnlyRoute and server-verified admin role protect visibility writes. Hiding a family
uses the exact material/manufacturer/design/colour/type key, covers all its diameters and
persists independently of inventory snapshots. Public reads filter hidden families before
returning JSON. Restoring a family never changes source data.

## Prepared receiver
Function: clearance-catalogue. POST actions read, publish, revoke, admin-list, set-visibility.
OPTIONS has no side effect. Snapshot and exclusion tables enable RLS and grant no anonymous
or authenticated table access. The publisher RPC is invoker-only and executable by service_role
only; the Edge Function checks the existing catalog:write scope. Administrative visibility
actions require a verified user JWT plus the server-read admin role.
Publishing cannot reactivate a revoked link or replace a newer snapshot with an older one.

The office publisher is dry-run by default. Its --commit mode writes one allowlisted snapshot
over HTTPS. Private key/link configuration stays host-local under OPTILENS_CLEARANCE_PUBLISH_URL,
OPTILENS_CLEARANCE_API_KEY and OPTILENS_CLEARANCE_LINK_TOKEN. Do not place token values in
repository files, task arguments, scheduler history, logs or browser client settings.
Daily installation is prepared in the office repo and is not installed by the build.

## Pending publication sequence
Review the actual grid draft, then approve the scoped website/office deployment,
the one new migration/function, private-link provisioning and initial outbound publish,
and the daily host task. Apply through the established deployment workflows, run the
mandatory edge smoke suite, then verify missing/invalid/revoked links, the real accepted
snapshot, server-side family suppression after reload and a scheduled refresh.
No order, reservation, payment, inventory write or email is part of this feature.

## Validation
See the task handoff and local validation logs. Unit tests use mocked connectors.
No live migration/function call or privileged visibility write has run in this build.
