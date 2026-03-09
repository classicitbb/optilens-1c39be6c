# Full-Fledged Lens Pages + Header Navigation Restructure

## Summary

Create 4 rich, content-dense lens pages with like structure and theming using data from the IOT brochure and comparison site, and restructure the Header nav to group ZenVue-branded lenses under their own column.  
  
use representative icons or create svgs to match the key technologies.

## Pages to Create/Update

### 1. NEW: Progressive (All-Day Use) — `/lenses/progressive`

Full page (not ZenVue-branded, uses Header/Footer shell like other `/lenses/*` pages). Content sourced from the IOT brochure and comparison site — **no Camber**. Sections:

- Hero with eyebrow/title/description
- **Product Lineup comparison table**: Endless Steady (Best), Essential Steady (Better), Classic (Good), Adapt (Basic) — showing MFH options, personalization level, key features
- **Key Technologies**: Spatial Vision, Eye Focus, Visual Stability, Ray Tracing, Digital Surfacing, Digital Vision (from brochure page 4)
- **Benefits grid**: cards for peripheral blur reduction, image stability, binocular vision, digital device comfort
- **Ideal Wearer profiles**: Near Vision, Distance Vision, Intermediate Vision personas
- **CTA**: Contact / Shop

### 2. UPDATE: Office / Occupational — `/lenses/office-occupational`

Replace stub `LensResourcePage` with full content. Sections:

- Hero section
- **Three distance configurations**: Workstation (35cm–2m), Room (35cm–4m), and the 6m option — each with clear vision range, ideal wearer, and use cases
- **Key Benefits**: Maximum near/intermediate FOV, improved posture, digital device comfort, immediate adaptation, peripheral blur elimination
- **Technologies**: IOT Digital Ray-Path 2, personalized design
- **Ideal Wearer cards**

### 3. UPDATE: Anti-Fatigue — `/lenses/anti-fatigue`

Replace stub with full content from IOT data. Sections:

- Hero section
- **How It Works**: Power boost explanation (0.50D, 0.75D, 1.00D options)
- **Benefits**: Relaxed vision, reduced accommodative effort, excellent distance & peripheral vision
- **Technologies**: IOT Digital Ray-Path 2, personalized
- **Ideal For**: Pre-presbyopes, digital device users, students
- **MFH options**: 14, 18mm

### 4. UPDATE: Endless Single Vision — `/lenses/single-vision` (NEW route, non-ZenVue)

Create a new public-facing single vision page at `/lenses/single-vision` (separate from the ZenVue-branded `/zenvue/single-vision`). Sections:

- Hero section
- **Key Benefits**: Impeccable visual quality for high Rx, comfortable focus, peripheral blur elimination, digital device quality
- **Technologies**: IOT Digital Ray-Path 2, personalized
- **Ideal For cards**: Distance, Reading, Computer
- **Materials table**

## Header Navigation Restructure

Update `PRIMARY_MENU` in `Header.tsx` to separate ZenVue products into their own column:

```text
Lenses Menu:
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Everyday Vision     │ Lifestyle Lenses     │ ZenVue Collection    │
│ ─────────────────── │ ──────────────────── │ ──────────────────── │
│ Progressive         │ Photochromic         │ Brilliance™ Prog.    │
│ Office/Occupational │ Blue Filter          │ Single Vision        │
│ Anti-Fatigue        │ Polarized            │ SunDun™ Polarized    │
│ Single Vision       │ Tints & Colors       │ Darkun™ Photochromic │
├─────────────────────┴──────────────────────┴──────────────────────┤
│ Technical Specs                                                   │
│ Materials · Thickness Chart · Lens Design Guide                   │
└───────────────────────────────────────────────────────────────────┘
```

## Routing Changes (App.tsx)

- Add route: `/lenses/progressive` → new `ProgressivePage`
- Add route: `/lenses/single-vision` → new `SingleVisionPage`
- Keep existing ZenVue routes unchanged
- Update lazy imports

## Files to Create

- `src/pages/lenses/ProgressivePage.tsx` — full progressive page
- `src/pages/lenses/SingleVisionPage.tsx` — full single vision page (non-ZenVue)

## Files to Modify

- `src/pages/lenses/OfficeOccupationalPage.tsx` — replace stub with full content
- `src/pages/lenses/AntiFatiguePage.tsx` — replace stub with full content
- `src/components/Header.tsx` — restructure menu sections, add ZenVue column
- `src/App.tsx` — add new routes and lazy imports

## Design Approach

All `/lenses/*` pages use the public Header/Footer shell (not ZenVue shell). Each page follows a consistent section pattern: Hero → Product/Feature details → Technologies → Benefits grid → Ideal For cards → CTA. Styling matches existing site theme (not ZenVue obsidian theme).  
  
Header navigation is responsive and stays centered in the page, while connected to the button itself. 