# meta-ads-testing

Tinder-style swipe → quiz → redirect funnel used as a Meta-ads test bed.
Fires Pixel events at each funnel step (Lead on swipe-start, swipe-complete,
match-continue, quiz-complete, prep-continue; Subscribe + InitiateCheckout
on the final redirect to the creator's Fanvue page).

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
`src/data/creators.ts`. KV + admin are optional — if you don't configure
them, the public site still works using the seed list.

## Editing creators

Two ways:

1. **Admin UI at `/admin`** (recommended once deployed) — edit names,
   photos, tracking links, etc. through a form. Edits persist in Vercel KV
   and go live within seconds, no redeploy needed. Requires KV + admin
   env vars (see below).
2. **Edit `src/data/creators.ts`** — hard-coded seed list. Used as the
   public fallback when KV isn't configured, and as the "Reset to seed"
   target inside the admin.

## Pixel

Set `NEXT_PUBLIC_META_PIXEL_ID` in Vercel → Settings → Environment Variables.
You can swap pixels at any time; no code change.

## Admin section

The admin lives at `/admin` and is locked behind a password. To enable:

1. **Add the password env vars** in Vercel → Settings → Environment Variables:
   - `ADMIN_PASSWORD` — what you'll type at `/admin/login`
   - `ADMIN_SESSION_SECRET` — random string used to sign the session cookie.
     Generate with `openssl rand -base64 32`.
2. **Connect Upstash Redis** in Vercel → Storage → Add Database → Upstash.
   This auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into your
   project, which the store uses to read/write the creator list.
3. **Redeploy** so the new env vars take effect.

You can pull the same env vars locally with `vercel env pull .env.local`.

The first time you save in admin, the seed list is overwritten by whatever
you've edited. Click **Reset to seed** at any time to restore the default
list from the repo.

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
