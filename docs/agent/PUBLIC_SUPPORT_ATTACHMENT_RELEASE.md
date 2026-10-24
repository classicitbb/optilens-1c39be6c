# Public support attachment release — 2026-10-09

Status: Complete — no active handoff

User explicitly authorized fixing, committing, pushing and deploying through Lovable MCP. Main release commit: `8d6b9498f4b24a9f5fce50c88dad179989c3a961`, incorporating attachment implementation `83e94064`, layout repair `f7300890`, and Lovable-generated database types. Other concurrent visitor-conversation edits were excluded.

Contact us and Get support share browser selection, description paste and form-wide drop controls for images, documents and audio. Pending composer files transfer visibly; sent chat files are gathered for submission. Admin ticket creation already uses the shared attachment picker. Limits remain five files, 10 MB each. Request fields retain natural height and scroll without overlap.

The named migration `20261009141913_public_inquiry_attachments` was applied and recorded through Lovable MCP. Uploader attribution is nullable for server-created anonymous inquiry attachments. Storage remains private; participant INSERT and private read policies were not changed. Only `contact-inquiry` was deployed, with existing JWT/CORS settings. The deployment service did not expose a function version; its reported source/settings SHA256 was `278a0394cc684e3f7381729c509e4d9b1cf899268649b09eea436ff47cdf4c0a`.

Lovable publication was requested through MCP and verified at `https://classicvisions.lovable.app/`: the support form includes the new nonshrinking section class. The same implementation was verified live at `https://www.classicvisions.net/` with synthetic document/image/audio selection, pending chat audio carryover into Contact us, and a rendered screenshot showing clear fields, file rows and buttons.

Validation: 27 focused attachment/public-routing tests pass; TypeScript, production build and PR checks pass; lint has zero errors with existing warnings. Lovable sandbox edge smoke passed all 47 functions and three health probes. The workstation edge-smoke attempt failed at network fetch, so it is not counted as a pass. Deployed multipart probes rejected executable, empty and over-count files with HTTP 400; database reads confirmed no probe inquiry or attachment records. The email health probe was skipped because its configuration was absent.

Limits: no real support request or email was sent, so successful production upload persistence and private participant isolation were not exercised end to end. Native Chrome/Edge clipboard testing was unavailable; paste/drop have automated regression and Lovable browser coverage. The broad suite has unrelated existing failures; no full-suite success is claimed. Employee-name mention/routing from the broader annotation was outside this attachment change.

Commits used `[skip actions]` to avoid unrelated all-function deployment and real-email CI smoke. Future work should retain targeted deployment and distinguish browser controls, deployed validation and successful persisted uploads.
