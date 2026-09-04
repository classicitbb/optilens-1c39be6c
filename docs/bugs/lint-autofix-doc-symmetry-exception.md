Doc-Symmetry-Override: true
Rationale: These files were only touched by automated eslint --fix (var→const, let→const). No functional or behavioral changes were made. Pure code-style compliance — no user-facing documentation updates are warranted.

Affected files:
- src/components/account/sections/HelpdeskTicketsSection.tsx (let → const)
- src/components/admin/EmailDeliveryHealthCard.tsx (let → const)
- src/features/rx-order/embed/rx-order-engine.js (var → const)
- src/pages/admin/settings/EmailPreviewsPage.tsx (let → const)
