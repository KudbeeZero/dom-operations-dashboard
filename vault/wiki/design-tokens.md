# Design — I Got A Dom

> Design tokens are the source of truth. They live in `style.css` (repo root)
> under `:root`. Keep this file and that block in sync.

## Aesthetic
Dark "obsidian" base, warm ivory text, teal primary accent, gold secondary
accent. Glassmorphism on nav, pricing cards, and the contact form only.

## Palette
- bg `#0d0d0f` · surface `#131316` · surface-2 `#1a1a1f` · surface-3 `#212128`
- text `#f0ede8` (warm ivory) · muted 55% · faint 50% *(was 28%; raised
  2026-06-30 for WCAG AA — 4.73:1 on obsidian)*
- teal `#00d4c8` (primary) · gold `#c9a84c` (secondary) · chrome `rgba(255,255,255,0.82)`

## Type
- Display: Barlow Condensed (600/700/800)
- Body: DM Sans (300–700)
- Fluid sizing via `clamp()` — see `--text-*` tokens.

## Rules
- No gradient buttons. No purple. No colored left/side borders.
- Glass only where listed above.
- `prefers-reduced-motion` must skip the GSAP hero and show the static
  clarity state.
- All body text ≥ 16px on mobile.
