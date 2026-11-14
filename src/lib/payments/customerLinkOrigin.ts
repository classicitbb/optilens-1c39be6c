const LIVE_SITE_ORIGIN = "https://classicvisions.net";

/** Unpublished development hosts: local dev servers and Lovable preview builds. */
const DEV_HOST_PATTERNS = [
  /^(localhost|127\.0\.0\.1|\[::1\])$/,
  /\.lovableproject\.com$/,
  /^id-preview--.+\.lovable\.app$/,
];

/** Hosts a customer's phone can actually reach: the live site and Vercel. */
const PUBLIC_HOST_PATTERNS = [
  /^(www\.)?classicvisions\.net$/,
  /\.vercel\.app$/,
];

/**
 * False on localhost, IP addresses, Lovable previews, or any other host a
 * customer cannot open. Links created from such a host will not work publicly.
 */
export function isPublicHost(): boolean {
  return PUBLIC_HOST_PATTERNS.some((p) => p.test(window.location.hostname));
}

/**
 * Origin to use for any link or QR code handed to a customer. Always the live
 * site, unless this build is running on an unpublished development host, so a
 * change under test points at itself instead of at production.
 */
export function customerLinkOrigin(): string {
  const { hostname, origin } = window.location;
  return DEV_HOST_PATTERNS.some((p) => p.test(hostname)) ? origin : LIVE_SITE_ORIGIN;
}
