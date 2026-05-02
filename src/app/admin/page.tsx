import type { Metadata } from "next";
import { isStoreConfigured, loadCreatorsFresh } from "@/lib/creatorStore";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin · Creators",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Read directly from GitHub instead of the deployment bundle so we never
  // serve stale data while Vercel is mid-rebuild after a save.
  const creators = await loadCreatorsFresh();
  const storeConfigured = isStoreConfigured();
  return (
    <AdminClient initial={creators} storeConfigured={storeConfigured} />
  );
}
