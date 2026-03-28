import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "**.facebook.com", pathname: "/**" },
      { protocol: "https", hostname: "fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "facebook.com", pathname: "/**" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
