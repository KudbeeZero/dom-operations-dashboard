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

## Underwater scroll-scrub hero — 2026-06-25
- Branch: feat/underwater-scroll-hero (off main, per owner). One PR, no merge
  without owner approval. NON-HERMES branch name — owner-directed.
- Stack reconfirmed: static HTML/CSS/JS, no framework, no package manager, no
  build step. So "component" = markup in index.html + CSS in style.css + logic
  in main.js. There is no public/ dir — assets live in assets/ (owner's baton
  said public/hero/...; corrected to assets/hero/ to match the repo).
- Added new #dive section BETWEEN #hero and #services (owner chose "add as new
  section", non-destructive — existing hero untouched).
- Asset: owner uploaded an mp4 → assets/hero/underwater.mp4 (9.2 MB, H.264).
  Generated a guaranteed SVG poster (assets/hero/underwater-poster.svg) as the
  always-present fallback so the section never shows a blank box.
- Effect: scroll position pins diveVideo.currentTime across SCROLL_HEIGHT_VH
  (=300) of scroll via a sticky stage + rAF loop (no raw scroll handler),
  eased by SCRUB_SMOOTHING (=0.12). Scroll down sinks, scroll up rises.
- Device strategy: full scroll-scrub only on wide (>768px), fine-pointer,
  motion-OK devices. iOS Safari seeks video poorly, so small/coarse-pointer
  AND reduced-motion get the static poster (no tall track, no video download —
  preload forced to 'none', source dropped). Missing/undecodable asset →
  poster, no crash (verified: this sandbox's headless Chromium can't decode
  H.264, which exercised the fallback for real).
- Tunable constants live at the top of initDiveHero(): VIDEO_SRC, POSTER_SRC,
  SCROLL_HEIGHT_VH, SCRUB_SMOOTHING, MOBILE_MAX_PX, END_EPSILON.
- No build/lint/typecheck exist in this repo; ran `node --check main.js` (pass)
  + headless-Chromium QA (fallback paths + scrub-math stub). Could not run
  Lighthouse / real video scrub headless (no H.264 codec) — owner to eyeball in
  a real browser.
- Decision: pushed branch + opened a DRAFT PR. Not a deploy; owner reviews
  before any Cloudflare Pages production deploy (merge to main).

