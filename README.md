# meta-ads-testing

Tinder-style swipe → wheel → match → prep → redirect funnel used as a
Meta-ads test bed. Fires Pixel events at each funnel step (Lead on
swipe-start, swipe-complete, wheel-spin, wheel-result, match-continue,
prep-continue; Subscribe + InitiateCheckout on the final redirect to the
creator's Fanvue page).

The point is to isolate variables when debugging Meta classifier flags.
Everything stays boring so any flag we pick up here is more clearly
attributable to: domain name, pixel, or content.

## Setup

```bash
npm install
cp .env.local.example .env.local      # then fill in the values
npm run dev
```

Open http://localhost:3000.

The site works out of the box with the seed creators in
`src/data/creators.ts`. The admin is optional — if you don't configure
it, the public site renders the seed list (or `data/creators.json` if
that file is committed).

## Editing creators

Two ways:

1. **Admin UI at `/admin`** — edit names, photos, tracking links, etc.
   through a form. Save commits `data/creators.json` to your GitHub repo
   via the GitHub API, which triggers a Vercel rebuild. Live changes
   appear in ~30–60s. Requires the admin env vars (see below).
2. **Edit `src/data/creators.ts` directly** — the seed list. Pushed
   changes redeploy via Vercel like any other commit. Used as the
   fallback when `data/creators.json` doesn't exist, and as the
   "Reset to seed" target inside the admin.

## Pixel

Set `NEXT_PUBLIC_META_PIXEL_ID` in Vercel → Settings → Environment Variables.
You can swap pixels at any time; no code change.

## Admin section

The admin lives at `/admin` and is locked behind a password. To enable
saves, add four env vars in Vercel → Settings → Environment Variables
(all marked Sensitive, all environments):

| Name | What |
|---|---|
| `ADMIN_PASSWORD` | Password you'll type at `/admin/login` |
| `ADMIN_SESSION_SECRET` | Random 32+ char string. Generate with `openssl rand -base64 32` |
| `GITHUB_TOKEN` | Fine-grained PAT with **Contents: Read and write** for this repo. Create at https://github.com/settings/tokens?type=beta |
| `GITHUB_REPO` | `"owner/name"` (e.g. `Lukasjestrlc/meta-ads-testing`) |
| `GITHUB_BRANCH` | Optional. Defaults to `main` |

Then redeploy. Saves in the admin commit `data/creators.json` to that
repo + branch, which kicks off an automatic Vercel rebuild. New data is
live within ~30–60s of clicking Save. Click **Reset to seed** any time
to commit the seed list back as the live data.

You can pull the same env vars locally with `vercel env pull .env.local`.

## Native-browser escape

Conversions drop sharply when the destination opens inside Instagram or
Facebook's in-app webview (cookies, signup flows, payments often break).
The `/go` route auto-detects social in-app browsers and:

- **Android**: redirects through `intent://` to force Chrome.
- **iOS**: shows per-app instructions for "Open in Safari" (Apple blocks
  any programmatic escape from in-app browsers).

## Deploy

Push to GitHub, import the repo into a fresh Vercel project, set the env
vars above (at minimum `NEXT_PUBLIC_META_PIXEL_ID`; the admin/KV vars are
optional), add a domain. That's it.
