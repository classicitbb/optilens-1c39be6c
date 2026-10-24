# Rx Snap — prescription capture and draft intake

**Status:** proposed, not started
**Owner:** Russell Hunte
**Feature folder:** `src/features/rx-snap/`
**Depends on:** `src/features/rx-order/` (engine, prefill contract), `rx_order_submissions`
**Revision:** v2 — supersedes the template-locked v1 draft entirely. See §2.

---

## 1. What this is

Staff key prescriptions into the Rx Order Form by hand, from printed sheets, WhatsApp
photos, scans and PDFs. Rx Snap replaces the keying with **capture → parse → partial
draft → review → submit.**

The shape of the work it has to fit: **a person standing in front of a stack of orders,
photographing them one after another.** Snap, submit, snap, submit. They do not wait for
anything. The system parses in the background and a draft appears in a review queue for
each sheet. The staff member then turns to a screen — desktop or the same phone — and
walks the queue, correcting and releasing each draft.

**This is not a new form.** `src/features/rx-order/prefill/rxOrderPrefill.ts` already
turns a Lens Assistant draft into a partial `cv.rxorder/1` payload that the engine's
`restorePayload()` replays, with `markNeeded()` glowing the empty fields. Rx Snap is a
**second producer of that same payload**. A design that introduces a parallel intake
form is the wrong shape and should be rejected in review.

---

## 2. What changed from v1 — read this before building

The earlier draft assumed a **single known printed template** (the Courts Optical
Welches form) with fixed-position field crops. That is wrong as the primary design and
must not be built that way.

| v1 assumption | v2 reality |
|---|---|
| One known form layout | **Any sheet with a prescription on it.** Every optical store's paperwork differs; some send handwritten notes on letterhead with no grid at all. |
| Template registration is the core mechanism | **Notation understanding is the core mechanism.** Template recognition survives only as an optional accelerator (§6.3). |
| Unrecognised layout → manual fallback | **There is no fallback.** An unfamiliar layout is the normal case, not the error case. |
| Missing field → extraction failure | **Missing field → partial draft.** Absence is information, never failure. |
| Synchronous: upload, wait, review | **Asynchronous queue.** Capture never blocks on parsing. |

Optical prescription notation is a standard-ish written convention with a bounded set of
variants. The job is to understand the notation, not to memorise layouts. §7 catalogues
the variants that must be handled.

---

## 3. Governing principles

**1. A partial draft is a success, not a failure.**
Read what is on the sheet. Leave the rest empty and marked. A draft with four of twelve
fields filled has still saved four fields of typing. Nothing about a missing field
should read as an error to the user — no red, no "extraction failed", no retry prompt.

**2. Never return a guess where a flag will do.**
A flagged blank costs ten seconds of typing. A confidently wrong number costs a remake.
Every ambiguous call resolves toward `null` with a reason.

**3. Capture never blocks.**
The person with the stack of paper is the constraint. Photograph, queue, next. Parsing
happens behind them.

**4. A human releases every order.**
No auto-submit, ever, at any confidence level.

---

## 4. Capture modes

All four modes feed the same queue and produce the same drafts. They are entry points,
not separate pipelines.

### 4.1 Rapid single capture (primary, phase 1)
Camera opens, shutter, **immediate return to camera.** No preview, no confirmation, no
"processing" spinner. A small counter shows how many are queued. This is the mode the
person with the stack uses and it must feel like using a camera, not using software.

### 4.2 Mobile multi-select
Pick many photos from the gallery (or shoot a burst) and submit them together. One draft
per photo. Used by someone who photographed a stack earlier and is processing it later.

### 4.3 Desktop bulk upload
Drag in a folder of scans, or a multi-page PDF pack. **One draft per page by default**,
since Classic Visions receives one Rx per sheet. A multi-page PDF is split on page
boundaries, not analysed for content grouping.

### 4.4 Mobile order form — external customers (phase 4)
The same mobile surface given to customers who work on paper but have phones: they can
type an order *or* snap their own sheet, get a draft, edit it, and send it. This is the
commercial upside of the whole feature and the reason the capture surface should be built
mobile-first and account-scoped from the start, even while v1 is internal-only.

---

## 5. Architecture

