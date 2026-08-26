/**
 * idService.ts — Centralized UUID identifier generation for Vectoris.
 *
 * Replaces Date.now()-based identifiers with UUIDv4 conforming to RFC 4122.
 * Uses the standard Web Cryptography API (crypto.randomUUID()) with a reliable fallback.
 */

/**
 * Generates a cryptographic UUIDv4.
 * If a prefix is supplied, returns `${prefix}_${uuid}`.
 *
 * @param prefix Optional entity prefix (e.g., "p", "d", "li", "s", "m", "exp")
 * @returns RFC 4122 compliant UUID string with optional prefix
 */
export function generateId(prefix?: string): string {
  let uuid: string;

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    // Standard RFC 4122 v4 compliant fallback using getRandomValues
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    uuid = Array.from(bytes)
      .map((b, i) => ([4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, "0")}` : b.toString(16).padStart(2, "0")))
      .join("");
  } else {
    // Ultimate fallback for non-crypto test environments
    uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return prefix ? `${prefix}_${uuid}` : uuid;
}
