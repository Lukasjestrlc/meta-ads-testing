import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin photo + video uploads go through a server action that takes
    // a base64-encoded payload. Default cap is 1MB; bump to 50MB so a
    // ~25MB raw video (≈35MB base64) fits with headroom. Photos at ≤5MB
    // are well within this.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
