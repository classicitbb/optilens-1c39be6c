# ADR-001: Shipment intake pipeline (documents in, costed shipment and bank pack out)

**Status:** Proposed
**Date:** 2026-11-01
**Deciders:** Owner (Russell), whoever approves the lender/bank pack format

## Context

The costing workbench (`src/pages/admin/costings/*`) is a good manual editor. The goal is to remove the manual entry steps, so a receiving clerk drops in the documents and reviews exceptions only.

### What exists today (verified in the code)

| Piece | State |
|---|---|
| Document upload and PDF viewer | Works. `uploadShipmentDocuments` and `ShipmentEvidencePanel`. |
| Evidence links (field to page region) | Works, but each link is made by hand. |
| `document-ai` edge function | OCR only. It stores raw text, and `extracted_fields` holds just `page_count` and `confidence`. Nothing turns text into invoice number, FOB, currency or charges. |
| Calling `document-ai` | The only caller is the Settings "Test" button. No shipment screen invokes `extract`. |
| `shipment_document_templates` ("train the system") | Table and RLS exist. Nothing reads or writes it. |
| Production OCR | Disabled. Google refused to create the service account (STATUS.md). |
| `chargeProfiles.ts` | Learns typical charge rows per supplier from history. This is the one real "learning" piece, and it is deterministic and tested. |
| `shipment_documents.source_kind = 'email'` | Allowed by the schema, but no ingestion path exists. |
| `shipment-binder` edge function | Prints raw FOB, FXF and a charge list. It leaves out landed cost, multiplier, supplier name (it prints `supplier_id`), and per-line landed cost. It also doesn't use `computeShipmentDerivedTotals`, so a second, thinner version of the numbers sits in a Deno function. |
| `ShipmentDetailPage.tsx` | 1,165 lines. Supabase calls, FXF persistence, status and binder flow, and rendering are all in one place. |
| `useShipments.ts` | Every call uses `as any`, so the typed schema isn't protecting the cost logic. |
| `rx-capture-extract` | A working, metered pattern: the Lovable AI gateway, `gemini-2.5-pro`, a forced tool call, and output saved as a draft job. It already reads documents and images and needs no Google service account. |

In short, the plumbing (storage, evidence, review states, spend metering, binder) is built, but the step that saves clerk time, reading the document into fields, is missing. Training is also a stored table with no loop attached.

### Forces

- Landed cost is money. A wrong auto-filled number is worse than a typed one, so AI output must be a draft and a human must approve it. The existing migration already commits to this.
- Invoices are arithmetic. Line totals sum to the invoice total, and charges reconcile to the freight bill. This lets us check AI output automatically and send only mismatches to a person.
- Suppliers repeat. After a few approved shipments, one supplier's invoice layout is a known pattern.
- The bank pack is a presentation of data that already exists. It should be generated from approved data, not assembled again by hand.

## Decision

Build three deep modules and put the AI behind one seam. Do not keep growing the page.

### 1. `ShipmentIntake` (new, deep)

**Interface (small):**

```ts
ingest(shipmentId, documentIds[]): Promise<IntakeDraft>   // read + propose
approve(shipmentId, draft, corrections): Promise<void>    // one transaction
```

`IntakeDraft` holds proposed header fields, charges and lines. Each proposed value carries `confidence`, `evidence {documentId, page, bounds}` and `checks[]`.

**Behind the interface (hidden):**

- Document classification (supplier invoice, freight invoice, AWB, customs).
- Extraction through an `Extractor` adapter.
- Supplier template matching, which uses `shipment_document_templates` and applies `approved_field_mapping` first.
- Reconciliation checks:
  - the sum of line totals equals the invoice total;
  - FOB equals the lines;
  - the freight bill equals the charge rows;
  - the currency and exchange rate are plausible;
  - the invoice number is not already used (a duplicate check).
- Charge defaults from `chargeProfiles` for anything the documents don't state.
- Auto-creating evidence links from the extraction bounds, so nobody links by hand.

`approve` writes the shipment, charges, lines and evidence links in one RPC transaction. It then stores the clerk's corrections into the supplier template. That is the training loop: corrections become the mapping, and the next invoice from that supplier needs fewer fixes.

**Seam: `Extractor`.** Two adapters are real today, so this is a real seam and not a hypothetical one:
- `GeminiVisionExtractor` reads the PDF or image and returns structured fields through a forced tool call, copying `rx-capture-extract`. It needs no Google service account, so it is not blocked by the Google Console problem.
- `DocumentAiExtractor` is the existing OCR path, kept as a fallback or a second opinion.

An in-memory fake extractor makes the whole module testable with no network.

### 2. `LandedCost` (consolidate, deep)

Make `importCostings.ts` plus `computeLineCosts` the single source of the numbers. It takes the shipment, charges and lines, and returns the totals, multiplier, per-line landed cost and margin. Then:
- `shipment-binder` and the reports page both consume it, so the bank pack cannot disagree with the screen;
- the edge function imports the same pure module instead of re-deriving numbers.

The module is pure, so it is tested without a database. `computeLineCostsLinkedOrder.unit.test.ts` already shows the style.

### 3. `BankPack` (replace the thin binder)

**Interface:** `assemble(shipmentIds[], options): Promise<{ path }>`

