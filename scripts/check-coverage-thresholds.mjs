import fs from "node:fs";
import path from "node:path";

const summaryPath = path.join(
  process.cwd(),
  "coverage",
  "coverage-summary.json",
);

if (!fs.existsSync(summaryPath)) {
  console.error(
    "coverage-summary.json not found. Run vitest with --coverage first.",
  );
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

function extractGroupCoverage(prefix) {
  const entries = Object.entries(summary).filter(([file]) =>
    file.includes(prefix),
  );

  let linesCovered = 0;
  let linesTotal = 0;

  for (const [, metrics] of entries) {
    linesCovered += metrics.lines.covered;
    linesTotal += metrics.lines.total;
  }

  const pct = linesTotal === 0 ? 0 : (linesCovered / linesTotal) * 100;
  return Number(pct.toFixed(2));
}

const libCoverage = extractGroupCoverage(
  `${path.sep}src${path.sep}lib${path.sep}`,
);
const schemasCoverage = extractGroupCoverage(
  `${path.sep}src${path.sep}schemas${path.sep}`,
);

const failures = [];

if (libCoverage < 80) {
  failures.push(`/src/lib lines coverage ${libCoverage}% is below 80%`);
}

if (schemasCoverage < 100) {
  failures.push(
    `/src/schemas lines coverage ${schemasCoverage}% is below 100%`,
  );
}

if (failures.length > 0) {
  console.error("Coverage threshold check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Coverage thresholds passed: /src/lib ${libCoverage}% | /src/schemas ${schemasCoverage}%`,
);
