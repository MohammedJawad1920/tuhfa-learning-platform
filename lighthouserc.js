const targetUrl =
  process.env.LIGHTHOUSE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";

module.exports = {
  ci: {
    collect: {
      url: [targetUrl],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        interactive: ["error", { maxNumericValue: 200 }],
        accessibility: ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
