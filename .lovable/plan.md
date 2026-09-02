# Make Iris the only public storefront assistant

The store currently has a second chat widget ("Lens Assistant") that appears only on `/store` and product pages. Its answers are longer, better structured, and stream in as they are written. Iris gives shorter answers that appear all at once.

Plan: move that answering style and behaviour into Iris, then remove the duplicate widget entirely.

## What changes for visitors

- Iris answers store/lens questions in the same fuller, structured way: short intro, numbered or bulleted sections, **bold** key terms, a "Best for" style takeaway where it helps.
- Iris replies stream in word by word instead of appearing all at once.
- On an empty conversation Iris shows tappable starter prompts (lens choice, frame fit, coatings & upgrades comparison, shipping/returns & warranty).
- While waiting, Iris shows the "Just a moment…" loader.
- The separate Lens Assistant bubble disappears from `/store` and product pages. Iris's launcher, already present sitewide, is the only chat.

## Guardrail

The old widget's product knowledge was hardcoded in its backend, including fixed prices. That is not copied. Iris keeps grounding answers in the live catalog and knowledge base, so prices and product facts stay accurate and never invented.

## Technical changes

1. `supabase/functions/companion-assistant/index.ts`
   - Loosen the "2–6 sentences" formatting rule to allow structured, sectioned answers when the question is comparative or multi-part; keep the "answer only what was asked" and no-invention rules.
   - Fold the lens-specialist knowledge scope (materials, indexes, coatings, designs, Rx terminology, UV/eye health) into the system prompt as topic competence, with no hardcoded product or price list.
   - Switch the gateway call to `stream: true` and return the SSE body to the client.
2. `src/features/assistant/assistantGeneration.ts`
   - Replace `supabase.functions.invoke` with an authenticated `fetch` to the function URL, parse the SSE deltas, and emit incremental text through a callback. Keep the existing non-streaming fallback path when the stream fails, and keep the citations payload.
3. `src/features/assistant/CompanionAssistantContext.tsx`
   - Append streamed chunks to the in-flight assistant message so the transcript updates live.
4. `src/components/assistant/CompanionAssistant.tsx`
   - Add the starter suggestion chips shown only before the first visitor message.
   - Use the "Just a moment…" loading row while a reply is pending.
5. Remove the duplicate
   - Delete `src/components/LensChatbot.tsx` and its usage in `src/pages/Store.tsx` and `src/pages/StoreProductPage.tsx`.
   - Delete the `lens-assistant` edge function.
   - Update `src/tests/e2e/anonStorefrontCostSafety.e2e.test.tsx`, which mocks `LensChatbot`.

Unaffected: `/lens-assistant` (the prescription entry form), the portal Rx order form, and the admin copilot.

## Verification

- Build and test suite pass.
- Preview check on `/store`: only the Iris launcher is present; a coatings comparison question streams a structured answer with working starter chips.
