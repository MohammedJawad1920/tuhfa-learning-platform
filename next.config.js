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
            // Allow inline scripts during development to avoid blocking Next.js
            // runtime/hmr inline scripts. In production we keep a stricter policy.
            value:
              // NOTE: Next injects runtime scripts that can require inline/script-eval
              // behavior. Historically we allowed strict CSP in production which
              // caused the hosted site to break (inline scripts blocked). As an
              // immediate fix, allow inline scripts/styles and eval in
              // production. This is a temporary mitigation — see follow-ups
              // below to harden CSP using nonces/hashes or server-side
              // instrumentation.
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src https://archive.org; connect-src 'self'; frame-ancestors 'none';",
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
