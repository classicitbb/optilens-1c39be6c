

# Coatings Menu Restructure + Full-Fledged Coating Pages

## Summary

Restructure the Coatings mega-menu to match the reference image (3 columns: Premium Performance, Everyday Protection, Resources), upgrade the 5 coating product pages from simple `CoatingArticleLayout` stubs to full-fledged feature pages matching the lens page pattern, and convert the 2 resources pages into blog-post-linked menu items.

## Menu Structure (Header.tsx)

Replace the current single-section Coatings menu with:

```text
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ Premium Performance      │ Everyday Protection      │ Resources                │
│ ──────────────────────── │ ──────────────────────── │ ──────────────────────── │
│ UltraClear AR (Super AR) │ Scratch-Resistant        │ How AR Coating Works     │
│ BlueBlock AR (BlueGuard) │ UV Shield - UVA, UVB, BV │ Caring for Your Coated   │
│ Mirror Finish            │ Hydrophobic & Oleophobic │   Lenses                 │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

- Resources links point to `/knowledge/how-ar-coating-works` and `/knowledge/caring-for-coated-lenses` (blog post routes).

## Full-Fledged Coating Pages (5 pages)

Each page upgraded from the simple `CoatingArticleLayout` to a rich feature page with the same pattern as the lens pages:

- **Hero section** with eyebrow badge, title, description
- **Key Benefits grid** — 4 cards with icons
- **How It Works / Technology section** — detailed explanation
- **Ideal For cards** — wearer profile cards
- **CTA section** — contact/shop

### Pages to upgrade:
1. **UltraClearARPage** (`/coatings/ultraclear-ar`) — Premium multi-layer AR system, night driving, cosmetic clarity
2. **BlueBlockARPage** (`/coatings/blueblock-ar`) — Blue-violet management + AR, digital comfort
3. **ScratchResistantPage** (`/coatings/scratch-resistant`) — Hard coat durability foundation
4. **UVShieldPage** (`/coatings/uv-shield`) — UVA/UVB/BV filtering
5. **HydrophobicOleophobicPage** (`/coatings/hydrophobic-oleophobic`) — Water/oil repellent top coats

## Blog Post Routing for Resources

- Remove the standalone page routes for `/coatings/how-ar-coating-works` and `/coatings/caring-for-coated-lenses`
- Add redirect routes from those old paths to `/knowledge/how-ar-coating-works` and `/knowledge/caring-for-coated-lenses`
- These are published as internal blog/knowledge articles and linked from the menu

## Files to Modify

- **`src/components/Header.tsx`** — Replace Coatings menu sections
- **`src/pages/coatings/UltraClearARPage.tsx`** — Full feature page
- **`src/pages/coatings/BlueBlockARPage.tsx`** — Full feature page
- **`src/pages/coatings/ScratchResistantPage.tsx`** — Full feature page
- **`src/pages/coatings/UVShieldPage.tsx`** — Full feature page
- **`src/pages/coatings/HydrophobicOleophobicPage.tsx`** — Full feature page
- **`src/App.tsx`** — Update routes (remove HowAR/Caring standalone pages, add redirects to knowledge)

## Files to Delete (content moves to blog)

- `src/pages/coatings/HowARCoatingWorksPage.tsx` — content becomes a blog post
- `src/pages/coatings/CaringForCoatedLensesPage.tsx` — content becomes a blog post

