// Creator pool for the homepage cards. Edit this file to swap people in/out
// without touching any other code. Each entry is hard-coded so there's no
// database to flag, sync, or migrate.
//
// Fields:
//   slug      — unique short id; appears in /go?slug=<slug> click URLs.
//   name      — display name shown on the card.
//   photo     — public URL of the card image (Supabase storage, Imgix,
//               Cloudinary, or even a hosted GitHub raw URL all work).
//   video     — optional autoplay video URL (mp4). If set, replaces photo.
//   destUrl   — where the click should ultimately land (Fanvue profile).
//   activity  — small live-activity caption shown bottom-left of the card.

export type Creator = {
  slug: string;
  name: string;
  photo: string | null;
  video: string | null;
  destUrl: string;
  activity: string;
};

export const CREATORS: Creator[] = [
  {
    slug: "k1",
    name: "Kylie",
    photo: null,
    video: null,
    destUrl: "https://www.fanvue.com/kyliefromsweets/fv-16",
    activity: "active today",
  },
  {
    slug: "c1",
    name: "Chloe",
    photo: null,
    video: null,
    destUrl: "https://www.fanvue.com/tinybrunettebabe/fv-18",
    activity: "popular this week",
  },
  {
    slug: "j1",
    name: "Jane",
    photo: null,
    video: null,
    destUrl: "https://www.fanvue.com/janesweety/fv-17",
    activity: "replied today",
  },
  {
    slug: "l1",
    name: "Lorna",
    photo: null,
    video: null,
    destUrl: "https://www.fanvue.com/lorna_xlove/fv-28",
    activity: "active today",
  },
];

export function findCreator(slug: string): Creator | null {
  return CREATORS.find((c) => c.slug === slug) ?? null;
}
