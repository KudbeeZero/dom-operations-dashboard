# Memory — I Got A Dom (channel identity)

> HERMES writes session decisions here on `SAVE`. This is the second brain.

## Identity
- Project: the *I Got A Dom* marketing site (single-page).
- Agent: HERMES (Reader → Editor → Builder → Executor → Sender).
- Vault lives at `vault/`; built site lives at `vault/outputs/site/`.

## Goals
- Convert visitors into "send me something" leads.
- Feel premium and fast; communicate the chaos→clarity promise instantly.

## Constraints
- Never imply legal/tax/financial/professional advice (disclaimer required
  in services + footer).
- First-person voice. Same-day promise must stay honest ("where possible"
  on big jobs).

## Style rules
- Dark obsidian theme, teal/gold accents, Barlow Condensed + DM Sans.
- Hero animation runs once on load; respects reduced-motion.

## Decision log
- 2026-06-25 — Initial build. Created vault structure + full single-page
  site (nav, hero, services, pricing, process, contact w/ QR, footer).

## Sprint 2 — 2026-06-25 — Polish & Conversion
- Branch: claude/hermes-sprint-2-polish-conversion (off the Sprint 1 branch
  claude/hermes-igotadom-build-cyev52, NOT main).
- Correction to Identity above: the built site is served from the **repo
  root** (index.html/style.css/main.js/assets), not vault/outputs/site/.
  The Sprint 1 dashboard stub is archived at vault/.raw/operations-dashboard.html.
- Renamed vault/wiki/design.md → design-tokens.md to match the standing
  HERMES header.

### Audit (375px / 1280px) — pre-Sprint-2
| Section | Mobile | Desktop | Conversion note |
|---------|--------|---------|-----------------|
| Nav | OK (hamburger) | OK | sticky glass already worked |
| Hero | OK | OK | needed a scroll cue + confirm CTA target |
| Services | 2-col at ≤768 (wanted 1-col) | OK | added left-accent hover |
| Pricing | stacks OK | OK | badge was dim, not solid gold |
| How It Works | OK | OK | — |
| Contact | OK | OK | success was inline, not a state swap; no min-length |
| Footer | OK | OK | disclaimer wording needed "not a law firm" |

### Changes made (3A–3G)
- 3A Form: added min-10-char rule on "What do you need?"; on success the form
  is hidden and a branded confirmation shows: "Got it. I'll have something
  clean back to you same day."; submit button full-width on mobile + hover lift.
- 3B Pricing: $50 "Clean Package" badge is now solid gold on dark text, gold
  border + shimmer retained; CTAs scroll to #contact. ✅
- 3C Hero: primary CTA confirmed → #contact; added animated pulsing chevron
  scroll indicator; hero-sub min size 18px (≥16px) at 375px. ✅
- 3D Services: bento collapses to single column at ≤768px; subtle teal
  left-accent reveals on hover; section disclaimer stays visible (muted).
- 3E QR: hardcoded to https://igotadom.com (was using current URL), teal/dark,
  128×128, below the form. ✅
- 3F Nav: sticky glass after 80px confirmed with fade transition; mobile
  drawer opens/closes and closes on link tap. ✅ (no change needed)
- 3G Footer: disclaimer set to exact text — "I Got A Dom is not a law firm and
  does not provide legal, tax, financial, or professional advice." © 2026.

### Decisions
- Honored Sprint 2's "teal left-accent on hover" over the earlier
  "no colored side borders" rule — scoped to the hover state only.
- Footer uses the stronger "not a law firm" disclaimer; the services section
  keeps the fuller brand disclaimer ("…I organize facts, clean up writing…").
  Both are consistent in substance.
- Moved hero card positions from inline JS styles into style.css (nth-child)
  to satisfy the "no inline styles" rule; GSAP still animates transforms.
- Contact line: left as form-only (no personal email published) pending owner
  confirmation.

### Open questions for next sprint
- Real contact fallback line below the form? (email/phone/handle) — owner to decide.
- Wire the form to an actual delivery channel (email/Zapier/Formspree)? Currently
  client-side only — submissions are not sent anywhere yet.
- Confirm igotadom.com is the live domain for the QR before launch.

- index.html location: repo root ✅
