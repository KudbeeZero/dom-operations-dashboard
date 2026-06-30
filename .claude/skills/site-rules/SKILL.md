---
name: site-rules
description: The rules and hard-won lessons for editing the I Got A Dom marketing site (index.html / style.css / main.js). Read before touching the site so we stop re-learning the same bugs. Use when making any change to the marketing site.
---

# /site-rules — marketing-site guardrails

Static single-page site served from the **repo root** by Cloudflare Pages
(auto-deploys on merge to main). No framework, no build step, no package manager.

## Hard rules (from CLAUDE.md)
- `index.html` stays at repo root — never moved/renamed.
- **No inline styles** — all CSS in `style.css`. **No lorem ipsum** — copy matches the brand.
- **Never delete files** — archive to `vault/.raw/` if removing from root.
- Read `vault/wiki/` (brand, services, copy, design-tokens, memory) before writing; append decisions to `vault/wiki/memory.md` (never delete entries).
- `node --check main.js` before every commit. Branch `claude/<descriptor>`; draft PR per change (`/ship`).
- Honor disclaimers: not a law firm; no legal/tax/financial/medical advice.

## Performance / mobile (lessons that cost us real bugs)
- **iOS Safari reloads the tab ("page resets itself") under memory/GPU pressure.** Keep mobile light:
  - **No `backdrop-filter: blur` on mobile** — it's the #1 mobile Safari memory killer. Gate it off under `@media (max-width:768px)` (use a solid translucent fill instead).
  - **Gate canvas/particle systems and continuous rAF off on `(pointer: coarse)`** (underwater, reef, ambient, particle word, etc.). Keep the static CSS scene.
  - **Skip per-character/word heading splitters on mobile** (char-wave, word-pop, stagger-chars…). Plain headings on phones.
  - The hero video `#dive` is poster-only on mobile; never let it be 300vh tall on a phone (CSS failsafe `.dive.is-scrub{height:100svh}` at ≤768px).
- Big assets: `preload="metadata"` (not `auto`) on the hero mp4; `defer` all end-of-body scripts (and keep an inline `<head>` `html.js` class so reveal pre-state still applies before paint).

## Content visibility (the slow-load / invisible-content class of bugs)
- **Never gate content visibility on JS.** Content was hidden by `html.js .reveal{opacity:0}` until a ~400KB deferred `main.js` ran — 1–2s of blank page. Reveals are now a **pure-CSS load-time fade (`reveal-rise`)** that needs no JS/scroll. Keep it that way.
- GSAP `from({opacity:0})` reveals can strand whole sections if a ScrollTrigger never fires. There is a **universal post-load fallback** that force-shows any stranded reveal target — extend it, don't remove it.
- **One text-splitter per element.** Two functions splitting the same heading (e.g. char-wave then word-pop reading `innerHTML`) renders raw attributes as visible gibberish. Every splitter must bail on `el.children.length`.
- Don't use semantic `<footer>/<header>/<nav>` inside cards — `querySelector('footer')` then grabs the wrong element. Use `<div>` + BEM classes.

## Effects philosophy (owner direction: refined & professional)
- The site accumulated ~380 init effects over 150 sprints — that's both "too flashy" and "slow". Toning down == speeding up. Prefer a **curated, tasteful** set (smooth scroll, clean fades, hero, before/after slider, the interactive demos) over piling on micro-animations. Cutting an effect is a feature.
