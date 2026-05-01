import type { Metadata } from "next";
import { loadCreators, isStoreConfigured } from "@/lib/creatorStore";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin · Creators",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const creators = await loadCreators();
  const storeConfigured = isStoreConfigured();
  return (
    <AdminClient initial={creators} storeConfigured={storeConfigured} />
  );
}
