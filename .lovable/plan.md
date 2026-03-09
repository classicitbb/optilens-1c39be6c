
## Plan: Chemistrie Lens System Feature Page at `/professionals/chemistrie-lens-system`

### What I found

**Your existing site** (classicvisions.net/chemistrie) covers:
- Hero image + "Chemistrie Lens System" title
- Feature bullets: custom-made in-house, fits any frame, base curve matched, lightweight, 24 polarized colors, 5 titanium bridge colors, 3 magnet colors, square/round magnets, 12 Swarovski crystals
- Product text about magnetic clip technology
- Color swatch rows (solid, mirror, gradient)
- Style options: Magnets (gunmetal/gold/silver), Bridges (bronze/gunmetal/gold/silver/black), Swarovski crystals (12 colors)
- Chemistrie+ Reader Lenses section

**forecps.com** (the brand's own ECP site) covers these sub-products referenced in the screenshot dropdown:
- **Sun** — polarized clip-ons (forecps.com/chemistrie-sun)
- **Reading** — Chemistrie+ readers
- **Driving Lenses** — specialty tints for driving
- **Blue Light** — Chemistrie Blue clip (forecps.com/chemistrie-blue)
- **Avulux** — migraine & light sensitivity
- **FL-41** — rose-tinted for light sensitivity
- **3D** — 3D cinema clip
- **Color Deficiency** — EnChroma-style clip

**Current page** at `/professionals/chemistrie-lens-system` is just a 2-line placeholder in `ProfessionalsPortalPage.tsx` using the generic catch-all template.

---

### Approach

Replace the generic portal catch-all for this slug with a **dedicated full-featured page** rendered at the same URL. The page will be a self-contained React file (`src/pages/ProfessionalsChemistriePage.tsx`) that uses the existing `Header` + `Footer` shell. The router in `App.tsx` will get a specific route before the catch-all so this slug gets its own page.

---

### Page Layout (7 sections)

```text
┌─────────────────────────────────────────────────────────┐
│  HERO  (split: left photo | right dark panel)           │
│  Chemistrie Lens System · "For Eyecare Professionals"   │
│  3 bullet checkmarks  ·  CTA: Contact / Order           │
├─────────────────────────────────────────────────────────┤
│  STAT BAR  1M+ Clips Sold · #1 Best Selling · 100+ Labs │
├─────────────────────────────────────────────────────────┤
│  ABOUT SECTION  (text left | product image right)       │
│  Magnetic Lens Layering Technology intro                 │
│  "Fits virtually any frame, base curve matched"         │
├─────────────────────────────────────────────────────────┤
│  PRODUCT LINE CARDS  (8 tiles, 2×4 or 4+4 grid)        │
│  ☀ Sun  📖 Reading  🚗 Driving  💡 Blue Light           │
│  🌿 Avulux  🌸 FL-41  🎬 3D  🌈 Color Deficiency        │
│  Each card: icon, title, description, link to forecps   │
├─────────────────────────────────────────────────────────┤
│  STYLE OPTIONS (tabs: Sunlens Colors | Bridges/Magnets  │
│  | Swarovski)                                           │
│  Tab 1: 3 swatchbar rows (Solid / Mirror / Gradient)   │
│  Tab 2: Magnet colors + Bridge colors as chips         │
│  Tab 3: Swarovski crystal names grid                   │
├─────────────────────────────────────────────────────────┤
│  KEY SPECS  (icon grid, 3-col)                          │
│  Custom-made in-house · Fits any frame · Base curve    │
│  matched · Extremely lightweight · Square or Round      │
│  Magnets · 100% UV protection                          │
├─────────────────────────────────────────────────────────┤
│  CTA STRIP  (dark bg, contact + order buttons)         │
│  "Order Chemistrie for Your Practice"                  │
│  [Contact Us]  [Apply for Trade Account]               │
└─────────────────────────────────────────────────────────┘
```

---

### Files to create / modify

1. **`src/pages/ProfessionalsChemistriePage.tsx`** — new dedicated page (all content inline, no external images required — use Unsplash optical URLs for lifestyle shots)
2. **`src/App.tsx`** — add a specific route `/professionals/chemistrie-lens-system` **before** the `/professionals/:slug` catch-all so this gets its own component

### Routing change
```tsx
// BEFORE (catch-all handles it):
<Route path="/professionals/:slug" element={<ProfessionalsPortalPage />} />

// AFTER (specific route first):
<Route path="/professionals/chemistrie-lens-system" element={<ProfessionalsChemistriePage />} />
<Route path="/professionals/:slug" element={<ProfessionalsPortalPage />} />
```

### Content sourcing
All content from your classicvisions.net page + forecps.com — no fabricated claims. External links to forecps.com sub-pages (Sun, Blue, ChemTech) will open in a new tab so professionals can get full product detail direct from the brand.
