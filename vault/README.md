# HERMES Vault — I Got A Dom

This vault is the persistent memory + build output for the **I Got A Dom**
marketing site, following the HERMES architecture (Obsidian-as-memory,
Claude Code-as-builder).

```
vault/
├── .raw/
│   └── intake.md        ← raw, messy client info & brand briefs
├── wiki/                ← the structured "second brain" (source of truth)
│   ├── brand.md         ← name, tone, tagline, promise, disclaimer
│   ├── services.md      ← services + pricing tiers
│   ├── copy.md          ← approved headlines, CTAs, disclaimers
│   ├── design.md        ← color/type/design tokens & rules
│   └── memory.md        ← channel identity, goals, decision log
└── outputs/             ← (build output now lives at the repo root)
```

The built site is served from the **repository root** so Cloudflare Pages
(which deploys the repo root) shows it live:

```
<repo root>/
├── index.html           ← single-page entry point
├── style.css            ← design tokens + all component styles
├── main.js              ← GSAP hero animation, nav, form, QR code
└── assets/              ← logo.svg, og-image.svg
```

The previous operations-dashboard stub is archived at
`vault/.raw/operations-dashboard.html`.

## View it

It's a static site — open `index.html` at the repo root directly, or serve it:

```bash
python3 -m http.server 8000   # from the repo root, then visit http://localhost:8000
```

## HERMES commands (run in chat)

| Command | What it does |
|---------|--------------|
| `INGEST [content]` | Structure raw info into the right `wiki/` file |
| `RESEARCH [topic]` | Web research → `wiki/research.md` |
| `SAVE` | Capture session decisions → `wiki/memory.md` |
| `BUILD [section]` | Build / rebuild a section of the site |
| `QA` | Quality check at 375px + 1280px |

## Build notes
- Hero runs a one-time three-stage chaos→clarity GSAP timeline; falls back to
  a static clarity state under `prefers-reduced-motion`.
- Glassmorphism is used only on nav, pricing cards, and the contact form.
- Disclaimer is shown in both the services section and the footer.
- Scroll reveals use native `animation-timeline: view()` (no extra library).
