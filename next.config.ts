import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo uploads in /admin go through a server action that takes a
    // base64-encoded image. Default cap is 1MB; bump to 8MB so a ~5MB
    // raw photo (≈7MB base64) fits with headroom.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