```
capture (any of §4)
  → upload original to Supabase storage         ← permanent evidence, never deleted
  → enqueue rx_snap_jobs row (status: queued)   ← capture is DONE here; UI returns
  ─────────────────────────── async ───────────────────────────
  → normalise: EXIF rotate, auto-orient, deskew, PDF page split, downscale
  → detect: does this page contain a prescription at all?  (no → "no Rx found", §9.4)
  → [optional] template match → field-map accelerator (§6.3)
  → semantic extraction: vision model, notation-aware prompt, strict JSON out
  → validation grammar (§8) → per-field confidence + flags
  → build cv.rxorder/1 partial payload
  → create draft, status: ready_for_review
  ─────────────────────────────────────────────────────────────
  → review queue → staff edits → release → existing rx_order_submissions path
```

### Components

| Piece | Location | Notes |
|---|---|---|
| Job queue table + worker | migration + `supabase/functions/rx-snap-worker/` | Retries with backoff. A job that fails three times lands in the queue as an empty draft with the image attached — **never silently disappears.** |
| Extraction function | `supabase/functions/rx-snap-extract/` | Model call lives here, not in the client. Mirror the existing `voice-transcribe` function's shape. |
| Notation parser | `src/features/rx-snap/notation/` | Pure functions. Normalises the written variants in §7 into canonical values. Heavily unit-tested, no model dependency. |
| Validation grammar | `src/features/rx-snap/validate/rxGrammar.ts` | §8. Pure, unit-tested. The highest-value module in the feature. |
| Payload builder | `src/features/rx-snap/toRxOrderPayload.ts` | Emits `RxOrderPrefillPayload`. Mirror `rxOrderPrefill.ts` closely. |
| Capture surface | `src/features/rx-snap/capture/` | Mobile-first. §4.1 is the one that must feel fast. |
| Review queue | `src/features/rx-snap/review/` | §10. |
| Template accelerator | `src/features/rx-snap/templates/` | Optional, additive, phase 3. §6.3. |

### Do not

- Do not use Tesseract or classical OCR. Handwritten optical grids are its worst case.
- Do not make capture wait on extraction.
- Do not add fields to the Rx Order Form engine. If a value cannot be expressed in
  `cv.rxorder/1` today, raise it before building rather than widening the contract.
- Do not auto-transpose plus-cyl to minus-cyl. Flag it and let the checker decide.
- Do not discard the original image after extraction.

---

## 6. Extraction strategy

### 6.1 Semantic-first
The extractor is given the whole page and asked to find and read a prescription using
its understanding of optical notation — the same way a trained staff member reads an
unfamiliar store's paperwork. It returns a canonical JSON structure plus a per-field
confidence and, where possible, the bounding box it read each value from.

It is told explicitly: **report only what is present.** Absent fields come back `null`.
Inventing a plausible PD because most sheets have one is the single worst failure mode
in this feature.

### 6.2 Anchor on labels, not coordinates
The reliable invariants across layouts are the printed *words*: SPH / CYL / AXIS / ADD /
PD / SEG, and the row labels R / L / OD / OS. Locate those, then read the cells they
govern. This works on a grid, on a list, and on a handwritten note.

### 6.3 Template accelerator (phase 3, optional, additive)
Once the semantic path works, recognising a high-volume customer's form and applying a
known field map raises accuracy on that form — checkbox blocks in particular become a
pixel-density test rather than a model call, which is near-perfect and free.

This is **layered on top of the semantic path and must never gate it.** An unmatched
template silently falls through to §6.1. Adding a customer's form is then a new field map,
not new engineering.

The Courts Optical Welches form is the obvious first template, since its lower two-thirds
is ~40 checkboxes naming lens type, material, tint, coatings, mount and frame source —
each mapping directly to a catalogue enum.

---

## 7. Notation catalogue

The parser must handle these. This list is the specification for `notation/` and should
grow as real sheets arrive; every unhandled variant found in production gets a fixture
and a test.

### Eye identification
`RIGHT` / `LEFT` · `R` / `L` · `Rt` / `Lt` · `OD` / `OS` · `O.D.` / `O.S.`
Occasionally `OU` (both eyes) on an add or PD that applies to both.
Right precedes left on Classic Visions' inbound work — no reversal detection needed, but
**read the labels rather than assuming row order** so the parser survives new sources.

### Column / field labels
- Sphere: `SPH`, `SPHERE`, `DS`, `Sph.`
- Cylinder: `CYL`, `CYLINDER`, `Cyl.`
- Axis: `AXIS`, `AX`, `x`, `°`
- Add: `ADD`, `NEAR ADD`, `READING`, `NV ADD`, `ADD R` / `ADD L`
- PD: `PD`, `D.P.D.`, `N.P.D.`, `IPD`, `MONO PD`, `BINO PD`
- Heights: `SEG HT`, `SEG. HT.`, `OC HT`, `FITTING HEIGHT`, `FH`, `OC`
- Prism: `PRISM`, `Δ`, `BASE`, `BI` / `BO` / `BU` / `BD`

