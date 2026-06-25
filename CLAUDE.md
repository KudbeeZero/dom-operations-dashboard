# CLAUDE.md — HERMES working rules for I Got A Dom

Auto-loaded each session. The full second-brain lives in `vault/wiki/`.

## Read first
- Read `vault/wiki/` before writing any file (`brand.md`, `services.md`,
  `copy.md`, `design-tokens.md`, `memory.md`).
- Append session decisions to `vault/wiki/memory.md` (never delete entries).

## Build rules
- Site is served from the **repo root** — `index.html` stays at root, never moved/renamed.
- Never delete files — archive to `vault/.raw/` if removing from root.
- No inline styles — all CSS in `style.css`. No lorem ipsum — copy must match the brand.
- Branch convention: `claude/hermes-sprint-N-descriptor`. Open a PR at the end of each sprint.

## ⭐ ALWAYS finish with a HERMES Session Status summary (owner preference)
Dominick wants every task to end with a skimmable, **copy-paste-ready** summary that is
**actionable** and **honest** — lead with what shipped, be blunt about what's real vs
stubbed and what's weak, then lead him to what HE can do next, then what HERMES will do.
Use plain `##` markdown sections in this order (not a boxed block):

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

Notes:
- Keep the **HERMES** name and the actionable trio (**YOUR NEXT ACTIONS / HERMES NEXT /
  BLOCKED ON YOU**) — that's what makes it useful.
- Sections that don't apply to a given task can be dropped; keep SUMMARY + the trio always.
- Supersedes the older boxed `━━━ HERMES WRAP-UP ━━━` template (kept in memory.md history).
