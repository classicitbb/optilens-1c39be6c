// Pure title-cleanup helpers, free of Deno APIs so they can be unit tested.

/**
 * Page titles often carry a site suffix ("Acme Optical | Yelp"). Splitting on the
 * first separator is NOT safe: plenty of real businesses contain " - " or " | "
 * in their name ("Vision Care - Bridgetown"). So we only remove the LAST segment,
 * and only when it clearly looks like site boilerplate.
 */
const DIRECTORY_SUFFIXES = new Set([
  "yelp",
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "x",
  "tripadvisor",
  "yellow pages",
  "yellowpages",
  "google maps",
  "google",
  "home",
  "homepage",
  "contact",
  "contact us",
  "about",
  "about us",
  "official site",
  "official website",
  "welcome",
  "opening hours",
  "reviews",
]);

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const brandFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const label = host.split(".")[0];
    return label ? normalise(label) : null;
  } catch {
    return null;
  }
};

const looksLikeSuffix = (segment: string, urlBrand: string | null): boolean => {
  const key = normalise(segment);
  if (!key) return true;
  if (DIRECTORY_SUFFIXES.has(key)) return true;
  if (urlBrand && (key === urlBrand || key.replace(/ /g, "") === urlBrand.replace(/ /g, ""))) return true;
  return false;
};

/** Returns a clean business name for a search result, never empty. */
export function cleanBusinessName(title?: string | null, url?: string | null): string {
  const raw = String(title ?? "").trim();
  const fallback = String(url ?? "").trim() || "Unknown Business";
  if (!raw) return fallback;

  const parts = raw.split(/\s+[|\u2013\u2014-]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return raw;

  const urlBrand = brandFromUrl(url);
  const last = parts[parts.length - 1];
  if (!looksLikeSuffix(last, urlBrand)) return raw;

  const head = parts.slice(0, -1).join(" - ").trim();
  return head.length >= 3 ? head : raw;
}

/** Match key used to group titles/names describing the same business. */
export function businessNameKey(name?: string | null): string {
  const base = normalise(name ?? "");
  if (!base) return "";
  const stop = new Set(["the", "inc", "inc's", "ltd", "limited", "llc", "co", "company", "corp", "plc"]);
  return base
    .split(" ")
    .filter((word) => !stop.has(word))
    .join(" ")
    .trim();
}
