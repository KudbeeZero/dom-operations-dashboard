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

## /loop Visual Upgrade Sprints 43–50 — 2026-06-27
- Owner directive: take site to next level with animated/interactive sections; dynamic loop
  creating + merging PRs continuously so owner can review merged work.
- Pattern: 3 new animation/interaction functions per sprint → commit → push → PR → squash merge.
- All functions are isolated in the try/catch inits[] array; one failure can't take down the page.
- Cloudflare Pages auto-deploys on every merge to main; confirmed ✅ on each sprint.

### Sprint 43 (PR #43)
- initSectionGlowHalo: teal radial halo at top of each .section/.ba-section on IO entry (one-shot)
- initStepIconHover: .step-num glow+scale on mouseenter (pointer:fine, animationend cleanup)
- initCtaPulseRing: hero CTA emits 2 expanding rings every 5s starting at 3.5s delay

### Sprint 44 (PR #44)
- initHeadlineGlitch: hero .hero-headline RGB-split chromatic glitch at 2.2s, repeats every 14s
- initQROrbitRings: two elliptical orbit rings injected in .qr-card, IO-paused offscreen
- initSectionH2Underline: teal gradient underline draws left-to-right on section h2 IO entry

### Sprint 45 (PR #45)
- initClickSpark: global click emits 5 teal spark particles using CSS custom property angles
- initSliderHandleGlow: .ba-handle gets continuous 2.2s glow-pulse ring
- initScrollVignette: dark radial vignette appears on fast scroll (dy > 8px), fades at 180ms

### Sprint 46 (PR #46)
- initFloatingWords: CLEAN/FAST/CLEAR/POLISHED/READY ghost words rise through hero bg at ~5% opacity
- initMorphBlob: CSS border-radius morphing teal blob decoration injected in about section
- initServiceTagHover: .format-tag/.bento-tag lift + teal fill on hover (pointer:fine)

### Sprint 47 (PR #47)
- initBentoCardShine: injected .card-shine sweeps diagonal shimmer on .bento-card mouseenter
- initNavDotIndicator: 5px teal dot slides under hovered nav links, transitions smoothly
- initPricingGridGlow: pricing section container emits teal box-shadow pulse on IO entry

### Sprint 48 (PR #48)
- initPricingCardParticles: hover pricing cards → 4 teal sparks at 90° (pointer:fine)
- initAboutSectionPulse: about section emits 2.2s teal box-shadow pulse on IO entry
- initFooterLinkGlow: footer links get teal color + text-shadow on hover (pointer:fine)

### Sprint 49 (PR #49)
- initContactItemSparkle: hover .contact-item/.contact-row → 3 teal sparkles (pointer:fine)
- initQRScanline: injected scan-line sweeps .qr-card top-to-bottom on IO entry (0.5 threshold)
- initScrollEchoLines: faint teal horizontal echo line at viewport midpoint on fast scroll (dy > 60px)

### Sprint 50 (PR #50)
- initAuroraBg: 3 blurred radial bands (teal/purple/cyan) drift slowly in hero section background
- initProcessChainBounce: process steps bounce sequentially (domino, 180ms stagger) on IO entry
- initSecondaryBtnRipple: .btn-secondary/.btn-outline get expanding ring on mouseenter (pointer:fine)

### Technical patterns established this session
- CSS custom properties via style.setProperty() for animation params (--angle, --dist, --dur, etc.)
- IntersectionObserver one-shot pattern: obs.unobserve(e.target) on first entry
- animationend self-cleanup: element.addEventListener('animationend', () => el.remove(), {once:true})
- Pseudo-element conflict resolution: inject child div when ::before/::after already taken
- IO-pause pattern for continuous animations: toggle animation-play-state via IO callback
- prefers-reduced-motion guard at top of every init function

