# Classic Visions — Design System

**Meridian Precision** — the visual language for Classic Visions, a wholesale optical
supplier in Barbados. Precision treated as a *felt* quality: the weight of the type, the
discipline of a measured circle, the silence of white space. Deep ocean navy anchors the
work; teal is the signal of clarity and performance; gold appears only as structure.

> **Type note:** the system is **one family only** — Plus Jakarta Sans, web-optimised
> from Google Fonts. It carries monumental headlines (800, tight tracking), calm body
> copy, and uppercase wide-tracked precision labels. There is **no serif and no
> monospace** anywhere.

---

## Using this system

Consuming pages load **one stylesheet** and **one bundle**:

```html
<link rel="stylesheet" href="styles.css" />
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="_ds_bundle.js"></script>
```

Components are read off the global namespace:

```js
const { Button, Badge, PrecisionLabel, Medallion, SpecCard } = window.ClassicVisionsDesignSystem_e30914;
```

(`styles.css` self-imports the Google fonts, so no separate font link is needed.)

---

## Palette

| Token | Hex | HSL | Role |
|------|------|-----|------|
| `--primary` | `#0B1E35` | `213 66% 13%` | Ocean navy — the field, primary surfaces, headlines |
| `--secondary` | `#1A8A9C` | `188 71% 36%` | Meridian teal — the signal color (links, focus, accents of performance) |
| `--accent` | `#C89130` | `38 61% 49%` | Structural gold — hairline rules, eyebrows, the hero CTA. Used sparingly |
| `--background` | `#F4F2ED` | `43 25% 94%` | Off-white linen — the light field |
| `--success` | — | `140 45% 40%` | Positive state |
| `--destructive` | — | `0 84% 60%` | Errors / removal |

Convenience hex aliases also exist: `--navy`, `--teal`, `--gold`, `--linen`, `--paper`.
All semantic colors are stored as HSL channels for `hsl(var(--token) / alpha)` use.

## Type

- **Display & body** — Plus Jakarta Sans. Headlines: weight 800, letter-spacing −0.03em,
  line-height ~1.0. Use `.cv-display`, `.cv-h1`, `.cv-h2`, `.cv-h3`, `.cv-lead`.
- **Labels** — Plus Jakarta Sans caps: uppercase, 700 weight, letter-spacing 0.18em.
  Use `.cv-label` or the `PrecisionLabel` component — the signature plaque detail.

## Spacing, radius, elevation

- **Radius** — `--radius` 0.75rem (lg); md 0.5rem; sm 0.375rem; pills are fully round.
- **Shadows** — navy-tinted and soft: `.cv-shadow-soft` / `-medium` / `-elegant`, plus
  `.cv-shadow-glow` (gold) for hero emphasis.
- **Spacing** — 4px rhythm via `--space-1 … --space-24`.

## Components

| Component | Purpose |
|-----------|---------|
| `Button` | CTA. Variants: `primary` (navy), `secondary` (teal), `outline`, `ghost`, `hero` (gold gradient), `hero-outline`. Sizes `sm`/`md`/`lg`/`icon`. |
| `Badge` | Uppercase caps status / performance pill. Variants: `navy`, `teal`, `gold`, `success`, `outline`, `muted`. |
| `PrecisionLabel` | Signature kicker: uppercase caps with a leading gold rule (or an index number). |
| `Medallion` | Optical-instrument icon frame — concentric hairline rings + calibrated tick marks around a glyph. |
| `SpecCard` | Product / technology card with optional gold accent bar, eyebrow, title, body, footer. |

Plain-CSS helpers (no JS needed): `.cv-card`, `.cv-rule`, `.cv-text-gradient`,
`.cv-bg-navy`, `.cv-bg-gradient-accent`, etc.

## Brand assets

`assets/logo/` holds the eye/lens "swoosh" mark in four treatments:
`logo_navy.svg`, `logo_linen.svg`, `logo_teal.svg`, `logo_gold.svg`.
Imagery and optical illustrations live in `src/assets/` and `assets/illustrations/`.

## Composition principles

1. **Navy is material, not background.** Let large fields of it carry weight.
2. **Gold is structural.** A hairline rule, a single accent bar — never decoration.
3. **Labels are objects.** Information reads as designed plaques (wide-tracked caps), not prose.
4. **Circles vs. rectangles.** Optical medallions (organic, scientific) tension against
   strict column/card structure (order, trust).
5. **Body copy stays quiet.** It is subordinate; the headline and the label lead the eye.
