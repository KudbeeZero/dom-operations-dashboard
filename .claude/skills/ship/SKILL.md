---
name: ship
description: Ship a change end-to-end on this repo — branch, validate, commit, push, open a draft PR, wait for CI, mark ready, squash-merge, and end with a HERMES Session Status. Use whenever the user says "ship it", "go", or a change is ready to land.
---

# /ship — land a change the HERMES way

The repeated loop for this repo (static site on Cloudflare Pages, GitHub via the
`mcp__github__*` tools — never `gh`). Follow it exactly so it stays cheap and consistent.

## Steps
1. **Branch off fresh main.** `git checkout main && git pull origin main && git checkout -b claude/<short-descriptor>`. Never commit straight to main. If a designated branch is set, use it.
2. **Make the change**, following `/site-rules`.
3. **Validate.** `node --check main.js` (the repo has no build/test step — this is the gate). For other files, a quick sanity check.
4. **Commit** with a clear message. End commit messages with the two trailer lines the harness requires (Co-Authored-By + Claude-Session). Do **not** put model IDs in commits/PRs.
5. **Push** `git push -u origin <branch>` (retry up to 4× with 2/4/8/16s backoff only on network errors).
6. **Open a DRAFT PR** with `mcp__github__create_pull_request` (base `main`). Mirror `.github/pull_request_template.md` if one exists.
7. **Wait for CI** — do NOT poll with sleep. The Cloudflare Pages check + deploy comment arrive as `<github-webhook-activity>`. Read CI via `mcp__github__pull_request_read` method `get_check_runs`.
8. **On green:** `mcp__github__update_pull_request { draft:false }` (a draft can't be merged → 405), then `mcp__github__merge_pull_request { merge_method:'squash' }`.
9. **End with a HERMES Session Status** (see `vault/wiki/` / CLAUDE.md): `## ✅ SUMMARY` + the actionable trio (YOUR NEXT ACTIONS / HERMES NEXT / BLOCKED ON YOU). Lead with what shipped; be blunt about what's real vs stubbed.

## Rules
- One logical change per PR. Keep diffs reviewable.
- Out-of-order webhooks are normal (a "ready for review" event can arrive after the merge) — verify state with a fresh fetch before acting.
- After a PR merges you're auto-unsubscribed; don't reopen it.
- If a memory/`vault` note belongs to the change, include it **in the same commit before merge** (post-merge memory commits land on dead branches and never reach main — a real bug we hit repeatedly).
- This environment can't reach the live Cloudflare/preview URL — verification is `node --check` + static reasoning + the owner's eyes. Say so honestly in the status.
