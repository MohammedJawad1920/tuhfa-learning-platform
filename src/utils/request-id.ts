import { randomUUID } from "crypto";

/**
 * Generate a UUIDv4 request id.
 * Uses Node's crypto.randomUUID() under the hood.
 */
export function generateRequestId(): string {
  return randomUUID();
}

export default generateRequestId;
