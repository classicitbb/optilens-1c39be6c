# LabLink -> OptiLens Local -> Innovations Rx Order Contract

**Status:** Discovery verified against one submitted order; treatment mapping test pending submission  
**Last verified:** 2026-07-10  
**Owner:** Classic Visions  
**Related contracts:** `docs/integration-innovations-sync-contract.md`, `docs/integration-innovations-sync-runbook.md`

This document is the durable reference for reproducing LabLink Rx order entry on
the Classic Visions public website while using OptiLens Local as the on-premises
bridge into the Innovations watch folder.

Do not copy credentials, browser passwords, the `hashrouting_key`, or patient
data into this document, source control, logs, fixtures, or screenshots.

## 1. Verified evidence

### Submitted baseline order

| Field | Verified value |
| --- | --- |
| LabLink order number | `51283008` |
| LabLink status | `Valid` |
| LabLink account | Classic Visions Retail (`1177-002`) |
| Entered by | `Lab1177` |
| Lens | Pair, Single Vision, 1.50 Plastic, Clear |
| Rx | OD/OS `+0.00` sphere, `+0.00` cylinder, monocular far PD `32.0` |
| Frame | Model/colour `TEST`, A `52.0`, B `38.0`, DBL `18.0`, Plastic mounting |
| Instructions | `TEST ORDER - DO NOT PROCESS - TEST - created for integration and form validation mapping.` |

The order generated this processed file:

```text
\\192.168.254.5\innovations\incoming\processed\hashref\classicmain10101916014852504 (classicmain10101916051883814).rx
```

File evidence:

- Plain text, `file_version:1.0`.
- 1,748 bytes, 73 CRLF-delimited lines, no null bytes.
- SHA-256: `EBBEAC97AD6F251CDD6F4D763DB68BA3A8AA7A4679A9459528B474F83E3187F1`.
- Contains `order_id:51283008` and the exact submitted instructions, lens,
  frame and Rx values.
- Contains two repeatable `item_start` / `item_end` blocks.
- The file no longer existed in the active `incoming` folder and did exist in
  `processed/hashref`, consistent with the Innovations watcher consuming and
  archiving it.
- The 160-character `hashrouting_key` was inspected only for presence and
  length and must be treated as a secret.

## 2. Proven topology

```text
LabLink browser order form
        |
        | authenticated form POST + server-side transformation
        v
LabLink-generated .rx v1.0 file
        |
        v
\\192.168.254.5\innovations\incoming
        |
        | on-prem Innovations watcher
        v
Innovations processing
        |
        +--> processed/hashref on success
        +--> error/quarantine path to be documented
```

For the Classic Visions implementation, OptiLens Local should replace the
browser/vendor server as the controlled on-premises bridge:

```text
Public website
    |
    | authenticated order DTO queued in the cloud
    v
Supabase order-outbox / submission request
    ^
    | outbound polling over HTTPS (no inbound access to the office network)
    |
OptiLens Local
    |
    | validate, map account/catalogue codes, render .rx, write atomically
    v
Innovations incoming watch folder
    |
    | processed/error result observed by OptiLens Local
    v
Submission status and Innovations reference synced back to the public website
```

The public website must never attempt to mount or write directly to the private
SMB share. This follows the existing OptiLens Local outbound-polling pattern in
the Innovations sync contract and runbook.

## 3. LabLink form architecture

The inspected LabLink page is a server-rendered Rails-style form:

- Order form action: `POST /orders`.
- Separate frame-trace upload action: `POST /trace_files`.
- CSRF-protected, cookie/session authenticated.
- Client validation uses Parsley while the form itself has `novalidate`.
- Select2/DevExtreme controls drive dependent catalogue fields.
- Save, Trace Only Order and Submit are distinct actions.
- Dispensing account and order date are derived from session/account context.

