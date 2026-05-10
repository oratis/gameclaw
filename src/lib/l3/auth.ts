/**
 * One-time tokens that authenticate worker → backend callbacks (results,
 * heartbeats, credential fetches) and worker → backend cred fetches.
 *
 * The token is created at dispatch time (stored on WorkerJob.callbackToken),
 * passed to the worker via Cloud Run Jobs env vars, and constant-time
 * compared on every callback. Single-use for status updates (callbackUsed
 * flag flips on the first terminal status callback).
 */

import { randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateCallbackToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Constant-time comparison. Both inputs must be hex strings of the same
 * length to be considered a possible match.
 */
export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return false;
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
