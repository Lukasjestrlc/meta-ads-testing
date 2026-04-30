// Creator pool for the homepage cards. Edit this file to swap people in/out
// without touching any other code. Each entry is hard-coded so there's no
// database to flag, sync, or migrate.
//
// Photo guidance for Meta-friendly classification:
// — clothed, casual, lifestyle (think TikTok/Instagram, not OF promo)
// — outdoor / café / gym / portrait / fashion shots are great
// — avoid: lingerie, swimsuit close-ups, bedroom shots, suggestive poses
// The placeholder Unsplash photos below are SFW examples; replace with the
// actual creators when you're ready (just paste new URLs in `photo`).

export type Creator = {
  slug: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  match: number; // fake compatibility score shown on results card (0-100)
  tags: string[];
  photo: string | null;
  video: string | null;
  destUrl: string;
  activity: string;
};

export const CREATORS: Creator[] = [
  {
    slug: "k1",
    name: "Kylie",
    age: 23,
    city: "Los Angeles",
    bio: "Sun-chasing, coffee-loving, weekend hiker.",
    match: 96,
    tags: ["chill", "outdoorsy", "fitness"],
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
    city: "London",
    bio: "Art-school grad, vintage finds, soft mornings.",
    match: 94,
    tags: ["artsy", "alt", "mellow"],
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
    city: "New York",
    bio: "Always exploring. Brunch, books, late-night walks.",
    match: 92,
    tags: ["glam", "curious", "city"],
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
    city: "Sydney",
    bio: "Yoga in the morning, sunsets at the beach.",
    match: 89,
    tags: ["chill", "fitness", "outdoorsy"],
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    video: null,
    destUrl: "https://www.fanvue.com/lorna_xlove/fv-28",
    activity: "active today",
  },
];

export function findCreator(slug: string): Creator | null {
  return CREATORS.find((c) => c.slug === slug) ?? null;
}
