function normalizeUrl(value) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

const targetUrl =
  normalizeUrl(process.env.LIGHTHOUSE_URL) ||
  normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ||
  normalizeUrl(process.env.VERCEL_URL) ||
  "http://localhost:3000";

module.exports = {
  ci: {
    collect: {
      url: [targetUrl],
      numberOfRuns: 1,
      settings: {
        // CI runners are slower and less predictable than production infra.
        // Use provided throttling to avoid extreme synthetic slowdowns.
        throttlingMethod: "provided",
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "experimental-interaction-to-next-paint": [
          "error",
          { maxNumericValue: 200 },
        ],
        "categories:accessibility": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
