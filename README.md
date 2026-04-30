# meta-ads-testing

Stripped-down landing page used purely as a Meta-ads test bed. No admin, no
database, no chat funnel — just a homepage with creator cards that click
through to Fanvue, plus a Meta Pixel that fires `Lead` on every click.

The point is to isolate variables when debugging Meta classifier flags.
Everything is kept boring and minimal so any flag we pick up here is more
clearly attributable to: domain name, pixel, or content.

## Setup

```bash
npm install
cp .env.local.example .env.local      # then fill in the pixel ID
npm run dev
```

Open http://localhost:3000.

## Editing creators

`src/data/creators.ts` — hard-coded list. Change a name, photo, video, or
destination URL and the homepage updates on next reload. No DB sync needed.

## Pixel

Set `NEXT_PUBLIC_META_PIXEL_ID` in Vercel → Settings → Environment Variables.
You can swap pixels at any time; no code change.

## Deploy

Push to GitHub, import the repo into a fresh Vercel project, set the env var,
add a domain. That's it.
