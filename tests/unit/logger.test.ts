import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createLogger } from "@/lib/logger";

function createLogCollector() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  return {
    stream,
    getLogs: () => chunks.join(""),
  };
}

describe("logger", () => {
  it("includes required structured fields on each log line", () => {
    const collector = createLogCollector();
    const logger = createLogger(collector.stream);

    logger.info("request completed");

    const logLine = collector.getLogs().trim();
    const parsed = JSON.parse(logLine);

    expect(parsed.requestId).toBe("");
    expect(parsed.route).toBe("");
    expect(parsed.method).toBe("");
    expect(parsed.statusCode).toBe(0);
    expect(parsed.latencyMs).toBe(0);
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("redacts sensitive fields", () => {
    const collector = createLogCollector();
    const logger = createLogger(collector.stream);

    logger.info(
      {
        requestId: "req-1",
        route: "/admin",
        method: "POST",
        statusCode: 200,
        latencyMs: 12,
        password: "secret",
        ADMIN_PASSWORD: "top-secret",
      },
      "admin login attempted",
    );

    const logLine = collector.getLogs().trim();
    const parsed = JSON.parse(logLine);

    expect(parsed.requestId).toBe("req-1");
    expect(parsed.route).toBe("/admin");
    expect(parsed.method).toBe("POST");
    expect(parsed.statusCode).toBe(200);
    expect(parsed.latencyMs).toBe(12);
    expect(parsed.password).toBe("[Redacted]");
    expect(parsed.ADMIN_PASSWORD).toBe("[Redacted]");
  });
});
