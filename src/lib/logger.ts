import pino from "pino";

const sensitivePaths = [
  "password",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "GITHUB_TOKEN",
  "IA_ACCESS_KEY",
  "IA_SECRET_KEY",
  "REVALIDATION_SECRET",
  "cookie",
  "cookies",
  "*.cookie",
  "*.cookies",
  "env.ADMIN_PASSWORD",
  "env.SESSION_SECRET",
  "env.GITHUB_TOKEN",
  "env.IA_ACCESS_KEY",
  "env.IA_SECRET_KEY",
  "env.REVALIDATION_SECRET",
];

const loggerOptions: pino.LoggerOptions = {
  base: null,
  redact: {
    paths: sensitivePaths,
    censor: "[Redacted]",
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  mixin() {
    return {
      requestId: "",
      route: "",
      method: "",
      statusCode: 0,
      latencyMs: 0,
    };
  },
};

export function createLogger(
  destination: pino.DestinationStream = process.stdout,
) {
  return pino(loggerOptions, destination);
}

export const logger = createLogger();

export default logger;
