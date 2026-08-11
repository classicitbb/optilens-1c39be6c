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
  /** Configured store id, used when the gateway echoes an empty `storename`
   *  (observed in production returns) — the gateway still hashes with its
   *  own store id, so an empty echo must not fail authenticity. */
  expectedStorename?: string,
): Promise<{ valid: boolean; expected: string; received: string }> {
  // The S2S notification posts `notification_hash`; the browser return leg
  // posts `response_hash`. Same string-to-hash contract for both.
  const received = response.response_hash ?? response.notification_hash ?? "";

  const storenames = [response.storename ?? "", expectedStorename ?? ""]
    .filter((s, i, arr) => s !== "" && arr.indexOf(s) === i);
  if (storenames.length === 0) storenames.push("");

  let expected = "";
  for (const storename of storenames) {
    const stringToHash = [
      response.approval_code ?? "",
      response.chargetotal ?? "",
      response.currency ?? "",
      response.txndatetime ?? "",
      storename,
    ].join("|");
    const candidate = await hmacSha256Base64(stringToHash, sharedSecret);
    if (!expected) expected = candidate;
    if (timingSafeEqual(candidate, received)) {
      return { valid: true, expected: candidate, received };
    }
  }
  return { valid: false, expected, received };
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

// ── Response classification (shared by scotia-payment + scotia-return) ─────
export interface ScotiaResponseClassification {
  hashValid: boolean;
  approved: boolean;
  softDecline: boolean;
  associationResponseCode: string;
  failRc: string | null;
  oid: string | null;
  hosteddataid: string | null;
  chargetotal: string | null;
  currency: string | null;
  /** Diagnostics only — safe to log: HMAC digests, not the shared secret
   * itself, and response_hash already travels in plaintext over the wire. */
  debugHash?: {
    expected: string;
    received: string;
    inputFields: { approval_code: string; chargetotal: string; currency: string; txndatetime: string; storename: string };
    sharedSecretLength: number;
  };
}

/**
 * Validate + classify a raw gateway response (POST params from either the
 * iframe postMessage payload or the full-page redirect-back form). Single
 * source of truth for "approved vs soft vs hard decline" so the two entry
 * points (scotia-payment's `validate` action, scotia-return) never drift.
 */
export async function classifyScotiaResponse(
  response: Record<string, string>,
  sharedSecret: string,
): Promise<ScotiaResponseClassification> {
  const { valid, expected, received } = await validateResponseHash(response, sharedSecret);
  const associationCode = (response.processor_response_code
    ?? response.approval_code ?? "").split(":").pop()?.slice(0, 2) ?? "";
  return {
    hashValid: valid,
    approved: isApproved(associationCode),
    softDecline: isSoftDecline(associationCode),
    associationResponseCode: associationCode,
    failRc: response.fail_rc ?? null,
    oid: response.oid ?? null,
    hosteddataid: response.hosteddataid ?? null,
    chargetotal: response.chargetotal ?? null,
    currency: response.currency ?? null,
    // Only populated when the hash didn't validate — cheap to compute either
    // way, but no need to carry it around on the (common) success path.
    debugHash: valid ? undefined : {
      expected,
      received,
      inputFields: {
        approval_code: response.approval_code ?? "",
        chargetotal: response.chargetotal ?? "",
        currency: response.currency ?? "",
        txndatetime: response.txndatetime ?? "",
        storename: response.storename ?? "",
      },
      sharedSecretLength: sharedSecret.length,
    },
  };
}
