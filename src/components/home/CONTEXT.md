# Homepage context

- `HomePage.tsx` composes the public professional/patient home views.
- `CustomerJourney.tsx` owns the quick-start drawer, relationship guidance and optional shipping worksheet.
- `homeContent.ts` holds public copy and the returning customer's operational hero actions.
- The fixed site header is 64px tall. TaskFinder reserves a 44px row below it, keeping its original centered rounded handle clear of the hero text.
- The handle stays at the drawer's bottom edge. Primary Pointer Events with capture let users pull down to open and up to close; arrows, tap, Escape, outside pointer input and focus leaving are supported. Touch scrolling stays native inside the panel. At the bottom of the list, an additional upward swipe dismisses it.
- Drawer contents are inert while closed. Keep the panel within the viewport and leave outside space available for dismissal.
- Returning-customer presentation uses the existing `usePortalIdentity` cache, approved customer status and signed-in staff role. No permission or account-state changes belong here.
- Approved customers get order, tracking, supply, account and support actions. Acquisition prompts remain for visitors without portal access.
- Regenerate `npm run search:index` after public copy changes, and synchronize the release ledger after documentation updates.
