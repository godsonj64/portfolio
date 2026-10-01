# portfolio

Godson Johnson's portfolio: five local-first desktop products (Cicada, Timbre, ElectroPlate, AXIO Medical, Talenta) and **the Lab**, a live window onto [`godsonj64/nano-lab`](https://github.com/godsonj64/nano-lab).

Next.js 16 (App Router), plain CSS, no UI libraries. Pages are static and refreshed by ISR plus a GitHub push webhook.

## What is live from GitHub

| Where | Source | Notes |
|---|---|---|
| Version chips, download panels | latest release of each project's **public** releases repo | `src/content/projects.ts` → `releases` |
| `/lab` | `nano-lab`: `log/*.md`, `experiments/*/README.md`, commits | |
| `/code/nano-lab/...` | `nano-lab` tree + files | the **only** browsable repo (`src/content/repos.ts`) |
| "Lab pushed …" in the nav | `nano-lab` head commit | |

Private repos are refused even when the token could read them, and product source code is never served.

### Direct links (visitors never land on GitHub)

| URL | Does |
|---|---|
| `/dl/<project>/mac` · `/windows` · `/linux` | latest installer for that OS |
| `/dl/<project>/<key>` | a specific build, e.g. `mac-universal-installer-dmg` (stable across versions) |
| `/dl/code/nano-lab` | whole lab repo as .zip |
| `/api/zip/nano-lab?path=experiments/foo` | one folder as .zip |
| `/api/raw/nano-lab/<path>` (`?download=1`) | one file |

## Develop

```bash
npm install
npm run dev:gh   # uses your `gh` login as GITHUB_TOKEN (never written to disk)
npm run dev      # unauthenticated: 60 GitHub API calls/hour
```

- Copy and identity: `src/content/site.ts`, `src/content/projects.ts`
- Artwork: replace `assets-src/wallpapers/<slug>.png` (or `assets-src/icons/<slug>.png|svg`) and run `npm run art`. It writes hashed AVIF/WebP files to `public/art` and `src/content/art-manifest.json`; commit both.

## Deploy on Vercel

1. Import `godsonj64/portfolio` in Vercel (framework preset: Next.js, no settings to change).
2. Environment variables:
   - `GITHUB_TOKEN`: a fine-grained token, **public repositories, read-only** (raises the API limit to 5,000/h).
   - `GITHUB_WEBHOOK_SECRET`: any long random string.
   - `NEXT_PUBLIC_SITE_URL`: your production URL (optional; used for canonical/OG URLs).
3. In `godsonj64/nano-lab` → Settings → Webhooks: payload URL `https://<your-domain>/api/revalidate`, content type `application/json`, the same secret, event **Just the push event**. Add the same webhook (Releases event) to the releases repos if you want new versions to appear instantly.

Without the webhook everything still updates within ~2 minutes.

## The daily lab workflow

```bash
cd ~/nano-lab
$EDITOR log/$(date +%F).md          # today's entry (front matter optional)
cp -r templates/experiment experiments/my-idea
git add -A && git commit -m "day N: …" && git push
```
