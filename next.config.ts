import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin photo/video uploads ride on server actions. Vercel caps the
    // *transport* body at 4.5MB regardless of plan, so there's no point
    // setting Next's limit higher than that — the request would never
    // reach us. We bump it just past Vercel's cap so Next isn't the
    // first thing to reject when bodies approach the limit.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
