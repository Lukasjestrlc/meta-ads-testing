// Creator pool used as the seed for the public site. The admin at /admin
// commits an updated `data/creators.json` at the repo root which overrides
// this list at runtime — see src/lib/creatorStore.ts.
//
// Photo guidance for Meta-friendly classification:
// — clothed, casual, lifestyle (think TikTok/Instagram, not OF promo)
// — outdoor / café / gym / portrait / fashion shots are great
// — avoid: lingerie, swimsuit close-ups, bedroom shots, suggestive poses

export type Creator = {
  slug: string;
  name: string;
  age: number;
  bio: string;
  photo: string | null;
  video: string | null;
  destUrl: string;
  // Activity tag shown on cards. Empty string = render-time random pick.
  activity: string;
};

export const CREATORS: Creator[] = [
  {
    slug: "k1",
    name: "Kylie",
    age: 23,
    bio: "Sun-chasing, coffee-loving, weekend hiker.",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
    video: null,
    destUrl: "https://www.fanvue.com/kyliefromsweets/fv-16",
    activity: "active today",
  },
  {
    slug: "c1",
    name: "Chloe",
    age: 21,
    bio: "Art-school grad, vintage finds, soft mornings.",
    photo:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&auto=format&fit=crop&q=80",
    video: null,
    destUrl: "https://www.fanvue.com/tinybrunettebabe/fv-18",
    activity: "popular this week",
  },
  {
    slug: "j1",
    name: "Jane",
    age: 24,
    bio: "Always exploring. Brunch, books, late-night walks.",
    photo:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    video: null,
    destUrl: "https://www.fanvue.com/janesweety/fv-17",
    activity: "replied today",
  },
  {
    slug: "l1",
    name: "Lorna",
    age: 22,
    bio: "Yoga in the morning, sunsets at the beach.",
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    video: null,
    destUrl: "https://www.fanvue.com/lorna_xlove/fv-28",
    activity: "active today",
  },
];

// Preset activity tags shown on cards. Empty `""` slot at the front means
// "Random" — admins picking it leave the activity empty and render time
// rolls a different option per visitor for variety.
export const ACTIVITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Random (varies per visitor)" },
  { value: "online now", label: "online now" },
  { value: "active today", label: "active today" },
  { value: "active 5 min ago", label: "active 5 min ago" },
  { value: "active 2h ago", label: "active 2h ago" },
  { value: "replied recently", label: "replied recently" },
  { value: "popular this week", label: "popular this week" },
  { value: "trending", label: "trending" },
  { value: "new", label: "new" },
];

const RANDOM_ACTIVITY_POOL = ACTIVITY_OPTIONS.slice(1).map((o) => o.value);

export function pickActivity(stored: string): string {
  if (stored && stored.trim().length > 0) return stored;
  return RANDOM_ACTIVITY_POOL[
    Math.floor(Math.random() * RANDOM_ACTIVITY_POOL.length)
  ];
}
