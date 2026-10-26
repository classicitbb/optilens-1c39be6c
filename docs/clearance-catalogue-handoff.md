# Clearance release handoff
Status: Complete — no active handoff.

The owner explicitly approved activation, daily publishing, private-link/key setup,
and commit/push on 26 October 2026. The unlisted website route and admin family
visibility are deployed. Both scoped migrations are applied and registered.
The office feed is deployed through the guarded updater and runs daily at 06:00
America/Barbados. An actual unattended run completed with result 0 and a newer
receiver-accepted snapshot; host health and host tests passed.

The source SQL stays read-only. The snapshot tables are private under RLS, link reads
check a high-entropy capability, publication checks the scoped machine key, and
management checks the existing authenticated admin role. Private links, key values,
connection details and host paths are deliberately absent from this repository.

Resolved release issues: current remote main/security work was merged and preserved;
one missing locked spreadsheet dependency was restored without package file changes;
the source metadata lookup timeout was removed by loading identities with stock;
the validator statement timeout was fixed by aggregating the cleaned JSON once.
The host asset-classification check was fixed by mapping the new catalogue assets.

Validation: 14 catalogue/transport/admin tests; 42 earlier catalogue/attachment tests;
application TypeScript, scoped lint, production build and PR-policy checks passed.
The initial broad website run had 1708 passing tests and eight import-blocked suites;
all eight were rerun successfully after the missing dependency was restored.
Office full suite passed 629 tests; the deployed host suite and health check passed.
Live desktop and 360/390px checks confirmed real data, contained table scrolling,
no page overflow or script errors, and noindex/nofollow. Real admin suppression was
not changed during verification; it remains a deliberate owner action.

Operational guide: docs/clearance-catalogue.md. Publication acknowledgements and
scheduler diagnostics remain in approved private host configuration, not public docs.
No remaining implementation or approval gate for the requested activation.
