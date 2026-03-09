

## Plan: Full-fledged Lab Process Overview & Lens Ordering Tips Pages

Both routes currently fall through to the generic `ProfessionalsPortalPage` stub via `/professionals/:slug`. We'll create dedicated pages following the same pattern as `TracingCuttingGuidePage` and `DispensingTipsPage` (hero + breadcrumbs, sticky anchor nav, sectioned cards, back-to-top button).

### 1. Lab Process Overview Page
**File:** `src/pages/professionals/LabProcessOverviewPage.tsx`

Sections (anchored nav):
1. **Order Entry** — Rx submission channels (LabLink, phone, email), required fields, digital vs. paper
2. **Rx Verification** — Validation checks, transposition, base curve selection, hold reasons
3. **Surfacing** — Generator blocking, freeform vs. conventional, curve/power verification
4. **Coating & Treatments** — AR stack, hard coat, tint/mirror, UV cure, batch flow
5. **Edging & Mounting** — Trace-to-edge, bevel types, drill mount, rimless, safety compliance
6. **Quality Control** — Focimeter verification, cosmetic inspection, ANSI Z80.1 tolerances, reject criteria
7. **Dispatch & Tracking** — Packaging, carrier handoff, LabLink tracking events, delivery SLAs
8. **Turnaround Times** — Standard vs. rush timelines, what causes delays, how to expedite

### 2. Lens Ordering Tips Page
**File:** `src/pages/professionals/LensOrderingTipsPage.tsx`

Sections (anchored nav):
1. **The Complete Rx** — Monocular PD, seg height, fitting cross, OC, prism notation checklist
2. **Frame Data** — A/B/DBL/ED, trace file vs. manual entry, frame brand/model lookup
3. **Material & Index Selection** — When to use 1.50/1.56/1.60/1.67/1.74, thickness vs. weight vs. Abbe
4. **Coating & Add-on Stacking** — Correct ordering of AR, hard coat, tint, mirror, hydrophobic
5. **Special Orders** — Prism, slab-off, lenticular, atoric, double-segment, wrap/sport
6. **Common Mistakes** — Top 10 hold reasons with how to avoid each
7. **Digital Ordering via LabLink** — Step-by-step walkthrough, template orders, reorder from history
8. **Turnaround Expectations** — Standard vs. special, stock vs. Rx, when to call ahead

### 3. Routing Updates
**File:** `src/App.tsx`
- Add lazy imports for both new pages
- Add dedicated routes before the `/professionals/:slug` catch-all

### Summary of files
| Action | File |
|--------|------|
| Create | `src/pages/professionals/LabProcessOverviewPage.tsx` |
| Create | `src/pages/professionals/LensOrderingTipsPage.tsx` |
| Edit   | `src/App.tsx` — add lazy imports + routes |