### Value forms
- Signs: `-1.25`, `−1.25` (en dash), `– 1.25`, `1.25-` (trailing sign), `+2.25`, `2.25`
- **Unsigned sphere and add are PLUS.** House rule, matches how the sheets are written.
- **Unsigned cyl is FLAGGED, not assumed** — see §8.
- Missing decimal point: `125` → `1.25`, `050` → `0.50`, `-75` → `-0.75`
- Leading-dot: `.50` → `0.50`
- Zero sphere: `PLANO`, `PL`, `PLANO DS`, `0.00`, `∞`, `—`
- No cylinder: empty, `DS`, `SPH`, `—`, `0.00`
- Axis: `140`, `065`, `x140`, `140°`, `AX 140`. **Always 0–180 integer.**
- Combined one-line: `-1.25 / -0.50 x 065`, `-1.25 -0.50 x 065`, `-1.25 DS`
- Prism: `1Δ BI`, `2 BU`, `0.5 base in`, `1^ BO`
- PD: single binocular `63` vs split mono `31.5 / 31.5`. A single value near 60–70 is
  binocular; a pair near 28–35 each is mono. Flag anything ambiguous.
- Add applying to both eyes written once, centred, or as `ADD 2.25 OU`
- Balance lens: `BAL`, `BALANCE` — record it, do not try to read a power from it
- Plus-cyl transposed prescriptions — detect, flag, **never auto-convert**

### Layout forms
- Standard grid, eyes as rows (most common)
- Eyes as columns
- Two-line handwritten: `OD -1.25 -0.50 x 065` / `OS -1.25 -0.25 x 140`
- Free handwritten note on practice letterhead with no ruled structure

---

## 8. Validation grammar

Pure functions in `validate/rxGrammar.ts`. Each rule produces a pass, or a flag carrying
a human-readable reason that surfaces in the review UI. **A flag never blocks the draft
from being created** — it marks a field for attention.

### Field-level
- **Axis:** integer 0–180. **Required whenever cyl ≠ 0.** A cyl with no axis is a
  misread, every time — flag, never infer.
- **0.25 steps:** sphere, cyl and add must land on a quarter dioptre. `0.13` means a
  decimal was misread.
- **Plausibility bands:** sphere ±20.00 · cyl ±6.00 · add +0.75 to +3.50. Outside →
  flag and leave empty.
- **Prism / base:** each requires the other.

### Sign handling — read carefully
Unsigned **sphere** and **add** are plus. That is the house rule and it is correct.

Do **not** extend it to **cyl**. The realistic failure mode is not that someone wrote
plus — it is that a faint or clipped minus stroke did not survive the photograph. Reading
`-0.25` as `+0.25` is a 0.50D error in the wrong direction that looks entirely plausible
to a checker. Unsigned cyl is flagged for one glance.

### Cross-field
- **Add ⇔ vision type.** Add present ⇒ progressive/bifocal. Single-vision marked *and*
  an add present ⇒ contradiction, flag both loudly.
- **Add symmetry.** Unequal adds are legitimate but rare — flag for confirmation.
- **Mutually exclusive selections.** Two lens materials or two lens types marked ⇒ flag
  both; either the read misfired or the sheet is genuinely ambiguous.
- **Duplicate detection.** Match on an Rx reference number where one exists, else on
  patient name + date + powers. Warn before a second draft of the same sheet is worked —
  photographing one sheet twice will happen constantly in the rapid-capture flow.

---

## 9. Draft completeness

### 9.1 Salient fields
A draft is created if **any** prescription value was read. The *salient set* — what makes
a draft releasable — is:

- Sphere for each eye present (or explicitly plano / balance)
- Where cyl is present, its axis is present
- A job/vision type

Everything else — PD, heights, prism, frame data, coatings, patient name, doctor — is
enriching. Absent means empty and marked, not failed.

### 9.2 States
| State | Meaning |
|---|---|
| `parsing` | in the queue |
| `partial` | draft exists, salient set incomplete — needs human input before release |
| `ready` | salient set complete, flags may still be outstanding |
| `no_rx_found` | no prescription detected on the page (§9.4) |
| `released` | submitted through the normal path |

