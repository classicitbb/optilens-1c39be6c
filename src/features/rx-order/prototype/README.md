# Stock / supplies order prototype

Header refinement: the branding/demo-controls header and full account/title/badge row have been removed. The form starts with the identification fields beneath the prototype banner. The seeded full-catalog account is used by default; there is no visible view/account selector.

Throwaway design study. Question: can customer online orders and staff phone orders use the same account-priced supplies browser and lens-variant workflow while preserving the existing order sheet?

From the repository root:

```powershell
npx vite --config src/features/rx-order/prototype/vite.config.mjs
```

Open the local URL printed by Vite. Only the chosen Rx supplies preview layout remains. Legacy variant query parameters are removed on load; alternate layouts, preview tabs, step controls, switcher and arrow shortcuts are deleted. Identification contains only the three labelled fields, on one desktop row and wrapping on smaller screens.

The standalone Vite root imports only reusable presentation components and pure catalog logic from the application. It does not load the app shell, environment files, Supabase clients, persistence hooks or release actions. No application route or navigation registration is added. The normal application build does not include this entrypoint. Do not publish or promote the prototype directly; integrate the agreed design with the existing server-priced contracts after review.

Annotation refinement: the preferred Rx preview host is now the default. Its duplicate demonstration card is removed; order details, lines and the supplies browser are retained. The lens dialog imports the actual Rx `Seg` and `ComboBox` components and `comboOptions` / `repairTriple` functions. Choices can be made in any order and searched with the keyboard. The actual store `LensVariantGrid` supplies the compact descending matrix, rounded cells and Clear grid control. A new optional `addButtonLabel` prop changes only this embed's button to Add selected powers; the store default remains unchanged. Grid variant IDs map back to the original seeded row/column indices. Data stays seeded; no live cart callback is used. Local Tailwind compilation targets only the reused UI files.

Seeded scenarios: full catalog, supplies only, lenses only, and no stock pricing. All names, availability and prices are illustrative. Account switching clears lines to prevent carrying prices between accounts. Admin/customer mode demonstrates presentation only; it does not implement or alter authorization. The retained form uses the shared supplies renderer; the prescription workflow is outside this prototype.

Patient / order reference is one required field (20 characters); PO is separate and optional (15 characters). Lens material/design/option gate the sphere/cylinder or base-curve/ADD matrix. Pair quantities are pairs, at two lens units per pair; single-eye quantities are lenses. These commercial/unit assumptions require confirmation against the actual catalog during integration. Prices are BBD estimates before tax.

Barcode keyboard entry works with seeded codes: `2817201`, `2817200`, `DEMO-SV-1`. The slim camera view is a visual simulation; it never requests camera permission or decodes images. No physical scanner or camera hardware is verified. The optional price-to-empty-line-reference switch affects only the simulated payload and preserves explicit line references.

Review and simulated sync are in memory. Refresh clears the order. No automated tests were added for throwaway code. Run syntax/scoped lint checks and inspect the standalone browser flow; future production work needs normal component/contract coverage. The user selected this layout; keep the prototype as a local review artifact for further refinement before production implementation.

Local font: Plus Jakarta Sans, distributed under SIL Open Font License (see FONT-LICENSE.txt).

Admin visual fidelity: shared-ui.css imports src/styles/workspace.css directly, and the body opts into ws-admin/admin-tool. All prototype surfaces and semantic component colours reference the existing workspace tokens. Plus Jakarta Sans (400/600) and JetBrains Mono match admin typography; field heights match the Rx CONTROL size. No app shell, sidebar, backend or order hook is loaded.
