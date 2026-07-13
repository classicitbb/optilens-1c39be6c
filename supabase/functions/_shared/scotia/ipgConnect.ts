// ============================================================
// Scotia eCom+ (Fiserv IPG "Connect") — shared hash utilities
// ------------------------------------------------------------
// Implements the Hosted Payment Page hash contract described in
// docs/scotia-ecom-hosted-payment-integration.md:
//
//   • Extended request hash  (form submission integrity)
//   • Response hash          (response authenticity validation)
//
// The SharedSecret is the HMAC key and MUST stay server-side.
// Nothing in this module should ever be bundled into the browser.
// ============================================================

/** Gateway environments. The processing URL differs per environment. */
export type ScotiaEnv = "test" | "production";

export const GATEWAY_URLS: Record<ScotiaEnv, string> = {
  test: "https://test.ipg-online.com/connect/gateway/processing",
  production: "https://www.ipg-online.com/connect/gateway/processing",
};

/** Always required by the manual (page 8), regardless of operation. */
export const ALWAYS_HASH_ALGORITHM = "HMACSHA256";
export const DEFAULT_CHECKOUT_OPTION = "combinedpage";

/**
 * Keys that participate in the form POST but are EXCLUDED from the
 * extended-hash string (manual page 9):
 *   - sharedsecret   → used as the HMAC key, never in the string
 *   - hashExtended   → it is the output, so it cannot be an input
 */
const HASH_EXCLUDED_KEYS = new Set(["sharedsecret", "hashExtended"]);

/**
 * Build the `stringToExtendedHash`.
 *
 * Per manual page 9:
 *   "calculated using ALL HTML form parameters ascending by field name
 *    (except sharedsecret and hashExtended), where uppercase parameters
 *    must come before lowercase ones (Based on ASCII values). Later join
 *    the parameters separated by pipes. Only use the value of the
 *    parameters and not their name."
 *
 * JavaScript's default Array.sort() compares UTF-16 code units, which for
 * ASCII letters places uppercase (65–90) before lowercase (97–122) — exactly
 * the ordering the gateway expects. We sort explicitly by code point to make
 * the contract obvious and locale-independent.
 */
export function buildExtendedHashString(formParams: Record<string, string>): string {
  const keys = Object.keys(formParams)
    .filter((k) => !HASH_EXCLUDED_KEYS.has(k))
    .filter((k) => formParams[k] !== undefined && formParams[k] !== null)
    .sort(asciiCompare);

  return keys.map((k) => String(formParams[k])).join("|");
}

/** ASCII / code-point comparison (uppercase before lowercase). */
function asciiCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * HMAC-SHA256 over `message`, keyed with `sharedSecret`, Base64-encoded.
 * Uses Web Crypto so it runs unchanged in Deno (Edge Functions) and modern
 * browsers' workers — though, again, only call it server-side.
 */
export async function hmacSha256Base64(message: string, sharedSecret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sharedSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64FromBytes(new Uint8Array(sig));
}

function base64FromBytes(bytes: Uint8Array): string {
  // Deno + browsers both expose btoa over a binary string.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // deno-lint-ignore no-deprecated-deno-api
  return btoa(binary);
}

/**
 * Produce the `hashExtended` value for a set of form parameters.
 * Returns the Base64 HMAC the gateway expects in the hidden input.
 */
export async function computeExtendedHash(
  formParams: Record<string, string>,
  sharedSecret: string,
): Promise<string> {
  const stringToHash = buildExtendedHashString(formParams);
  return hmacSha256Base64(stringToHash, sharedSecret);
}

/**
 * Validate a gateway RESPONSE hash (manual page 10).
 *
 * The response arrives at responseSuccessURL / responseFailURL as POST
 * parameters. The authenticity string is a FIXED ordering (NOT the
 * ascending sort used for the request):
 *
 *   approval_code|chargetotal|currency|txndatetime|storename
 *
 * We recompute the HMAC and compare to the `response_hash` field using a
 * length-safe constant-time comparison.
 */
export async function validateResponseHash(
  response: Record<string, string>,
  sharedSecret: string,
): Promise<{ valid: boolean; expected: string; received: string }> {
  const stringToHash = [
    response.approval_code ?? "",
    response.chargetotal ?? "",
    response.currency ?? "",
    response.txndatetime ?? "",
    response.storename ?? "",
  ].join("|");

  const expected = await hmacSha256Base64(stringToHash, sharedSecret);
  const received = response.response_hash ?? "";
  return { valid: timingSafeEqual(expected, received), expected, received };
}

/** Constant-time string comparison to avoid hash-timing leaks. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// ── Response-code helpers (manual pages 15–17) ─────────────────────────────
// Soft errors → safe to let the customer retry. Hard errors → do not retry.
const SOFT_RESPONSE_CODES = new Set([
  "06", "13", "14", "30", "51", "55", "61", "65", "68", "75", "91", "92", "96",
]);

/** True when the issuer association response code is a "soft" (retryable) decline. */
export function isSoftDecline(associationResponseCode: string): boolean {
  return SOFT_RESPONSE_CODES.has((associationResponseCode ?? "").trim());
}

/** Approved transactions return association code "00". */
export function isApproved(associationResponseCode: string): boolean {
  return (associationResponseCode ?? "").trim() === "00";
}