This is one pack across many shipments: a cover index, then for each shipment its costing sheet, the supplier invoice, the freight invoice, the AWB, and the customs entry, in a fixed order that the bank agrees to. It uses supplier names, not UUIDs, and shows landed cost. It can only be made from `reviewed` or `locked` shipments. This is what makes "invoices gathered together are ready for the bank" true.

### Process change

| Today | Target |
|---|---|
| Create shipment, pick supplier, type header | Drop the documents (or forward the email), and the draft appears |
| Type each charge | Charges proposed from documents and history |
| Link evidence by hand | Evidence linked automatically |
| Review everything | Review only flagged fields (failed checks or low confidence) |
| Lock, then run a binder per shipment | Lock, then assemble a bank pack for any period |

Later, with enough trusted history for a supplier, a draft whose checks all pass can be auto-approved, with the person sampling a share of them. This only happens once the owner opts in.

## Options Considered

### Option A: Stay with Google Document AI OCR, then parse the text with rules
| Dimension | Assessment |
|---|---|
| Complexity | High. Per-supplier parsers are brittle |
| Cost | Per-page OCR plus maintenance |
| Scalability | Poor, since every new layout needs code |
| Team familiarity | Built, but blocked by the service account |

**Pros:** deterministic, and the plumbing exists.
**Cons:** it is still blocked, rules break on new layouts, and it doesn't learn.

### Option B (recommended): Vision LLM extraction behind the `Extractor` seam, checked by arithmetic, trained by approved corrections
| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | A per-document model call, already metered by `recordAiSpend` |
| Scalability | Good. New suppliers work on day one and improve with use |
| Team familiarity | High. It copies `rx-capture-extract` |

**Pros:** handles any layout, has no Google dependency, keeps the draft-then-approve rule, and the checks make it trustworthy.
**Cons:** model output varies, so the checks and the human review are required. There is a per-call cost.

### Option C: Outsource to a third-party landed-cost or AP-capture SaaS
**Pros:** fast to start.
**Cons:** your charge types, FXF and DHL rules, linked Rx orders and the bank pack are custom, so you'd still integrate heavily. It adds recurring cost and sends financial documents to a third party.

## Trade-off Analysis

B wins on time to value and on the "train the system" goal, because the template loop is simple to build once approval is a single transaction. The price is that correctness rests on the reconciliation checks, so they are the most important part of the design. A model call that fails to find the right invoice total should be flagged, never silently guessed.

## Consequences

- **Easier:** clerks review exceptions, not entire documents. The bank pack always matches the screen. New suppliers work immediately. Extractors can be swapped.
- **Harder:** a new `ShipmentIntake` module and one RPC transaction to maintain. The checks need real sample documents to tune.
- **Revisit:** the auto-approve threshold, once there is history. Document retention and privacy for financial documents sent to the model, which needs the owner's decision. Whether `ShipmentDetailPage` should be split further after this lands.

## Action Items (in order, each shippable alone)

1. [ ] **Collect 10 to 20 real past shipments** (supplier invoice, freight invoice, AWB, customs, and the final approved costing) as the test set. All accuracy claims depend on this.
2. [ ] Extract the pure `LandedCost` module and point the reports page and the binder at it (no behaviour change; fixes the thin binder numbers).
3. [ ] Build `ShipmentIntake.ingest` with the fake extractor plus reconciliation checks, tested against the sample set.
4. [ ] Add `GeminiVisionExtractor` (new edge function, modelled on `rx-capture-extract`, metered). Wire the "Documents" entry mode in `ShipmentDetailPage` to call `ingest`, and show the draft with flagged fields.
5. [ ] Add `approve` as one RPC transaction that also writes the supplier template.
6. [ ] Add `BankPack.assemble` for many shipments, with the agreed document order.
7. [ ] Add `payment_statement` document kind and many-to-many document-to-shipment links; add the `is_test` flag.
8. [ ] Replace `as any` in `useShipments.ts` with the generated types as each module is touched.

## Owner decisions (2026-11-01)

1. **One upload, mixed documents.** Staff upload everything for a shipment in one go, possibly with a payment/bank statement. Intake therefore classifies each file itself and adds a `payment_statement` document kind. A statement can cover several shipments, so it must link to many (today `shipment_documents.shipment_id` is single and non-null). The statement supplies the settlement method, the actual FXF and the bank-expense charge, and goes into the bank pack as proof of payment.
2. **Staff upload only.** Step 7 (email intake) is dropped from the plan.
3. **Hosted model is acceptable**, provided financial documents are not shared publicly or used to train someone else's model. This must be confirmed against the gateway's terms before go-live (see below). "Training" in this design means stored per-supplier mappings in our own database; no model is trained.
4. **Human sign-off stays on every shipment.** Auto-approval is out of scope. `approve` always requires a person, and checks only decide which fields are flagged for attention.

### Test data
Uploads can be marked `is_test`. Test shipments are excluded from supplier templates, charge profiles, reports and the bank pack, so they can't skew learning or the numbers. This is a flag we add; it does not exist yet.

### To confirm before go-live
The Lovable AI gateway's data-retention and no-training terms for the model used (`gemini-2.5-pro`), or switch the `Extractor` to a provider with a written zero-training commitment. The `Extractor` seam makes that a one-adapter change.