## Underwater World — "the deep dive" — 2026-06-25
- Branch: claude/hermes-underwater-world (off main, after #3/#4/#5 merged). DRAFT PR.
- Owner spec offered React + Framer Motion OR GSAP — built VANILLA (no build
  system here; React/Framer Motion off the table). Used GSAP core (already loaded)
  + added the ScrollTrigger plugin via CDN.
- Owner decisions (AskUserQuestion): KEEP the #dive video hero AND add this as a
  new STANDALONE section below it (do NOT restyle existing #services); extend the
  palette with deep-navy scoped to this section. Page flow is now:
  hero → before/after → #dive(video) → #deep(underwater world) → services → …
- New #deep section between #dive and #services. Layers (z 0→10): deep radial bg,
  CSS caustics (blurred, opacity 0.06, drift anim), 5 teal light rays (CSS shimmer,
  GSAP scrubs opacity 0→0.7 on enter), rising-bubble <canvas> (IO-gated rAF, 28/14
  bubbles), then content. Top + exit "surface-divider" shimmer transitions.
- Content is NEW brand-voice copy (NOT a duplicate of the 6 services): eyebrow
  "Beneath the surface", headline "Every service. <em>Clarity guaranteed.</em>",
  3 glass depth-cards (Chaos sinks / Clarity rises / Same day). First person.
- New tokens --deep-1/2/3 added to :root (deep-navy), scoped to this section.
- GSAP ScrollTrigger transitions: rays fade-in scrub, bg blur 0→2→0 on entry,
  cards rise+stagger. All gated behind gsap+ScrollTrigger presence AND
  prefers-reduced-motion; cards/rays stay visible if GSAP fails (no-JS safe).
- QA: node --check pass; headless smoke (normal + reduced) zero JS errors; screenshots
  desktop+mobile look right. Could NOT verify the ScrollTrigger scrub headless (GSAP
  CDN offline in sandbox) — owner to eyeball on the real page.
- WEAKNESS to review: #deep's "Every service" intro sits right above the real
  #services grid — possible thematic redundancy; judge on the live page. Also lots
  of spectacle now stacks before services (before/after + video dive + underwater).

## Underwater particle physics + shark-bite — 2026-06-25
- Same branch/PR (claude/hermes-underwater-world / #6); owner directed it onto
  this branch (Option C: showpieces in #deep now, no footer-reef descent yet).
- Owner review-trim first: headline "Every service. Clarity guaranteed." →
  "Go deeper." (avoids repeating hero's "Clarity"; stops competing with #services).
  Plus a review-driven perf pass (removed scrubbed blur, mix-blend-mode, bubble GC).
- Then the particle scene (one IO-gated canvas in #deep, vanilla, reduced-motion
  skips it entirely): plankton (sediment), 70/30 rising bubbles (small=faster,
  grow+pop near surface, sinusoidal wobble), drifting CHAOS WORDS, and a shark
  that crosses and BITES a chaos word → letters fly apart, a ripple pops, and
  nearby bubbles/plankton scatter via a wake impulse. Chaos devoured, clarity wins.
- Shark = canvas silhouette (dark body + teal rim + eye), nose-first via dir flip,
  jaw opens on the chomp. Fires every ~11s; first pass ~2.6s after the section
  enters view. Emits a prod-safe `uw:shark-bite` CustomEvent (future sound/analytics
  hook + QA seam).
- QA: node --check pass; headless smoke (normal + reduced) zero JS errors; bite
  logic verified deterministically (forced shark stepped across → devoured "chaos",
  event fired). NOTE: headless throttles rAF to ~2-3fps so the *timed* shark can't
  be watched headless — verified via manual stepping instead; real-browser feel is
  owner's to judge on the preview. Temporary debug hooks were added then stripped.
- Tunables at top of initUnderwater(): BUBBLES_*, PLANKTON_*, RISE_*, CHAOS_WORDS,
  WORD_COUNT, SHARK_LEN/SPEED/FIRST_MS/EVERY_MS, WAKE_RADIUS/FORCE.
- WEAKNESS to review: shark is dark-on-navy — reads in motion (rim+eye+wake) but is
  subtle in a still; bumped rim/body contrast a touch. Easy to make bolder if wanted.

## Custom domain igotadom.online — 2026-06-25
- Owner bought igotadom.online (registered at Namecheap) for the Cloudflare
  Pages site (dom-operations-dashboard.pages.dev). Resolves the old open
  question "confirm igotadom.com for the QR" → it's igotadom.ONLINE now.
- Branch: claude/hermes-custom-domain (off main). DRAFT PR.
- Code: QR text → https://igotadom.online (was igotadom.com); added
  <link canonical>, og:url, og:site_name, absolute og:image, twitter:card — all
  → https://igotadom.online. README gets a Deployment section with the exact
  Cloudflare Pages custom-domain + Namecheap nameserver steps.
- Recommended DNS path: move nameservers Namecheap → Cloudflare (apex needs
  CNAME-flattening, which external DNS can't do), then add the custom domain in
  the Pages project (auto DNS + SSL). Guidance only — owner does the dashboard
  steps; I have no access to their Cloudflare/Namecheap accounts.
- Contact CTAs (sms:7736477598 / tel:7736477598) live in PR #9 — NOT duplicated
  here to avoid conflicts. Task-5 "CTAs use sms/tel" is satisfied once #9 merges.

## Mobile hero conversion polish — 2026-06-25
- Branch: claude/hermes-mobile-hero-polish (off main; independent of the
  underwater PRs #8). DRAFT PR. Owner phone: 773-647-7598 (sms + tel).
- Readability: brightened "Chaos" (#d7d2ca, was --text-muted) + headline
  text-shadow so it pops; strengthened "Clarity" teal glow; on mobile the
  hero canvas is dimmed (opacity 0.35) + blurred (2px) so the floating words
  recede instead of competing with the text.
- Conversion copy added under the sub: "Quick fixes start at $25" ($25 teal);
  contact line "Text or call Dominick at 773-647-7598" (number → tel:);
  trust strip "Same-day help • Personal service • Ready-to-send results".
- CTAs: primary renamed "Text Dominick →" → sms:7736477598 (hero + nav +
  mobile menu — DECISION: pointed all primary CTAs at sms since the contact
  form isn't wired to send yet; easy to revert). Secondary "See What I Do ↓"
  kept. On mobile the two CTAs stack full-width.
- Sticky mobile contact bar (#mobileBar, initMobileBar): fixed bottom, mobile
  only (≤600px), slides up after scrolling past 60% of the first screen;
  "Text Dominick" (teal) + "Call" (outline); safe-area-inset-bottom aware.
- Header: nav padding-top uses max(space-4, env(safe-area-inset-top)) so the
  logo clears the notch/browser overlay.
- Kept the dark cinematic vibe — no over-brightening, teal energy intact.
- QA: node --check pass; headless (390px iPhone) — first screen shows logo,
  eyebrow, Chaos→Clarity, sub, $25, Text Dominick CTA; sticky bar reveals on
  scroll; sms/tel hrefs correct; desktop unaffected (bar display:none); zero
  JS errors. No build step exists — node --check + headless smoke is the build.

## Seafloor reef footer — "the page lands on the bottom" — 2026-06-25
- Branch: claude/hermes-footer-reef (off main, after #7 merged). DRAFT PR.
- HERMES NEXT #1 (footer-reef descent). SCOPED: themed the FOOTER as a seafloor
  reef only — did NOT re-theme the middle sections (services/pricing/process/
  contact) underwater (that's the bigger Option A; deferred, flagged to owner).
- New: a `.reef-descent` gradient divider (obsidian → deepest water) above the
  footer; the footer becomes `.footer--reef` — deep radial bg, 3 faint light
  shafts (CSS), two coral-silhouette ridges (SVG data-URIs, front ridge has a
  teal rim), and a `#reefCanvas` of drifting reef fish + rising motes.
- initReef() in main.js: 16/8 reef fish (ellipse body + tail, teal/ivory, gentle
  bob, re-enter from far side), 40/18 motes. IO-gated to the footer; reduced-
  motion returns early (static CSS reef only). Tunables hoisted (FISH_*, MOTES_*).
- Footer copy got a tail: "© 2026 I Got A Dom · You've reached the bottom."
  Text-shadow added so the brand/disclaimer/copy stay legible on the seafloor.
- QA: node --check pass; headless smoke (desktop/mobile/reduced) zero JS errors;
  screenshots verified (fish + ridges + legible content). Feel = owner on preview.
- WEAKNESS to review: there's now obsidian (services→contact) BETWEEN the #deep
  underwater world and the reef footer — two underwater zones with dark theme
  between. Cohesive only if we later theme the middle (Option A). Judge live.

## Underwater lower page (Option A) — continuous depth zone — 2026-06-25
- Same branch/PR as the reef footer (claude/hermes-footer-reef / #8) — owner
  picked HERMES NEXT #1 (Option A) right after the reef, so it's stacked on top
  to make one cohesive piece. PR #8 retitled to cover both.
- Wrapped surface-divider…#deep…services…pricing…process…contact…reef-descent…
  footer in a single `.depth-zone` div. A `.depth-zone::before` vertical gradient
  (deep-1 → deep-2 → #00121d → #000c15 → deep-3) is the continuous body of water;
  the lower `.section`/`.section-alt` go transparent so it shows through. No more
  obsidian gap between #deep and the reef — the page deepens the whole way down.
- `.depth-zone::after` = very subtle drifting caustic (opacity 0.04, reduced-motion
  off). reef-descent divider made transparent (water is already continuous).
  `.step-num` chip re-tinted to a deep tone (was masking the connector with the
  obsidian page bg). Pure CSS — no JS.
- Legibility: glass cards + ivory text still read on the deeper gradient (mid-depth
  ~#000c15 is comparable to the old obsidian #0d0d0f). Verified services bento +
  the #deep→services transition; all 20 reveals fire; zero JS errors.
- TEST NOTE: the site's `scroll-behavior:smooth` doesn't complete in headless, so
  scrollIntoView left reveals at opacity 0 and screenshots looked black at first —
  forcing `scrollBehavior:auto` fixed the harness (reveals 20/20). Not a code bug.
- DEFERRED: ambient fish swimming through the open mid-water (the #deep scene + reef
  scene carry the life at the ends; middle is calm open water by design). Easy add.

## Merge train — PRs #10 → #9 → #8 landed on main — 2026-06-26
- Merge order: #10 (domain/canonical) → #9 (mobile hero) → #8 (reef/depth zone).
- #10 merged via GitHub (auto-detected as clean, no rebase needed).
- #9 rebased onto main post-#10; one conflict in vault/wiki/memory.md (new sections
  from both PRs — unioned, kept all content). JS check passed.
- #8 rebased onto main post-#9; conflicts in main.js (init array — unioned
  initMobileBar + initReef) and memory.md (same pattern — unioned all sections).
  JS check passed after each step.
- Final init order: initHeroCanvas, initHeroAnimation, initNav, initMobileBar,
  initDiveHero, initBeforeAfter, initScrollReveals, initUnderwater, initReef,
  initContactForm, initQRCode.
- Pushed main (9f485f2 → b842a9f). Cloudflare Pages auto-deploy triggered.
- PRs #8 and #9 closed on GitHub (changes on main; not merged via GitHub button).
- PR #10 merged via GitHub webhook (confirmed merged).
- LIVE domain pending: https://igotadom.online requires Cloudflare custom-domain
  setup (nameservers Namecheap → Cloudflare, then add custom domain in Pages project).
  Until then the site is live at https://dom-operations-dashboard.pages.dev.

## /loop Website Upgrade — 10 Waves — 2026-06-27
- Domain igotadom.online went live (Cloudflare Pages + CNAME + nameserver transfer).
- Contact form wired to Formspree https://formspree.io/f/mqevpwzd (real submissions).
- QR code changed from website URL → sms:7736477598 (more useful when already on site).
- Wave 1: 4-tab before/after showcase (Resume, Screenshot, Notes, Email) with EXAMPLES array
  in initBeforeAfter(); richer service bento cards with "you send / you get" lines.
- Wave 2: Trust bar (same day / $25 / 1 person / fix it free) + richer How It Works
  (step-formats chips, timing badges, step-badge for guarantee).
- Wave 3: FAQ section (6 native <details> accordions, no JS); FAQ link added to nav.
- Wave 4: "I'm Dominick" personal about-strip between FAQ and contact.
  (circular D icon, teal ring, SMS CTA, glass card, mobile stacked).
- Wave 5: Work ticker marquee (CSS-only, 12 work types, infinite scroll, pauses on hover,
  reduced-motion gets scrollable row). Between trust bar and showcase.
- Wave 6: Premium showcase — ba-doc-after gets white paper (#fafbfc) + shadow.
  EXAMPLES expanded to 7-8 lines each. New classes: ba-section-label, ba-bullet, ba-meta, ba-note.
- Wave 7: Pricing section — Quick Fix CTA → sms: (lowest-friction entry); price nudge below
  cards; differentiator row (not a chatbot / not a platform / one person).
- Wave 8: Contact upgrade — 3-step "What happens next" numbered list; contact intro copy
  rewritten; QR label → "Scan to text Dominick"; SMS button below QR.
- Wave 9: Services bento — "Most Popular" gold badge on anchor card; turnaround time badges
  on all 6 cards (⚡ Usually back within 2–4 hrs, etc.).
- Wave 10: "Examples" link added to desktop + mobile nav → #showcase; "or email" references
  removed (no email published); anchor card copy deduped vs badge.
- All 10 waves pushed directly to main; Cloudflare Pages auto-deployed each.
- DECISION: nav has 5 links (Examples / What I Do / Pricing / FAQ / Contact) — dropped
  "How It Works" to prevent overflow; process section still reachable by scroll.
- STANDING: SMS (sms:7736477598) is the primary conversion CTA across site; form is backup.
- TESTIMONIALS: no real client quotes exist yet — placeholder structure not added to avoid
  fake social proof. Owner should add 2-3 real quotes once available.
