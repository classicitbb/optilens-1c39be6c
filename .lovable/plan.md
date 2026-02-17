
# ZenVue Brand Microsite — Integrated Subsite

## Overview
Build ZenVue as an embedded "parasite" microsite within the existing app. All ZenVue pages live under `/zenvue/*` routes, share the main app's Footer but have their own Header, design system (obsidian/steel-blue theme, DM Sans + Crimson Pro fonts, 0rem border-radius), and internal navigation. The main site's Header gets a "ZenVue" link replacing the current external brand links.

## Architecture

The ZenVue subsite is a self-contained section with:
- Its own layout wrapper (`ZenvueLayout`) providing a dedicated Header, Footer reuse, and floating LensAdvisor chatbot
- Its own CSS variables scoped under a `.zenvue` class (similar to how `.admin-tool` works today)
- Routes nested under `/zenvue/*` in App.tsx
- Discreet "Back to OptiLens" link in the ZenVue header

## Routes

| Route | Page | Component |
|-------|------|-----------|
| `/zenvue` | Home / Landing | `ZenvueHome` |
| `/zenvue/brilliance` | Brilliance Progressive | `ZenvueBrilliance` |
| `/zenvue/single-vision` | Single Vision Lenses | `ZenvueSingleVision` |
| `/zenvue/sundun` | SunDun Polarized | `ZenvueSunDun` |
| `/zenvue/darkun` | Darkun Photochromic | `ZenvueDarkun` |
| `/zenvue/compare` | Compare Products | `ZenvueCompare` |
| `/zenvue/wholesale` | Become a Partner | `ZenvueWholesale` |

## Design System (CSS)

A `.zenvue` scoped block in `index.css` overrides CSS variables:

- Primary: steel-blue `216 19% 26%`
- Background: near-white / obsidian-dark
- Fonts: DM Sans (body) + Crimson Pro (headings) via Google Fonts import
- Border-radius: `0rem` (sharp corners)
- Full light/dark mode support
- Custom gradients and shadows matching the obsidian aesthetic

## Changes to Existing Code

### 1. Main Site Header (`Header.tsx`)
- Replace the external `ZENVUE_BRANDS` links (currently pointing to `zvuedemo.lovable.app`) with internal `/zenvue/*` routes
- Add a top-level "ZenVue" nav link pointing to `/zenvue`
- Update mobile menu similarly

### 2. App Router (`App.tsx`)
- Add `/zenvue/*` route group using `ZenvueLayout` as the parent
- Nest all 7 ZenVue page routes inside

## New Files

### Layout and Navigation
| File | Purpose |
|------|---------|
| `src/components/zenvue/ZenvueLayout.tsx` | Layout wrapper with ZenVue header, outlet, shared footer, LensAdvisor |
| `src/components/zenvue/ZenvueHeader.tsx` | Sticky header: ZenVue logo, nav links (Home, Brilliance, Single Vision, SunDun, Darkun, Compare), "Shop Now" button (links to `/store`), "Become a Partner" button, hamburger menu, discreet "Back to OptiLens" icon-link |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/zenvue/ZenvueHome.tsx` | Landing: Hero ("Clarity, Comfort, Confidence"), Availability Banner, Brand Story, Products grid (3 cards), Why ZenVue benefits (4 cards), CTA |
| `src/pages/zenvue/ZenvueBrilliance.tsx` | Brilliance Progressive product page: hero, Clear/Darkun options, features/specs table, coatings list, ideal-for cards, CTA |
| `src/pages/zenvue/ZenvueSingleVision.tsx` | Single Vision product page: hero, Clear/Darkun options, features/specs, ideal-for cards (Distance/Reading/Computer), CTA |
| `src/pages/zenvue/ZenvueSunDun.tsx` | SunDun Polarized product page: hero, use cases (Driving/Water/Outdoor), features/specs, "Why Gray?" explainer, CTA |
| `src/pages/zenvue/ZenvueDarkun.tsx` | Darkun Photochromic technology page: hero with cross-links to Brilliance and SV, "How It Works" section, benefits, "Available With" links, CTA |
| `src/pages/zenvue/ZenvueCompare.tsx` | Comparison table (13 features across 3 product lines), quick recommendation cards, CTA |
| `src/pages/zenvue/ZenvueWholesale.tsx` | Partner application form with validation, "What Happens Next" 3-step process |

### Shared ZenVue Components
| File | Purpose |
|------|---------|
| `src/components/zenvue/ZenvueHero.tsx` | Reusable hero section with configurable title, subtitle, CTA buttons |
| `src/components/zenvue/ZenvueProductCard.tsx` | Product card with features list and "Learn More" link |
| `src/components/zenvue/ZenvueCTA.tsx` | Reusable CTA section with partner/shop buttons |
| `src/components/zenvue/AvailabilityBanner.tsx` | "All lenses available as finished stock" banner |

### Backend
| File | Purpose |
|------|---------|
| `supabase/functions/lens-advisor/index.ts` | New edge function for ZenVue's LensAdvisor chatbot with ZenVue-specific system prompt and product knowledge |

### Database
- New `wholesale_inquiries` table to persist partner application form submissions (business_name, business_type, volume, location, contact_name, email, phone, referral_source, comments, created_at)
- RLS policy: insert allowed for anonymous/authenticated users; select restricted to admin role users

## Implementation Sequence

1. **CSS**: Add `.zenvue` design tokens and font imports to `index.css`
2. **Layout**: Create `ZenvueHeader` and `ZenvueLayout`
3. **Pages**: Build all 7 pages, starting with Home, then product pages, Compare, Wholesale
4. **Shared components**: Extract reusable Hero, ProductCard, CTA, AvailabilityBanner
5. **Router**: Wire routes in `App.tsx`
6. **Header update**: Replace external ZenVue links with internal routes
7. **Database**: Create `wholesale_inquiries` table and RLS
8. **Edge function**: Create `lens-advisor` for ZenVue chatbot
9. **Image placeholders**: Use gradient backgrounds and icons until real product images are provided

## Technical Details

### CSS Scoping Strategy
```text
.zenvue {
  --background: 220 15% 97%;
  --foreground: 216 19% 26%;
  --primary: 216 19% 26%;
  --radius: 0rem;
  font-family: 'DM Sans', sans-serif;
}
.zenvue .dark {
  --background: 220 15% 8%;
  --foreground: 220 15% 90%;
}
```

### ZenVue Header Navigation
- Desktop: horizontal nav with product links + "Shop Now" (accent button linking to `/store`) + "Become a Partner" (outline button)
- Mobile: hamburger slide-out with all nav items
- Top-right corner: small "OptiLens" text link back to `/`

### Wholesale Form Fields
- Business Name, Business Type (dropdown: Optical Shop, Chain, Hospital, Other), Monthly Volume (dropdown), Country/Location
- Contact Name, Email, Phone
- How did you hear about us? (dropdown), Additional Comments (textarea)
- Submissions saved to `wholesale_inquiries` table

### Lens Advisor Chatbot
- Reuses the streaming chat UI pattern from `LensChatbot.tsx`
- New edge function `lens-advisor` with ZenVue-specific system prompt covering Brilliance, Single Vision, SunDun, and Darkun products
- Does NOT require authentication (public-facing brand site)
