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
- 2026-06-25 — Summary format change. Owner asked that every summary use the
  sectioned "HERMES — Session Status" layout (## SUMMARY / WHAT WAS DELIVERED /
  WHAT WAS ACTUALLY DONE / STATE / REMAINS MANUAL / ISSUES-WEAKNESSES + the
  actionable trio) instead of the old boxed ━━━ WRAP-UP. Updated CLAUDE.md and
  the Working-preferences template to match. HERMES name + trio retained.

## Working preferences (STANDING — apply every session)
> Owner: Dominick. Added 2026-06-25. Do not drop these.

- **Always end every task/sprint with a HERMES Session Status summary** (see
  template below). Dominick wants it *actionable* AND *honest* — lead with what
  shipped, be blunt about what's real vs stubbed and what's weak, then what HE
  can do next, then what HERMES will do. Skimmable and literally copy-pasteable.
- Be decisive: state the defaults chosen, don't make him re-answer.

### HERMES Session Status template (paste-ready, use this shape)
> Updated 2026-06-25: owner asked for the sectioned `##` layout below (modeled
> on his "Session Status" example) instead of the old boxed `━━━` WRAP-UP. Keep
> the HERMES name + the actionable trio. Drop sections that don't apply; always
> keep SUMMARY + the trio.
```
# HERMES — Session Status (<Sprint/Phase>: <name>)

## ✅ SUMMARY
- <what shipped> → PR <#/url>, branch <name>, base <branch>
- STATUS: ✅ shipped / 🚧 blocked   ·   LIVE: <url or "not deployed">
- <CI state> + <how it was validated>. <watch/check-in status>.

## WHAT WAS DELIVERED
- <file/area> — <what it does>
- <tests / docs / QA; any seeded or demo state>

## WHAT WAS ACTUALLY DONE THIS BRANCH
- <honest real-vs-recorded/stubbed list — no overclaiming>

## STATE / BEHAVIOR NOW LIVE
- <new behavior, transitions, or gates that now work>

## WHAT REMAINS MANUAL / NOT DONE
- <still needs a human or a later phase>

## ISSUES / WEAKNESSES
- <real bugs found/fixed, by-design gaps, "look here in review">

## ⚡ YOUR NEXT ACTIONS
1. [ ] <concrete action>
2. [ ] <decision needed — my rec: ...>

## 🤖 HERMES NEXT (say "go" to run)
1. [ ] <queued task>

## ⛔ BLOCKED ON YOU
- <anything blocking, or "nothing">
```

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

## Visual Upgrade — Phase 1 — 2026-06-25
- Branch: claude/dom-visual-upgrade-p1-qq1g38 (baton named feat/hero-animation-
  upgrade, but the assigned working branch is the claude/… one — developed there).
- Stack confirmed: static HTML/CSS/JS (no framework). GSAP + qrcodejs via CDN.
- Files modified: index.html, style.css, main.js. No files created/deleted.
- 1A Canvas particle hero (`#heroCanvas`, z-index 1, behind text z-10, pointer-
  events:none): rAF loop of word/char particles — chaos float (0–2s) → drift into
  two rows (2–5s) → left→right glow sweep (4–5.2s) → snap full-opacity rows
  (5–6.5s) → fade + reseed loop (6.5–7.6s). DPR-capped at 2, debounced resize,
  reduced-motion draws the static clean state only. Measured 60 FPS at 1440px.
  Two-row targets at 32%/68% height to stay clear of the headline band.
- 1B Before/After slider: new `#showcase` section between hero and services.
  Pure CSS clip-path (`--pos`) + vanilla Pointer Events (mouse+touch+pen),
  click-to-jump, draggable handle, keyboard (arrows/Home/End), role=slider.
  Decorative resume mock only — no site copy touched.
- 1C Scroll reveals: replaced the CSS `animation-timeline: view()` block with
  IntersectionObserver. Adds `html.js` so the hidden pre-reveal state only
  applies with JS + no-reduced-motion (no-JS stays visible). Fade-up 24px/400ms;
  stagger services 80ms / pricing 120ms / process 200ms via `--reveal-delay`.
  Elements already in the viewport on load show instantly (no animation).
- Did NOT touch: copy, section structure, contact form logic, pricing numbers,
  nav, logo, color tokens. No new npm packages.
- Decision: pushed to the feature branch + opened a DRAFT PR for human review.
  This is NOT a deploy (Cloudflare Pages deploys on merge to main), so it honors
  the baton's "human reviews before any Cloudflare Pages deploy" stop condition.
