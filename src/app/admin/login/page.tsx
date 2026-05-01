import type { Metadata } from "next";
import { isAdminEnabled } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin · Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? "/admin";

  if (!isAdminEnabled()) {
    return (
      <main className="min-h-screen grid place-items-center bg-[hsl(0_0%_4%)] text-white p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Admin not configured</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Set <code className="text-[#4ade80]">ADMIN_PASSWORD</code> and{" "}
            <code className="text-[#4ade80]">ADMIN_SESSION_SECRET</code> in
            Vercel → Settings → Environment Variables, then redeploy.
          </p>
        </div>
      </main>
    );
  }

  return <LoginForm from={from} />;
}
