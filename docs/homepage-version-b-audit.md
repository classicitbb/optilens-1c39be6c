# Homepage Version B — audit, rationale, and fill-in list

**Date:** 2026-08-08
**Status:** Admin-preview prototype. Version A (the live homepage) is unchanged and remains the default for every visitor.

---

## 1. How to view it

Sign in as an admin → account dropdown (top right) → **Homepage version** → **B**.

The choice is stored per-browser in `localStorage` under `cv:home-version`, defaults to `a`, and is only rendered for users where `hasAccess` is true (the same condition that shows the Admin link). No public visitor can reach Version B.

---

## 2. Audit of the current homepage (Version A)

The current page is well-built and the audience switcher is a genuinely good idea. The problems are almost entirely about *depth* and *who the page converts*.

### 2.1 Conversion

| Issue | Detail |
| --- | --- |
| **No conversion path for a new B2B visitor** | The professional hero CTA is *"Start an Rx order"* → `/lens-assistant`. That only makes sense to an existing, signed-in trade customer. A new optician who's never heard of Classic Visions has nothing to click. |
| **Trade signup is buried in a dismissible banner** | `AccountRequestBanner` is the only route to trade signup on the homepage, and it can be closed permanently. The single most valuable action on a B2B site is one dismissal away from disappearing. |
| **The store, price list, and Rx lab services are invisible** | Six unique internal links in `<main>` total. None to `/store`, `/rx-lab-services`, `/professionals/price-list-request`, or any lens or coating page. |
| **No proof of any kind** | No stats, no policies, no partner names, no testimonials, no "we've been doing this since…". A wholesale buyer choosing a lab is making a supply-chain decision and needs reassurance. |
| **Nothing for existing customers** | Freight, returns, remakes, repairs — the things that keep a trade account — appear nowhere. |

### 2.2 SEO

| Issue | Detail |
| --- | --- |
| **Thin content** | 308 words in `<main>`. For a commercial homepage in a competitive category this is far below what's needed to rank. |
| **H1 carries no search intent** | *"Clear vision starts with the right next step."* — no product, no category, no location. Nobody searches this. |
| **Almost no internal linking** | The homepage is the strongest page on any domain. Passing six links means the lens, coating, and service pages get almost no internal equity. |
| **Minimal structured data** | Only `WebSite` + a bare `Organization`. No `LocalBusiness`, no `Service`/`OfferCatalog`, no `FAQPage`, no `areaServed`, no `@id` graph linking. |
| **Only four H2s** | Very little semantic structure for a crawler to work with. |

### 2.3 AEO (answer engines / LLMs)

| Issue | Detail |
| --- | --- |
| **No definition sentence** | Nothing on the page says plainly *what Classic Visions is*. An AI asked "who supplies prescription lenses in Barbados?" has nothing quotable to lift. |
| **No FAQ, no `FAQPage` schema** | The highest-leverage AEO surface is entirely absent. |
| **The B2B/B2C boundary is never stated** | A patient asking an assistant "can I buy glasses from Classic Visions?" gets no answer, and the assistant is likely to guess wrong. |
| **No entity signals** | No `knowsAbout`, no `areaServed`, no `contactPoint`, no service catalogue for a model to ground on. |

### 2.4 Design system

Not a Version A fault, but found while building: `--primary` **inverts to teal in dark mode**, so any large field painted with `bg-primary` or `bg-gradient-primary` (the live `CTA` component does this) turns teal instead of navy. Version B introduces a `surface-deep` token that stays navy in both themes. **Worth applying to `CTA.tsx` and `Hero.tsx` regardless of which version ships.**

---

## 3. What Version B does differently

| Metric | A | B |
| --- | --- | --- |
| Visible words in `<main>` | 308 | 1,478 |
| Unique internal links in `<main>` | 6 | 59 |
| `<h2>` sections | 4 | 9 |
| JSON-LD blocks | 2 | 4 (`Organization`+`LocalBusiness`, `WebSite`, `Service`+`OfferCatalog`, `FAQPage`) |
| FAQ entries | 0 | 9 |

### Section architecture

1. **Hero** — B2B-first H1 (*"Wholesale prescription lenses, made in the Caribbean"*), audience switcher retained, primary CTA changed to **Apply for a trade account** with *"Already a customer? Start an Rx order"* as the secondary. Immediately below the H1 sits the **answer-first definition sentence** — one self-contained, quotable line naming the entity, category, offering, customer type, and service area. This is the single line an AI assistant is most likely to lift.
2. **Proof rail** — four published, defensible facts (lab location, same-day-before-2 PM processing, Caribbean freight, index 1.50–1.74). No unverified numbers.
3. **What we supply** — six capability pillars, each with three sub-links. Real internal linking into the money pages.
4. **Lens & coating index** — 24-link keyword-dense grid across vision correction, lifestyle lenses, coatings, and specs. This alone is most of the SEO lift.
5. **Onboarding path** — four steps, each with a named next action and a link. Directly serves the "slick, natural onboarding" goal.
6. **After the sale** — support, freight, remakes, and customer-supplied frames, each linking to the published policy. This is the section that speaks to *existing* customers, which A has nothing for.
7. **Trade partner voices** — renders only when real quotes exist. Currently shows a marked, non-live content slot rather than invented testimonials.
8. **FAQ** — nine answer-first Q&As, rendered **open** (not behind a disclosure — collapsed content is weaker for crawlers and AI fetchers), plus `FAQPage` schema.
9. **Patient lane** — states the B2B/B2C boundary explicitly and routes patients to the retailer finder and patient guides.
10. **Closing CTA** — trade account + price list + phone.