Observed dynamic endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/order_lab_lenses.json` | Material, design/type and colour/option lookup |
| `/get_lens_catalogue_rx_ranges` | Product-specific sphere/cylinder/add/height ranges |
| `/get_order_user_lab_lens` | Selected lens configuration and compatible extras |
| `/get_selected_lens_treatments` | Treatments, AR, tint, percentage and other options |
| `/order_frame_mountings` | Allowed frame mountings |
| `/c/:account/user_lens_materials/:material` | Account/material configuration |

These are internal web-application endpoints tied to LabLink session state and
are not evidence of a supported public API. Do not call them directly from the
Classic Visions frontend.

## 4. Field and dependency map

### Patient/provider

- Patient last and first name are optional in the inspected HTML.
- Provider name and order date are read-only.
- The `.rx` file combines patient name into `patient_name` and emits provider
  information as `ship_name`, `dr_name` and `x_dr_name`.

### Frame

- Source choices: Uncut Lenses Only, Frame To Come, Edged Retrieve Trace and
  Edged Lenses Only.
- User fields include model, colour, A, B, DBL and mounting.
- A, B and DBL are required for the tested Frame To Come flow.
- Mounting choices: Plastic, Metal, Groove Nylon / Metal Groove and Drilled Rimless.
- ED is currently disabled; the page states that automatic ED calculation is
  under test.
- Entering/changing model can clear colour. Set and validate dependent fields
  in model -> colour order and re-check both before submission.
- Visible labels do not map one-to-one to the output. The tested "Frame To Come"
  order produced technical fields including `frame_source:NO TRACE - UNCUT`,
  `frame_status:ENCLOSED`, `frame_tracing:NO TRACE`, `frame_edge:EDGED`, plus an
  `EDGED` item block. Preserve verified transformation rules rather than
  inferring output values from labels.

### Lens selection

Dependency order:

```text
Lens dispense -> Rx type -> material -> design/type -> colour/option
                                      |
                                      +-> Rx ranges
                                      +-> visible prescription fields
                                      +-> compatible treatments/extras
