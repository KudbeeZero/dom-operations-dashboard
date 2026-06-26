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

## Deployment

Hosted on **Cloudflare Pages** (project: `dom-operations-dashboard`).
Production deploys on merge to `main`; every PR gets a preview URL.

- **Production / canonical domain:** https://igotadom.online
- **Pages default URL:** https://dom-operations-dashboard.pages.dev
- Primary contact CTAs use `sms:7736477598` and `tel:7736477598`
  (number: 773‑647‑7598). The QR code, canonical link, and Open Graph
  `og:url`/`og:image` all point at https://igotadom.online.

### Custom domain (igotadom.online → Cloudflare Pages)

The domain is registered at **Namecheap**. Recommended path — move DNS to
Cloudflare so the apex domain works with automatic CNAME flattening + free SSL:

1. Cloudflare dashboard → **Add a site** → `igotadom.online` (Free plan); let it
   scan existing records.
2. Cloudflare gives you **two nameservers** (e.g. `xxx.ns.cloudflare.com`).
3. Namecheap → Domain List → **Manage** → *Nameservers* → **Custom DNS** → paste
   the two Cloudflare nameservers → save (propagation up to ~24 h).
4. Once the zone is **Active** in Cloudflare: **Workers & Pages →
   dom-operations-dashboard → Custom domains → Set up a custom domain** → add
   `igotadom.online` (and optionally `www.igotadom.online`). Cloudflare creates
   the DNS records and provisions the SSL cert automatically.

If you keep DNS at Namecheap instead, only a `www` subdomain is straightforward
(CNAME `www → dom-operations-dashboard.pages.dev`); the apex (`@`) can't be a
CNAME on Namecheap BasicDNS, so the apex needs Cloudflare DNS (above) or a
redirect from apex → www. Using Cloudflare nameservers is the clean option.