### 9.3 Presentation
Show completeness as progress, never as error. "8 of 12 fields read" with the remainder
glowing via the existing `markNeeded()` treatment. No red, no failure language, no retry
prompt for an ordinary partial.

### 9.4 No prescription found
Still create a queue entry with the image attached, marked `no_rx_found`, so the staff
member can key it manually or delete it. A photograph that vanishes because the parser
found nothing is worse than a blank draft — the person with the stack has no way to know
it happened.

---

## 10. Review queue UX

Built for **walking a stack**, not for opening one order.

- List view: thumbnail, patient/reference, completeness, flag count, source image
- Open a draft → the Rx Order Form prefilled, **source image in a pane beside it**
- Clicking a field highlights the region it was read from on the image. This is the
  interaction that makes the feature worth having — without it the checker re-reads the
  whole sheet from paper and nothing has been saved. Requirement, not a nicety.
- Tab order lands on flagged and empty fields first
- **Release and advance** in one action — the next draft opens immediately. Someone
  clearing thirty drafts should never return to the list between them.
- Three field states: confident (plain) · uncertain (amber, tooltip carries the reason) ·
  empty (`markNeeded()` glow)

The original image stays attached to the submission permanently. When a lab dispute
arrives six months later you want the actual photograph, not a transcription.

---

## 11. Phasing

**Phase 1 — capture and evidence**
Upload from mobile and desktop, storage, queue table, drafts created *empty* with the
image attached. No extraction at all. Ships real value on its own (every order carries
its source image) and proves the plumbing under the flow that matters most.

**Phase 2 — semantic extraction**
`rx-snap-extract`, the notation parser, the validation grammar, partial drafts, the
review queue. Run in **shadow mode** first: extract on every sheet, log against what
staff actually typed, pre-fill nothing. Read the scoreboard for two weeks, then switch
pre-fill on for one or two people, then widen.

**Phase 3 — template accelerators + bulk**
Courts Welches field map and checkbox classifier. Desktop bulk/multi-page PDF. Second and
third customer templates driven by whatever volume data shows.

**Phase 4 — external customer mobile form**
Account-scoped mobile surface: type or snap, edit, send. The commercial play.

**Phase 5 — frame shape capture.** See the annex.

### The metric
Not accuracy. **Corrections per draft** and **seconds per order**, against the manual
baseline. If a checker corrects four of twelve fields, nothing was saved — the cost of
checking exceeded the typing. Around one correction per draft is a genuine win.

### Correction log
On every release, write `{ job_id, field, extracted_value, final_value, image_ref,
confirmed_by, confirmed_at }`. This is the feedback loop: it shows exactly which fields
and which sources fail, drives prompt and notation fixes, and computes the shadow-mode
scoreboard. Build it in phase 2, not later.

---

## 12. Data protection

These are patient prescriptions carrying patient names.

- Images get the same RLS treatment as the rest of the account data. Bucket is not
  public; access is per-account.
- Set a retention policy explicitly rather than by default.
- **Decided: images MAY leave Classic Visions infrastructure to reach a model API.**
  (Russell, 17 Sep 2026.) This unblocks the extraction design in §6 — a hosted vision
  model is the intended path and no on-premise inference is required.

Conditions that follow from that decision and are part of the build:

- **Send the image, not the identity.** Crop or mask the patient-name and doctor fields
  out of what is transmitted wherever the layout allows it. The powers are the thing
  being read; the name adds nothing to extraction accuracy and is the part that makes the
  payload personal data. Where the name cannot be separated from the region being read,
  send the page whole — but make that the exception, not the default.
- **Use a provider tier with no training on submitted data and zero or minimal retention.**
  Record the provider, model and tier here when chosen, and re-check the terms at each
  model change. A provider default that trains on inputs is not acceptable.
- **Transit and storage stay ours.** The model call is the only egress. The stored
  original never leaves Supabase, and the storage bucket remains private and per-account
  under RLS.
- **Log what was sent.** Each job records provider, model version and timestamp, so the
  question "which images went where" has an answer without an archaeology exercise.
- **Phase 4 makes this a customer-facing commitment.** When external optical stores upload
  their own patients' prescriptions, this processing needs to be stated in whatever terms
  they accept. Draft that language before the first external customer is onboarded, not
  after.

---

## 13. Definition of done — phase 2

