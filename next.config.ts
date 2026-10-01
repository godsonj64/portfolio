import type { NextConfig } from "next";

const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pin the workspace root (a stray lockfile in the home directory would otherwise be picked up)
  turbopack: { root: process.cwd() },
  // Art is pre-encoded (AVIF/WebP, hashed filenames) by `npm run art`, so the runtime optimizer isn't needed.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/art/:path*", headers: immutable },
      { source: "/icons/:path*", headers: immutable },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default config;
