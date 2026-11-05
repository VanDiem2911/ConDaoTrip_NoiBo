import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  serverExternalPackages: ["mongodb"],
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      // logo/biểu tượng ít đổi: cache 1 ngày, làm mới ngầm trong 1 tuần
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;