## Sprint 147 — Reveal Safety Net: Two-Phase Hover-Preserve Fix — 2026-06-27
- Context: 145+ sprints stacked scroll-reveal CSS base classes on every element.
  Only one CSS animation wins the cascade; others leave their hidden pre-state
  (opacity:0, blur, clip-path) stuck. The previous fix (PR #146) used a
  `.reveal-bypass` CSS class with `transition:none !important; transform:none !important`
  which permanently killed all hover effects (bento card scale/3D tilt, glow filters).
- Branch: claude/sprint-147-reveal-hover-card-fix (off main). PR #147 (DRAFT).
- Fix — two-phase inline-style approach in revealSafetyNet() IIFE:
  Phase 1: el.style.setProperty(..., 'important') overrides hidden states immediately,
  beats every scroll-reveal base class in the cascade.
  Phase 2: 2 rAFs later, strip the reveal classes so the element's natural CSS is
  visible and hover transitions/transforms/glows work unobstructed.
- SCROLL_RE expanded from ^(scroll-|...) to also match /-reveal(-elem|-el)?$| so
  bento cards using CSS transitions (.scale-reveal-elem, .rotate-reveal-elem,
  .card-flip-reveal, .radial-reveal-el) are detected by scan() AND stripped in Phase 2.
- style.css: removed the old .reveal-bypass block (replaced with comment).
- Playwright verified: 10/10 h2s, 6/6 bento cards, 12/12 sections visible at 7s.
  cardTransition = 'filter 0.2s' confirms hover glow effects are intact.
- CI: Cloudflare Pages ✅ green on PR #147.
- DECISION: WeakSet (not CSS class) tracks bypassed elements for O(1) lookup.
- DECISION: prefers-reduced-motion guard returns early — bypasses don't fire for
  users who prefer reduced motion (they rely on base CSS visibility instead).

## Sprint 147 Addendum — Performance + Footer Fixes — 2026-06-27
- Performance audit revealed: 32 scroll listeners, revealSafetyNet doing full-DOM
  querySelectorAll on every tick, hero canvas 60fps RAF running while off-screen,
  trust cycle + showcase autoplay setIntervals always running.
- FIXED: revealSafetyNet pre-caches candidates once at startup; prunes list as
  elements resolve; scroll listener self-removes when candidates list is empty.
- FIXED: initHeroCanvas — added IO observer to pause RAF when hero off-screen.
- FIXED: initHeroTrustCycle and initShowcaseAutoplay — IO-gated setIntervals
  that pause when their sections are off-screen, resume on re-entry.
- Footer fixes (three separate issues):
  1. Footer logo invisible: img-clip-hidden class sets clip-path:inset(100%) but
     didn't match SCROLL_RE so revealSafetyNet never unclipped it. Fixed by
     adding img-clip-hidden to SCROLL_RE pattern.
  2. Float CTA visible in footer: initFloatingCTA had two IO observers (hero,
     contact) but scrolling past contact made atContact=false → button reappeared.
     Fixed by adding third IO observer on <footer> with atFooter flag.
  3. Footer text contrast: rgba(240,237,232,0.45) was near-invisible on #000508
     (deep-3) background. Raised footer-copy to 0.78 opacity, disclaimer to 0.60.
- All three perf + footer commits pushed to claude/sprint-147-reveal-hover-card-fix.
- Cloudflare Pages ✅ preview: https://9eecd4dc.dom-operations-dashboard.pages.dev

## Sprint 148 — Interactive Availability + Try-It Demo + Sonar Ping — 2026-06-27
- Branch: claude/sprint-148-interactive-availability-sonar. PR #148. Squash-merged.
- initLiveAvailabilityPing: Injects a badge above .hero-eyebrow in .hero-content.
  Reads CT time via Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago'}).
  Mon–Fri 8am–8pm CT = green pulsing "Available now — reply in minutes".
  Outside hours = amber "Back Monday morning / Back at 8 am CT / Back tomorrow morning".
  Entry animation: translateY(-6px) → 0 over 0.6s, delay 0.4s.
- initTryItDemo: New #try section (index.html) between .transform-strip and #pricing.
  cleanText(): normalizes whitespace, capitalizes sentences, fixes bare 'i' → 'I'.
  UX: 1.4s shimmer "working" state → typewriter output → "Want the real thing?
  Text Dominick →" CTA fades in. Responsive: single column on ≤680px.
- initSonarPing: IO observer (threshold 0.6, one-shot) on each .section-title/.section-head h2.
  On entry, appends .sonar-ring div (position:absolute, centered, CSS keyframe expands
  0→400% scale while fading). Self-removes on animationend. Respects prefers-reduced-motion.
- All three functions added to the inits[] array after Sprint 145 functions.
- Cloudflare Pages ✅ green, no review comments. Squash-merged to main.

## Sprints 149–151 — caught up on main in Sprint 152's commit — 2026-06-28
> PROCESS NOTE: the 149/150/151 memory entries were written AFTER each PR squash-merged,
> so they landed on dead feature branches and never reached main. Fixed going forward:
> commit memory.md as part of the sprint's MAIN commit BEFORE merging. This block
> back-fills all three on main.

### Sprint 149 — Testimonials + Holographic Card Shine (PR #149, merged)
- New #testimonials section (.kinetic-section → #faq): 4 glass .tcard with 5-star markup +
  on-brand placeholder quotes. "Reviews" added to nav + mobile menu.
- initTestimonialsReveal: IO (25%, one-shot) → .tcard-in entry + 200ms-later .stars-in fill.
- initTestimonialCardShine: pointer:fine, mousemove → --mx/--my radial gradient + 3D tilt.
- CRITICAL BUG fixed: cards used <footer class="tcard-footer"> → querySelector('footer') in
  initFooterWave + initFloatingCTA grabbed the FIRST card footer not the site footer. All 4
  → <div>. LESSON: never put <footer>/<header>/<main>/<nav> inside article cards.

### Sprint 150 — Word-spacing bug fix + Stats + Magnetic CTAs + Ambient (PR #150, merged)
- BUG FIX (owner screenshot "Mostjobscomebackupthesameday"): initScrollRevealWords selected
  ALL <p> and put trailing space INSIDE inline-block spans (word + ' '); iOS Safari collapses
  it → words merge. Fix: narrow selector to [data-reveal-words], .section-body p, .about-body p,
  .hero-subtitle; createTextNode(' ') BETWEEN spans; children guard.
  LESSON: never put meaningful whitespace inside inline-block elements.
- initStatsCountUp: #stats section above testimonials, 3 count-up stats (500+/Same day/$25),
  ease-out-cubic 1.4s on IO, teal bottom bar on completion. Mobile 1-col horizontal.
- initMagneticButtons: .btn-primary + .float-cta attract cursor within 80px (max 10px). pointer:fine.
- initTestimonialsAmbient: 22 teal particles drift up on IO-gated canvas in #testimonials.

### Sprint 151 — Interactive SMS Composer (PR #151, merged)
- New #composer section (#faq → about-strip). Chip builder writes a prefilled SMS to lower
  friction to the #1 CTA. initSmsComposer: two groups (what/size), single-select+deselect,
  builds "Hey Dominick — I've got {what} to clean up. It's {size}. Can you help?",
  sets sms:7736477598?&body=<encoded> (iOS+Android), pulse bubble on change.
- DECISION: a message COMPOSER, not a price estimator — pricing is "No quotes, no games".

## Sprint 152 — Clarity Bloom: cursor-interactive particle text — 2026-06-28
- Branch: claude/sprint-152-particle-clarity. PR #152.
- Memory process fix applied: this commit catches main up on 149–151 BEFORE merge (above).
- New #claritybloom section (#testimonials → #faq). A <canvas id="particleWord" data-word="CLARITY">
  centerpiece you can play with: particles start scattered (chaos), spring into the word CLARITY
  (clarity), and scatter away from the cursor on hover/touch, then spring back. Embodies the
  chaos→clarity brand promise as a literal interactive toy.
- initParticleWord: renders WORD to canvas, samples pixels (alpha>128, gap=DPR*3) for home
  positions, spring force 0.022 + velocity damping 0.85, cursor repel radius 46*DPR force 3.2.
  DPR-capped at 2. IO-gated (RAF pauses off-screen). Debounced resize rebuilds. Touch supported.
  prefers-reduced-motion: draws the static word once, no physics.
- DISTINCT from initHeroCanvas (auto-play, pointer-events:none) — this one is CURSOR-INTERACTIVE.
  Chose this over an 18th parallax/spotlight effect (codebase already has 17 of those).

## Payment + Footer goal — 2026-06-28
- Owner goal: "make sure the payment section is working also the footer."
- FOOTER (PR #153, merged): was link-less → initFooterLinkGlow was dead code. Added real
  .footer-nav (What I Do / Pricing / FAQ / Contact / Text Dominick). Logo, float-CTA hide,
  reef canvas, AA contrast all re-verified working.
- PAYMENT (PRs #153/#154/#155, merged): static site = no backend, so card payment can only
  go through a hosted link. Owner chose "SMS purchase flow is fine" after Stripe MCP proved
  permission-blocked in-session (every call errors "requires approval"; can't be granted here).
  - PAYMENT_LINKS config {quick,clean,buildout} + initPaymentLinks(): accepts ANY hosted URL
    (Stripe Payment Link / PayPal.me / Cash App / Venmo). When a tier's URL is set → button
    "Pay $X →" opens it (new tab). When empty → real tier-specific purchase TEXT
    ("Hi Dominick — I'd like the Clean Package ($50). How do I pay?"), labeled "Get Started — $X →".
  - Microcopy added: "Tap your tier to start by text — I confirm details, then you pay whatever's
    easiest: card link, Cash App, Venmo, or Zelle."
  - TO GO LIVE ON CARDS: owner pastes one URL into PAYMENT_LINKS, or grants the Stripe MCP
    permission so HERMES can auto-create the links. Stripe test-vs-live check also blocked by
    same permission gate — owner self-checks via dashboard Test-mode toggle / key prefix.

## Cinematic rebuild — Lenis smooth-scroll spine — 2026-06-28
- Owner ref: viral "$35k animated site for $12" playbook (Claude Code + GSAP ScrollTrigger +
  Lenis smooth-scroll + baked-in cinematic layer). Audit: site already had 9/10 (GSAP, grain,
  5 particle systems, vignette, glass, tints, scroll pacing, scroll-scrubbed underwater video).
  MISSING piece = Lenis. Owner chose "bigger cinematic rebuild", keep the underwater video.
  Plan file: ticklish-weaving-flamingo.md. Additive (keep all 152 existing effects).
- SPRINT A (PR #157, merged): Lenis CDN (jsdelivr 1.1.20) before GSAP. initSmoothScroll
  (FIRST in inits[]): reduced-motion + CDN guards; new Lenis({lerp:0.1,smoothWheel:true});
  window.__lenis. Synced to ScrollTrigger: lenis.on('scroll',ScrollTrigger.update) +
  gsap.ticker.add(t=>lenis.raf(t*1000)) + lagSmoothing(0). Anchors → lenis.scrollTo(-70 offset).
  CSS scroll-behavior smooth→auto (never fight Lenis) + .lenis baseline classes.
  Lenis v1 scrolls real document so window.scrollY + native scroll events still fire → existing
  scroll consumers (progress bar, vignette, float CTA, dive-video scrub, sticky nav) unaffected.
- SPRINT B (PR #158, merged): initScrollVelocityCinema writes --scroll-vel (-1..1) from
  lenis.velocity each tick; .kinetic-text leans skewY(*0.7deg)+translateY(*-8px) with momentum,
  settles to 0 on stop. One CSS-var write/tick, conflict-free (kinetic-text had no transform).
- SPRINT C (QUEUED, not built): pinned full-bleed scroll beats + cinematic frame cohesion.
  DEFERRED because pinning is layout-risky and this remote env can't reach Cloudflare to visually
  verify — want owner to feel A+B live first before blind-pinning. Resume on owner confirmation.
- CONSTRAINT all session: remote browser can't reach external HTTPS / Cloudflare preview URLs →
  no visual QA; rely on node --check + static review. Stripe MCP permission-blocked.

## Phase 1 visual upgrade — refined & professional + SEO (branch claude/dom-visual-upgrade-p1-qq1g38)
- OWNER DIRECTION (this phase): "make the call, I'm driving, you're my executive director."
  Take the site from flashy → refined & professional (credible enough that people ask "do you
  design websites?") AND make it discoverable organically ("hit keywords, get it out there").
  Decision made on owner's behalf: Curate + polish + SEO, shipped as two small reviewable PRs.
- PR1 (curate + polish): main.js inits loop (~3863) now runs a KEEP Set allowlist
  (`if (!KEEP.has(init.name)) continue;`) — ~50 curated essentials/tasteful effects RUN, the
  other ~106 gimmicks SKIPPED (char-wave/word-pop/scramble/typewriter/glitch/neon/rainbow text,
  cursor trails, sparks/confetti, glow halos/rings/pulses, icon/badge bounce-pop-wiggle, 3D
  tilt/chromatic, redundant initScroll*/initHover* variants, initBg* aurora/comet/ink/scanline/
  fog/vignette). Functions stay DEFINED (nothing deleted) — just not invoked; tune KEEP later.
  Also added a ranInits guard so duplicate array entries don't double-run.
  KEY SAFETY: content visibility no longer depends on these (pure-CSS reveal-rise, cf1d4c3) so
  cutting is safe — nothing strands.
- PR1 polish (style.css): .ba-head margin-bottom space-6→space-16 (rhythm consistency);
  .btn-ghost:hover gets translateY(-2px) to match .btn-primary; .bento-example → .bento-card
  .bento-example (specificity beats `.bento-card p`, dropped !important); .faq-link:hover added;
  .tcard::before shine de-purpled (removed rgba(120,80,255) — violated "no purple" token — now
  teal-only + softer); .tcard-quote::before opacity 0.18→0.32 (was too faint); removed the
  always-on 5s gold shimmer on .price-card.featured::before (kept static gold border + "Most
  Popular" badge as the single calm signal) + its @keyframes shimmer + orphaned reduced-motion rule.
- PR2 (SEO, queued in same branch): JSON-LD (ProfessionalService + Service/Offer tiers + FAQPage),
  robots.txt + sitemap.xml, explicit twitter tags, alt-text/keyword pass. Flag: og:image is an SVG
  (social scrapers won't render) — owner to supply 1200x630 PNG. NO aggregateRating unless reviews
  are real. Owner organic to-do: Google Business Profile (#1 lever), Search Console + Bing
  (submit sitemap), real Google reviews, directory citations, a few real backlinks. Single page kept.
- Deep-research legal report COMPLETED (saved to scratchpad task wi4b0a5wd.output): belt-and-suspenders
  IP (WMFH + present-tense assignment conditioned on full payment), client = domain registrant (ICANN
  TAC handover), refuse PHI/PCI/SSN/FERPA/attorney-client (FTC data-minimization). Feeds task #10.

## PR2 SHIPPED — on-page SEO (branch claude/dom-visual-upgrade-p1-seo-qq1g38)
- index.html <head>: added JSON-LD @graph — ProfessionalService (name, desc, url, logo,
  telephone +1-773-647-7598, priceRange $25–$75, areaServed US, knowsAbout, makesOffer x3
  for Quick Fix $25 / Clean Package $50 / Same-Day Buildout $75) + FAQPage (the 6 real FAQ
  Q&As → FAQ rich-result eligible). NO aggregateRating (no real reviews yet — stays honest).
- Enhanced meta description (adds "same-day document cleanup" + "resume formatting" without
  breaking voice); added explicit twitter:title/description/image, meta author, theme-color.
- New robots.txt (allow all + Sitemap line) + sitemap.xml (single canonical URL, lastmod).
- Only <img> on the page is the logo (alt already good); before/after is CSS/canvas, so no
  alt-text gap. Title already strong ("Same-Day Document Cleanup") — left as-is.
- KNOWN FOLLOW-UP: og:image is an SVG (assets/og-image.svg) — social scrapers won't render
  it; owner to supply a 1200x630 PNG and swap og:image + twitter:image.
- Validation: node JSON.parse on the ld+json block OK; xmllint sitemap well-formed. Live
  Rich Results Test = owner (this env can't reach Google).

## Legal & policy foundation (task #10, branch claude/legal-docs-foundation)
- Drafted 5 client docs + index in vault/legal/ from the verified deep-research report
  (21/25 claims confirmed). Every file opens with the not-legal-advice disclaimer + IL
  attorney-review flag. Plain English, Dominick's first-person voice.
  - web-design-agreement.md — scope/timeline/deposit/revisions/kill+late fee + the IP core:
    "work made for hire PLUS present-tense assignment, conditioned on PAYMENT IN FULL" (AIGA/
    Bonsai/PandaDoc norm; bare WMFH alone doesn't transfer — assignment is load-bearing).
    Client owns site + source on final payment; optional portfolio credit + reusable
    background-IP carve-out; client-owns-domain + no-sensitive-data clauses.
  - domain-hosting-ownership.md — client = registrant + owns registrar/hosting logins; if
    Dominick registers, never leave his personal email on it, hand over via TAC (registrar
    must provide within 5 calendar days) + full handover CHECKLIST (domain, registrar, hosting,
    DNS, source, CMS, assets, analytics, email, how-to note).
  - acceptable-use-no-sensitive-data.md — REFUSE list (PHI/patient, SSN/gov-ID, full card/
    bank #s, FERPA, attorney-client) built on FTC "Scale Down"; "redact it first or don't
    send it." PHI access is the HIPAA-BA trigger → refusing PHI = never a BA (do NOT cite the
    refuted "conduit exception").
  - privacy-confidentiality.md — collect only what's needed, TLS in transit, no logins asked,
    kept briefly then deleted, never shared/sold/published; don't-email-SSNs warning.
  - web-design-packages.md — One-Pager / Multi-Page / Care-&-Updates; ownership on final
    payment; domain+hosting at cost, no markup; PRICES are placeholders for Dominick to set
    (survey price-bands were REFUTED — not cited).
  - README.md index.
- IL flag in privacy + acceptable-use: federal/FTC baseline only; PIPA/BIPA outside verified
  set → attorney to confirm. Kept as vault/legal/ markdown (no site pages — owner single-page);
  publishing privacy/AUP to footer is a flagged future decision, not done.
- NEXT (owner OK'd loop): #11 Stripe test checkout (BLOCKED on owner choosing: paste 3 test
  Payment Link URLs vs placeholder+TODO — will ASK), then #12 phase-2 polish.

## Stripe Connect sample — recipient model (branch claude/stripe-connect-recipient, task #15)
- Self-contained Node/Express reference app in stripe-connect-sample/ (does NOT touch the
  marketing site, not Cloudflare-deployed). Owner gave the canned Stripe Connect spec.
- This is the RECIPIENT model (platform owns pricing + fees), distinct from task #11 (simple
  $25/$50/$75 own-payments on the live site — still pending owner's test Payment Link URLs).
- Spec-exact: v2.core.accounts.create with dashboard:'express', responsibilities fees/losses
  'application', configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested;
  NO top-level type. accountLinks configurations:['recipient']. Status read live from API
  (recipient.stripe_transfers.status==='active' + requirements.summary.minimum_deadline.status).
  Products at PLATFORM level w/ metadata.connected_account_id mapping. Single /storefront lists
  all products + accounts. Checkout = DESTINATION charge (payment_intent_data.transfer_data.
  destination + application_fee_amount 10%), hosted checkout. Thin V2 connect webhook
  (parseThinEvent → v2.core.events.retrieve) for requirements.updated + recipient
  capability_status_updated, registered before express.json with raw body. One stripeClient =
  new Stripe(KEY), no apiVersion. Fail-fast on missing/placeholder STRIPE_SECRET_KEY. stripe:"latest".
- SUPERSEDES the parked PR #165 / branch claude/stripe-connect-sample (built for the wrong
  merchant/direct-charge/subscription model + based on stale main → would revert phase-1/legal
  work). #165 should be closed.
- Gate: node --check server.js (Stripe MCP was disconnected so couldn't doc-verify; followed the
  spec's exact shapes). Full runtime test is owner's (needs sk_test_ keys + stripe listen).

## AI chat assistant (branch claude/ai-chat-assistant, task #16)
- Owner wanted a chat/type AI bot with full access to site content. Site is static on
  Cloudflare Pages → added a Cloudflare PAGES FUNCTION (functions/api/chat.js) so the API key
  stays server-side. No new hosting/framework/build. Directly answers earlier PHP/Bootstrap/
  new-host questions: none needed.
- functions/api/chat.js: onRequestPost; fail-fast if env.ANTHROPIC_API_KEY missing (returns a
  friendly "text Dominick" 503); validates input (last 10 turns, 2000 char/msg cap); calls
  Claude Messages API (model claude-haiku-4-5, max_tokens 1024, stream:true, system=KNOWLEDGE
  with cache_control ephemeral); streams the SSE straight back to the browser. Only onRequestPost
  exported (Pages auto-405s other methods).
- functions/api/_knowledge.js: the system prompt = full site knowledge (brand/voice, services,
  EXACT pricing $25/$50/$75+, process, FAQ, contact) + HARD RULES: only talk about I Got A Dom,
  no legal/tax/medical/financial advice, refuse PHI/SSN/full card+bank #s, funnel real jobs to
  text 773-647-7598, short answers. Edit this one file when the site changes.
- Front end: index.html chat launcher + #chatPanel (before scripts); style.css widget (dark/teal
  glass, mobile full-screen sheet, reduced-motion); main.js initChatbot() — opens panel, streams
  /api/chat SSE (parses content_block_delta → text_delta), example chips, graceful error fallback
  ("text Dominick"). Added initChatbot to BOTH the inits array and the KEEP allowlist.
- MODEL is a one-line swap to claude-sonnet-4-6 for higher quality (pricier).
- OWNER SETUP REQUIRED: add ANTHROPIC_API_KEY in Cloudflare Pages → Settings → Environment
  variables (encrypted), then redeploy. Until then the widget shows the friendly fallback (safe).
- COST/ABUSE: metered usage; ships basic input caps only. Real rate-limiting (Cloudflare WAF/
  Turnstile) is a flagged follow-up. One-page site → full content fits in the prompt (no RAG yet).
- Verified locally with Chromium: launcher→panel→greeting→user echo→graceful fallback→close, no
  page errors. Live streaming test is owner's after key+deploy (this env can't run Functions/API).

## Chat endpoint rate-limiting (branch claude/chat-rate-limit, task #17)
- Hardened functions/api/chat.js (the open /api/chat POST) against abuse of the metered Claude
  spend, before the Claude call:
  - ORIGIN allowlist: rejects (403) requests whose Origin is present but not igotadom.online /
    www / *.dom-operations-dashboard.pages.dev. Missing Origin is allowed (rate limiter still gates).
  - PER-IP RATE LIMIT via Cloudflare KV (binding CHAT_KV): fixed windows RL_PER_MIN=12/min,
    RL_PER_DAY=150/day, keyed by CF-Connecting-IP. Over limit → 429 friendly "sending a little
    fast, text Dominick" message. FAILS OPEN: if CHAT_KV unbound or KV errors, requests are
    allowed (a setup gap or KV hiccup never takes the bot down) — logs a warning when unbound.
  - KV has no atomic increment; benign read-modify-write race accepted at this scale.
- OWNER SETUP (one step): Cloudflare Pages → project → Settings → Functions → KV namespace
  bindings → create namespace (e.g. chat-ratelimit) → bind as CHAT_KV → redeploy. Until then the
  endpoint runs unthrottled but working.
- Verified locally: node --check + mock tests (originAllowed all cases pass; 13th request blocked,
  per-IP isolated, fail-open unbound). Live abuse test is owner's.
- NOT bot-proof (IP rotation defeats it) — stronger upgrade = Cloudflare Turnstile (front-end
  challenge + siteverify in the Function), flagged as next layer if abuse appears. Native CF WAF
  rate-limiting rule is a zero-code dashboard alternative the owner can also enable.

## Bundle slim-down — delete dead effect code (branch claude/slim-js-bundle, task #12)
- PR #167 curated the runtime to a KEEP allowlist (~53 effects) but the cut effects' CODE still
  shipped. main.js was 10,513 lines / 410KB — the heaviest asset.
- Measured: 413 init* functions defined, 53 in KEEP, 360 dead. A one-shot Node transform
  (scratchpad/slim.mjs, not committed) deleted every non-KEEP top-level `function init*(){...}`
  block (column-0 function → next column-0 `}`), removed orphan one-line comment headers, and
  REBUILT the inits[] array by filtering the ORIGINAL array order to KEEP members (preserves exact
  current execution order; dedups the old duplicate entries).
- RESULT: main.js 10,513 → 3,359 lines, 410KB → 141KB (~66% smaller). 363 function blocks removed.
  node --check passes; zero non-KEEP init functions remain; initChatbot + all KEEP intact.
- REGRESSION GATE (headless Chromium, desktop 1440 + mobile 390): IDENTICAL to pre-slim baseline —
  hero "Chaos to Clarity.", 0 gibberish, 3/3 pricing cards, all sections same heights (e.g. desktop
  #services 1927 / #pricing 1271 — match earlier render-check exactly), 0 stranded, 0 console
  errors, chat launcher opens + sends. Same site, less code.
- CSS cleanup (dead keyframes/classes for cut effects) deliberately NOT done here — riskier, a
  separate careful follow-up. Cut effects remain recoverable in git history.
- Kept the KEEP Set + filter as a harmless guard even though the array now only holds KEEP names.

## Cloudflare Turnstile on the chat (branch claude/chat-turnstile, task #18)
- Stronger anti-abuse than IP rate-limiting (which IP rotation defeats): Turnstile proves a real
  browser before /api/chat reaches Claude.
- functions/api/chat.js: turnstileOk(env, token, ip) verifies body.turnstileToken via
  https://challenges.cloudflare.com/turnstile/v0/siteverify. FAILS OPEN when TURNSTILE_SECRET
  unset (feature off) or siteverify errors (net blip); FAILS CLOSED (403) only on an explicit
  bad/forged/missing token when the secret IS set. Runs after origin/rate-limit, before Claude.
- index.html: Turnstile script (async) + invisible container #chatTurnstile with
  data-sitekey="REPLACE_WITH_TURNSTILE_SITEKEY".
- main.js initChatbot: getTurnstileToken() — active only when a real site key is set AND the
  script loaded; invisible widget, execution:'execute', fresh token per send via execute→callback,
  6s timeout → null so it never hangs the chat, turnstile.reset() after each send (tokens are
  single-use). Sends { messages, turnstileToken } (null when off). style.css: .chat-turnstile
  height:0 (no layout footprint).
- OWNER SETUP (set BOTH or neither): Cloudflare → Turnstile → create widget (free) → put the
  PUBLIC site key in index.html #chatTurnstile data-sitekey, and the SECRET key in Pages env as
  TURNSTILE_SECRET → redeploy. Setting the secret without the sitekey would 403 (documented).
- Verified: node --check; mock siteverify (unset→ok, no-token→403, valid→ok, forged→403,
  neterr→fail-open); headless render-check with placeholder key — script+container present
  (height 0), chat opens/sends, POST carries turnstileToken:null, no console errors.

## 2026-06-30 — Loop: next-level interactive pass (PR: card 3D tilt)
- Revived `initCardTilt()` (was deleted in the #173 slim-down, leaving orphaned `.tilt-active` CSS).
- Subtle rAF-driven 3D perspective tilt (max 6°, scale 1.015 lift) on `.bento-card` + `.price-card`,
  layered on the existing cursor spotlight (initCardSpotlight/initPriceCardSpotlight drive --mx/--my).
- Desktop/fine-pointer only; fully skipped under prefers-reduced-motion. Added to KEEP + inits.
- CSS: extended `.tilt-active` transform-transition suppression to price cards + will-change.
- Verified headless (forced fine-pointer): bento+price get matrix3d + tilt-active, spotlight tracks
  cursor, inline transform clears on leave, 0 page errors.

## 2026-06-30 — Loop: card specular sheen (pairs with tilt)
- Extended initCardTilt to inject a `.card-sheen` span per card and drive --gx/--gy from the cursor.
- Soft white radial (rgba 255 0.08, 200px) that fades in only while `.tilt-active`; absolute/out-of-flow
  so no layout shift; low alpha keeps text readable. Reduced-motion: tilt init never runs → sheen stays hidden.
- Verified headless: 9 sheens, opacity 1 on tilt, --gx tracks cursor, card height unchanged, fades on leave, 0 errors.

## 2026-06-30 — Loop: BOLD new section — Cleanup Cinema (owner picked "one bold new section")
- New scroll-scrubbed "Chaos to Clarity" section (#cleanup), inserted between Process and the Kinetic statement.
- A messy resume (typos w/ red wavy underline, coffee stain, crooked, blurred) cross-fades into a clean
  version as you scroll; teal "Ready ✓" stamp lands at the end; caption updates per phase.
- Implementation: CSS `position: sticky` paper + a passive rAF scroll listener (initCleanupCinema) that maps
  section scroll progress to a `--p` (0..1) custom property the CSS keys all transforms/opacity off of.
  NO GSAP pin / no scroll hijacking → can't break page scrolling (low blast radius). 260vh tall (220 on mobile).
- prefers-reduced-motion: JS adds .cleanup-static → collapses height, hides messy layer, shows clean sheet only.
- IMPORTANT gotcha for future scroll work: #cleanup offsetTop != true doc position (positioned ancestor is the
  offsetParent), so progress math MUST use getBoundingClientRect().top, not offsetTop. (Tripped the first render-check.)
- Verified headless: p ramps 0→1, messy/clean crossfade, captions change, stamp →0.92 opacity, reduced-motion
  static, 0 console errors. Registered in KEEP + inits.

## 2026-06-30 — Loop: Refined polish program (owner picked "refined polish" → "also harmonize animations")
### PR1 — Accessibility & focus polish (CSS-only)
- Added a consolidated `:focus-visible` teal ring (2px, var(--teal), offset 3px) for nav links,
  mobile-menu links, .btn/.btn-primary, #scrollTop, chat launcher/close/send/chips, price CTAs.
  (Audited the 5 pre-existing focus-visible rules first — all on niche/dead classes, no overlap.)
- Gated `.btn-ripple` under prefers-reduced-motion in CSS (JS already guards; this is defensive).
- Verified headless: keyboard Tab shows teal rgb(0,212,200) 2px ring on nav-link + btn, 0 errors.

### PR2 — Chat widget UX correctness
- Disable #chatInput while streaming (alongside #chatSend), re-enable in finally. CSS `.chat-input:disabled` (dimmed, not-allowed).
- `.chat-send:disabled:hover` no longer lights up teal.
- aria-modal toggles true/false on open/close (was static false).
- Body scroll-lock on open: `body.overflow='hidden'` + `window.__lenis.stop()` (guarded); restored on close (`''` + `.start()`).
  NOTE: on close, computed body overflow reverts to stylesheet "hidden auto" (overflow-x hidden is the normal page setting) — vertical scroll restored, not a bug.
- Tactile: .chat-close hover scale(1.15)/active scale(0.95); .chat-chip:active.
- Verified headless: open→aria-modal true+overflow hidden; submit→input+send disabled then re-enabled; Escape→aria-modal false+scroll restored; 0 errors.

### PR3 — Nav anchor offset + active-link precision
- Anchor smooth-scroll offset now measures live nav height (`#nav` offsetHeight + 14) instead of hardcoded -70,
  so anchors land correctly under the compact nav. (Only runs when Lenis is active = desktop.)
- initActiveNav rootMargin -28%/-68% → -15%/-75% (focal band ~15-25% down; wider = no gaps, higher = less lag).
- Verified headless: all 6 nav links (#showcase…#contact) activate for their section, 0 errors.

### PR4 — Animation harmonization (conservative)
- Added :root token `--ease-smooth: cubic-bezier(0.4,0,0.2,1)` and pointed the slider-tab indicator +
  .nav-inner padding transitions at it (pure tokenization — zero visual change).
- Nav underline transform transition: generic `ease` → `var(--ease-out)` (snappier, matches reveal language).
- Softened the two bounciest GSAP spring outliers to the existing standard: back.out(2.8)→1.7 (bento card land),
  back.out(2.4)→1.7 (about icon). Left the intentional, documented bento anchor/rest hierarchy (2.0/1.5) alone.
- Verified headless: tokens resolve, nav underline uses --ease-out, bento+about entrances settle at opacity 1, 0 errors.

## 2026-06-30 — Loop: social share PNG (og:image was a non-rendering SVG)
- og:image/twitter:image pointed at /assets/og-image.svg — most platforms (FB, LinkedIn, iMessage, X, WhatsApp,
  Slack) DON'T render SVG share cards, so link previews showed no image. Real organic-reach gap.
- Rendered a 1200x630 brand PNG from the existing SVG via headless Chromium WITH the real Barlow Condensed /
  DM Sans fonts (loaded through the agent proxy; brandFontLoaded=true). Saved assets/og-image.png (~252KB).
  Render harness in scratchpad (render-og.mjs + ogcard.html); proxy passed via chromium.launch proxy + ignoreHTTPSErrors.
- Repointed og:image, twitter:image, and JSON-LD "image" to the PNG; added og:image:type/width/height/alt. Kept the SVG.

## 2026-06-30 — Loop: weaknesses audit (3 parallel Explore agents) + honesty pass
- Ran 3 audits: performance/tech-debt, conversion/honesty/functional, SEO/a11y. Full findings drove a plan.
- Owner decisions: DROP the unverifiable "500+ documents cleaned" stat; REPLACE the 4 fabricated testimonials
  (Marcus T./Jasmine R./David K./Sophia M.) with an honest section.
### PR A — Honesty pass (brand-critical)
- Removed the "500+ documents cleaned" stat li; stats-grid → auto-fit+centered so the remaining 2 (Same day, $25) stay balanced.
- Replaced testimonial cards with `.honest-review` panel: "No fake reviews here. / I'd rather earn yours than invent one."
  + real text CTA. Kept section id="testimonials" (nav/anchor intact). initTestimonialsReveal no-ops safely (no .tcard left).
- JSON-LD already had NO fake aggregateRating/Review (line 43 confirms) — nothing to remove there.
- NOTE: .tcard/.tstar/.testimonials-grid CSS is now dead — fold into the upcoming dead-CSS cleanup PR.
- Verified headless: 500+ gone, fake names gone, honest panel visible, 0 errors.
### Audit follow-ups still queued
- PR: Local SEO schema (areaServed Illinois, LocalBusiness, per-service Service) + WCAG --text-faint contrast + minor ARIA.
- PR: Dead CSS cleanup (~196/200 keyframes, ~370/741 classes dead; preserve JS-runtime classes like .tilt-active/.is-active).
- Owner to set Turnstile sitekey; Stripe links later. Zelle/text fine for now.

### PR B — Local SEO schema + WCAG contrast
- JSON-LD ProfessionalService: added honest region-only `address` (addressRegion IL, addressCountry US) and
  `areaServed` array [State Illinois, Country US] for local-search signals. Validated JSON parses.
- `--text-faint` 0.28 → 0.50: 0.28 was ~3.5:1 (WCAG AA fail). Computed 0.42=3.66 (still fail), 0.50=4.73:1 (pass).
  0.50 still sits below muted 0.55 so the text hierarchy holds. Used on disclaimer/footer/placeholders (small text).

### PR C — Dead CSS purge (big perf/tech-debt win)
- IMPORTANT correction: the audit's "196 dead keyframes" was WRONG — it checked keyframe names vs HTML/JS, but
  keyframes are referenced from CSS `animation:` props. Only 3 keyframes were textually dead. The REAL dead code
  was dead CLASS RULES (492 of 846 class names, ~58%, leftover from the removed init effects).
- Tooling: PostCSS + postcss-selector-parser (installed in scratchpad). A rule is removed only when EVERY
  comma-selector is gated by a dead class in a REQUIRED position; classes inside :not()/:is()/:where()/:has()
  are ignored (so we never drop rules that match live elements via negation). Safelist: lenis-*, js, is-*, has-*,
  *-active, *-in, *-visible. "Live" = class token present anywhere in index.html or main.js (generous = safe).
- Result: removed 719 rules + pruned 29 selectors + 193 emptied media queries + 118 now-orphaned keyframes.
  style.css 279KB→162KB (-42%), 9072→5074 lines.
- VERIFICATION (the safety net): before/after computed-style diff of EVERY element (648) on desktop+mobile.
  Under reduced-motion (deterministic) → 0 diffs across all 634 elements. Non-RM run's 16/12 diffs were pure
  animation-timing noise. Final functional check: hero/6 bento/3 price/honest/19 sections/chat all good, 0 errors.
- Purge scripts in scratchpad (purge.mjs, cssdiff-rm.mjs). Class-name dead-set ~492; this removed their rules safely.

### PR D — a11y ARIA polish
- 6 .bento-icon emoji divs → aria-hidden="true" (decorative; the h3 carries meaning).
- Contact form: each input/textarea got aria-describedby → its error span (now id'd error-name/need/reach + aria-live=polite),
  so screen readers announce validation errors tied to the field. Form JS still uses data-for to populate (unchanged).
- Verified headless: icons hidden, describedby targets exist & are the error spans, 0 errors.
