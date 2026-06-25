# I Got A Dom — Chaos to Clarity.

Marketing site for **I Got A Dom**, a same-day document cleanup service.
Messy notes, screenshots, menus, and rough drafts in — clean, professional,
ready-to-send results out.

Built with the **HERMES** architecture: an Obsidian-style vault
(`vault/`) acts as persistent memory/source-of-truth, and the static site is
generated from it.

## Run it

Static site, no build step:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Structure

```
index.html  style.css  main.js  assets/   ← the deployed site (repo root)
vault/                                     ← HERMES memory
├── .raw/        raw intake + archived operations-dashboard stub
└── wiki/        brand, services, copy, design tokens, memory/decisions
```

See `vault/README.md` for the full HERMES layout and commands.

> The earlier operations-dashboard stub now lives at
> `vault/.raw/operations-dashboard.html`.
