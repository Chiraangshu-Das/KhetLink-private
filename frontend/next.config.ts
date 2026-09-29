import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://khetlink-backend-b51p.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
