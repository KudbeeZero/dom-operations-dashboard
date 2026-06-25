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

## ⭐ ALWAYS finish with a copy-paste WRAP-UP (owner preference)
Dominick wants every task to end with a skimmable, **copy-paste-ready** summary that is
**actionable** — lead with what HE can do next, then what HERMES will do. Use this shape:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 HERMES WRAP-UP — <Sprint/Task name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS:   ✅ shipped / 🚧 blocked
BRANCH:   <branch>      PR: <#/url>
LIVE:     <url or "not deployed">

DONE:
 • <bullet> ...

⚡ YOUR NEXT ACTIONS (do these to move forward):
 1. [ ] <concrete action>
 2. [ ] <decision needed — my rec: ...>

🤖 HERMES NEXT (say "go" to run):
 1. [ ] <task>

⛔ BLOCKED ON YOU:
 • <anything blocking, or "nothing">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