- [ ] Rapid capture returns to the camera with no perceptible wait
- [ ] Every captured image produces a queue entry, including failures and `no_rx_found`
- [ ] Prescriptions are read from at least three structurally different layouts
- [ ] Partial drafts present as progress, never as error
- [ ] Notation variants in §7 are unit-tested without a model in the loop
- [ ] The validation grammar in §8 is fully unit-tested, including unsigned cyl
- [ ] Clicking a field highlights its source region
- [ ] Release-and-advance keeps the reviewer in flow across a stack
- [ ] Original images attached to submissions and durable
- [ ] Corrections logged; shadow-mode scoreboard shows corrections-per-draft below the
      agreed threshold
- [ ] `npm run lint`, `npm run test -- --runInBand`, `npm run build` pass
- [ ] `npm run qa:edge-smoke` run after the edge function deploy
- [ ] `src/features/rx-snap/CONTEXT.md` written; `STATUS.md` updated

---

## 14. Test fixtures available now

Two photographed Courts Optical Welches sheets.

**RX# 941677** — 9/3/2026, single vision, no add.
R: −1.25 / −0.25 / 140, DPD 34.0, seg ht 29.0 · L: −1.25 / −0.50 / 065, DPD 33.5,
seg ht 29.0 · Xtractive, Clarity QBL, Zyl insert · Dansk Black 150 · A 56, B 44, DBL 15

**RX# 941660** — 4 Sept 2026, progressive, photographed at 90° with a fold through the
page. R: −1.00 / −1.75 / 90, add +2.25 · L: −1.25 / −1.25 / 90, add +2.25 · CR-39 ·
Supply frame, Zyl insert · Kate Spade "Celeste/E" Black · A 54, B 39, DBL 15 ·
**Special instruction: RUSH**

The second sheet is the more valuable fixture, for two reasons. It arrives rotated 90°,
which the normalise step must handle without being told. And the fold runs directly
through the PD / NPD / seg-ht row where the digits crowd their cells — **the correct
behaviour on that row is to leave it empty and flagged.** An implementation that
confidently populates those cells has failed the test regardless of whether the values
happen to be right.

Also note `RUSH` in the special instructions. A rush note buried in an unread text field
is a service failure waiting to happen — scan free-text regions for `RUSH` / `URGENT` and
raise it as a banner on the draft.

---

# Annex — Frame shape capture (phase 5, separate track)

Photograph a frame, extract the lens aperture outline, emit an **OMA file as a sample
trace.** Shape only; **all sizing continues to be entered by the customer.**

### Pipeline sketch
photo → perspective correction against a known reference → segment the lens aperture
(the opening, not the frame outline) → contour extract → smooth → vectorise → OMA export

### Honest technical cautions
This is a harder problem than the Rx reading, and it should not be attached to the Rx
Snap phases as though it were a small addition.

- **Perspective is not a nuisance, it is the whole problem.** A frame photographed at any
  tilt yields a *distorted* shape, and a trace is nothing but shape. Without correction
  the output is confidently wrong in a way that is invisible until the lens does not fit.
  Correction needs a known planar reference in frame — a printed target sheet the frame
  sits on is the practical answer, and it means this cannot be a casual snapshot.
- **Frames are not flat.** Base curve and face-form wrap mean the aperture is a 3D curve
  being projected to 2D. Even a perfect head-on photograph has some error. For a *sample*
  trace that may be acceptable; it should be measured against real traced frames before
  anyone relies on it.
- **Lenses in vs out changes segmentation completely.** A demo lens with reflections,
  a tinted lens, and an empty rim are three different problems.
- **Rimless and semi-rimless have no aperture to find.** The shape is defined by the lens
  itself. Set expectations that this is a full-rim feature first.

### Framing
Treat the output as **a starting shape a lab tech refines**, never as a finished trace,
and say so in the UI. A validation pass against known-good traces — same frames, scanned
properly and photographed — should gate any rollout. If the shape error is material,
the honest answer is that this remains a nice-to-have on top of physical frame sending
rather than a replacement for it.

---

# Open decisions — need Russell's call before phase 2

1. ~~**Model API egress.**~~ **Decided 17 Sep 2026: yes.** See §12 for the conditions
   that come with it.
2. **Provider, model and tier** — must be a no-training, zero/minimal-retention tier.
   Record the choice in §12 once made.
3. **Corrections-per-draft threshold** for switching pre-fill on after shadow mode.
4. **Image retention period.**
5. **Phase 4 scope** — which customers get the mobile form first, and is it tied to
   existing portal accounts or a lighter-weight invite. Carries the terms-language work
   noted in §12.