### Design language

Follows *Meridian Precision* rather than inventing a new look:

- Deep navy field (`surface-deep`) as the anchoring material for hero, support band, and closing CTA.
- Playfair Display serif for monumental headlines; Space Mono micro-labels at `tracking-[0.28em]`.
- Gold used only structurally — a hairline rule before every eyebrow, a single 14px rule above the closing headline. Never decorative.
- Teal as the signal colour for icons, links, and active states.
- Concentric hairline optical rings with cross-axes as the recurring geometric motif.
- Hairline `gap-px` grids (border-coloured background showing through card gaps) instead of drop-shadowed floating cards — closer to a technical drawing than a SaaS landing page.

---

## 4. ⚠ Fill-in list — everything Version B needs from you

All of these live in one place: `PLACEHOLDERS` at the top of
`src/components/home-prototypes/homeVersionBContent.ts`.

| Field | What's needed | Where it appears |
| --- | --- | --- |
| `foundingYear` | Year the lab was established, e.g. `"1987"` | Hero eyebrow ("Est. …") and `foundingDate` in schema. Currently omitted from both. |
| `accountApprovalTime` | e.g. `"1–2 business days"` | Onboarding step 01. Falls back to *"We confirm receipt the same working day"* — **please confirm that fallback is true**. |
| `standardTurnaround` | e.g. `"3–5 business days"` | Onboarding step 04 and FAQ 07. Falls back to a non-committal phrasing. |
| `servedTerritories` | Islands you actively ship to, in volume order | Not yet wired into copy — will strengthen `areaServed` in schema and the FAQ on delivery. |
| `testimonials` | Three approved quotes: quote, name, role, practice | Section 7. Until supplied, a marked non-live slot renders instead. |
| `partnerLogos` | Supplier / brand logos (name + asset path) | Credibility strip below the hero. Section is hidden entirely while the array is empty. |

### Claims to verify before this goes public

These are carried over from copy **already published** on the live site, but they should be confirmed as still accurate before appearing on the homepage:

- "Same-day processing on orders placed before 2 PM" (from `Features.tsx`)
- "Index 1.50 – 1.74" material range (from the navigation registry)
- Address: Uplands Factory, Four Roads, Saint George, BB20031, Barbados
- Phone: +1 246 433-4928
- That Classic Visions does **not** sell direct to the public (stated explicitly in FAQ 01 and the patient lane — this is a strong claim and should be correct)

---

## 5. If Version B is promoted

1. Fill in the `PLACEHOLDERS` block and verify the claims above.
2. Consider a small number of copy passes on the sharper lines (*"Everything that happens after the order"*, *"One trade account. The whole bench covered."*) if they don't sound like the house voice.
3. Apply the `surface-deep` token to `CTA.tsx` and `Hero.tsx` so the dark-mode teal-field bug is fixed in Version A too.
4. Add an `og-default.jpg` that reflects the new positioning (schema references it).
5. Swap `Index.tsx` to render `HomeVersionB` unconditionally, keep `HomeVersionA` around for one release, then delete the prototype folder and the header switch.

---

## 6. Files touched

**New**

- `src/components/home-prototypes/homeVersionStore.ts` — `useSyncExternalStore` store, localStorage-backed, cross-tab aware, safe when storage is blocked.
- `src/components/home-prototypes/HomeVersionSwitch.tsx` — the admin dropdown control.
- `src/components/home-prototypes/HomeVersionA.tsx` — the live homepage, moved verbatim out of `Index.tsx`.
- `src/components/home-prototypes/HomeVersionB.tsx` — the prototype.
- `src/components/home-prototypes/homeVersionBContent.ts` — all copy, links, and the placeholder block.

**Modified**

- `src/pages/Index.tsx` — now a two-line switcher.
- `src/components/Header.tsx` — one import, one `{hasAccess ? <HomeVersionSwitch /> : null}`.
- `src/index.css` — added `--surface-deep` / `--surface-deep-foreground` to both themes (additive only).
- `tailwind.config.ts` — registered the `surface-deep` colour (additive only).

No existing component, route, or style was changed. Version A renders byte-identically to before.
