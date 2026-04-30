import { describe, it, expect } from "vitest";
import { buildSuccess, buildError } from "@/utils/response";

describe("response helpers", () => {
  it("buildSuccess includes requestId and timestamp", () => {
    const payload = { hello: "world" };
    const res = buildSuccess(payload);
    expect(res.data).toEqual(payload);
    expect(typeof res.meta.requestId).toBe("string");
    expect(typeof res.meta.timestamp).toBe("string");
  });

  it("buildError includes requestId and timestamp and error info", () => {
    const err = buildError("ERR_TEST", "Test message", { foo: "bar" });
    expect(err.error.code).toBe("ERR_TEST");
    expect(err.error.message).toBe("Test message");
    expect(err.error.details).toEqual({ foo: "bar" });
    expect(typeof err.requestId).toBe("string");
    expect(typeof err.timestamp).toBe("string");
  });
});
