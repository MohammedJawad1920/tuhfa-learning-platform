const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "production"
                ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; media-src https://archive.org; connect-src 'self'; frame-ancestors 'none';"
                : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ws:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src https://archive.org; connect-src 'self' ws:; frame-ancestors 'none';",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
