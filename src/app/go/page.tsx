import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GoRedirect from "./GoRedirect";
import { findCreatorBySlug } from "@/lib/creatorStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Opening…",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ slug?: string }>;
};

export default async function GoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const slug = sp.slug ?? "";
  const creator = await findCreatorBySlug(slug);
  if (!creator) notFound();

  return <GoRedirect dest={creator.destUrl} />;
}