```

The baseline order used pair dispense (`P`), Single Vision (`S`), 1.50 Plastic
and Clear. The `.rx` file emits separate OD and OS code/description fields even
when the UI mirrors a pair selection.

### Prescription

Observed constraints for the tested lens:

| Field | Contract |
| --- | --- |
| Sphere | Required per dispensed eye; tested dynamic range `-25.00` to `+25.00` |
| Cylinder | Quarter/eighth-dioptre pattern; tested dynamic range `-25.00` to `+25.00` |
| Axis | HTML range `0` to `180`; normally dependent on cylinder |
| Add | Disabled for Single Vision; product-dependent when enabled |
| Far PD | Required per eye, range `14.0` to `40.0` |
| Near PD | Dependent/disabled for the tested Single Vision order |
| Seg height | Product-dependent, observed minimum `7.0` when enabled |
| OC from bottom | Optional/product- and eye-dependent |
| Prism/thickness | Hidden behind additional panels and dependency validation |

Validation defect observed during the first submission:

- With cylinder `+0.00`, Submit enabled axis and demanded a value between
  `0` and `180`.
- Entering `0` allowed submission.
- The resulting order summary and `.rx` file omitted axis, implying that zero
  was normalized away after validation.

Server-side validation in OptiLens Local must be authoritative. Client-side
validation should mirror it for usability but must not be the only gate.

### Instructions/order notes

LabLink field:

```text
order[instructions]
```

Verified `.rx` output:

```text
instructions:<submitted text>
```

The baseline TEST instructions were confirmed in the form, order summary and
processed `.rx` file. Normal typing works without clipboard access.

## 5. `.rx` v1.0 structure

The sample is a line-oriented key/value envelope, not binary data:

```text
file_version:1.0
hashrouting_key:<secret>
start_order
...order keys...
item_start
...item keys...
item_end
...repeat item blocks...
end_order
```

### Sections and keys observed

| Section | Keys |
| --- | --- |
| Routing | `file_version`, `hashrouting_key`, `agent_name`, `agent_version` |
| Account | `lab_num`, `cust_num`, `cust_seq_num`, `x_remote_operator` |
| Identity | `date_ordered`, `order_id`, `x_gk_order`, `x_gk_guid` |
| Patient/provider | `patient_name`, `ship_name`, `dr_name`, `x_dr_name` |
| Frame | source/status/tracing, model, colour, A/B/DBL, radial angle, mounting, dress, edge |
| Lens OD/OS | colour, material and style codes plus descriptions |
| Item blocks | `sku`, `item_source`, `item_description`, `item_quantity`, `item_side`, `item_part_rx` |
| Rx | `lens_sv_mf`, `x_rx_type`, `x_rx_reading`, `x_rx_dispense`, `x_rx_balance`, eye powers/PD, height qualifier |
| Notes | `instructions` |

Do not assume every key is optional because the baseline happened to omit it.
Generate a schema from multiple accepted order types before implementation.

### File-writing requirements to prove

- Exact filename-generation rules.
- Exact encoding; the sample is ASCII-compatible text with CRLF endings.
- `hashrouting_key` generation/signature rules.
- `x_gk_order` and `x_gk_guid` ownership/generation rules.
- Required key order and marker placement.
- Atomic delivery: write a non-`.rx` temporary file, flush/close it, then rename
  to the final `.rx` name so Innovations never reads a partial file.
- Duplicate/idempotency behaviour.
- Success, rejection and quarantine folder behaviour.

## 6. Treatments, coatings and add-ons

### Baseline submitted order

No coating or add-on was selected. Its `.rx` file therefore proves notes and
basic order mapping only. The two item blocks were a generic Rx item and an
`EDGED` item; they do not prove treatment mapping.

### Available-data response

The treatment response grouped options into categories including:

- `A`: anti-reflective
- `C`: coating
- `O`: other/add-ons
- `T`: tinting type
- `K`: tint colour
- `P`: tint percentage
- user-defined groups for Lab Supply and Frame Collection

The raw response is broader than the visible form. Visibility and allowed
values depend on the selected account, frame and lens combination.

### Prepared treatment test (not yet submitted)

Current prepared TEST order selections:

| Group | Selection | Internal value |
| --- | --- | --- |
| Tinting | Solid Tint | `6641` |
| Tint colour | BROWN | `1132` |
| Tint percentage | 15% (Light tint) | `6600` |
| Anti-reflective | Standard AR (1Yr Wty) | `1124` |
| Instructions | Explicit coating/add-on mapping TEST note | n/a |

For 1.50 Plastic / Single Vision / Clear, the actual visible UI exposed only
Tinting and Anti-reflective. Coating, Other, Lab Supply and Frame Collection
were present in the HTML but hidden, had no valid user-selectable values for
this order, and must not be forced into the payload. A temporarily selected
hidden Coating value was cleared before the test was preserved.

The prepared order has **not** been submitted. Future work must obtain explicit
confirmation immediately before Submit, then:

1. Record the LabLink order number and summary.
2. Locate the matching new `.rx` file in `processed/hashref`.
3. Diff it against baseline order `51283008`.
4. Identify treatment keys and/or item blocks generated for tint and AR.
5. Verify the instructions field again.
6. Log out after verification.

## 7. Current Classic Visions website model

Existing building blocks:

- `src/features/lens-assistant/types.ts` defines the website recommendation
  input and Rx draft types.
- `src/features/lens-assistant/validation.ts` provides client validation.
- `src/features/lens-assistant/api.ts` persists owner-scoped
  `rx_order_drafts`.
- `src/pages/LabLinkEmbedPage.tsx` shows a saved draft beside the current
  manual LabLink handoff.
- `supabase/migrations/20260710120000_smart_customer_journey_first_release.sql`
  creates private draft persistence and controlled recommendation rules.

Current gaps for direct order creation:

- LabLink/Innovations customer and laboratory identifiers.
- Monocular far/near PD and optical/segment heights.
- Frame source, trace state, model, colour, mounting and technical mappings.
- Lens material/design/option external codes per eye.
- Tint, AR, coating, other and user-defined treatment groups.
- Instructions/order notes.
- Repeatable item/SKU blocks.
- `.rx` routing/signature metadata.
- Submission state, idempotency key, retry count, file hash and timestamps.
- Innovations/LabLink order numbers and downstream processing status.
- Structured validation errors and dead-letter/replay support.

## 8. Recommended implementation boundary

Use one canonical, versioned order DTO shared by the public website and
OptiLens Local. Keep UI models, Innovations file rendering and vendor/API
transport as separate adapters.

Suggested states:

```text
draft
ready_for_validation
validated
queued_for_office
claimed_by_optilens
rx_rendered
delivered_to_watch_folder
processed_by_innovations
rejected
retry_pending
cancelled
```

Minimum guarantees:

- Cloud outbox row is immutable after claim except for controlled state changes.
- OptiLens Local claims with a lease and idempotency key.
- One logical order produces at most one active `.rx` delivery.
- The emitted file hash and final filename are persisted.
- OptiLens Local monitors processed/error destinations and reports the outcome.
- Secrets remain in the OptiLens Local vault, never in Supabase order payloads.
- Patient data is minimized, encrypted in transit, access-controlled and
  omitted from ordinary logs.
- Catalogue and treatment codes are versioned snapshots so later catalogue
  changes cannot silently alter an already-approved order.

## 9. Required test matrix before production

Capture an accepted `.rx` fixture and expected diff for each case:

1. Baseline pair Single Vision order (complete: `51283008`).
2. Tint + colour + percentage + AR (prepared, pending confirmation/submission).
3. Visible coating-only combination.
4. One to three visible Other add-ons.
5. Lab Supply and Frame Collection values where the account/lens permits them.
6. Progressive with ADD, monocular PDs and segment heights.
7. Bifocal/trifocal.
8. Right-eye-only and left-eye-only.
9. Split Rx.
10. Prism and second-prism fields.
11. Special thickness/base curve/slab-off.
12. Trace file, retrieved trace and standard shape.
13. Each frame source and mounting.
14. Invalid/out-of-range Rx rejection.
15. Duplicate delivery/idempotency behaviour.
16. Watch-folder processing failure and replay.

Only sanitized fixtures may be committed. Replace names, routing secrets,
GUIDs and production identifiers while preserving syntax, line order and field
shape.
