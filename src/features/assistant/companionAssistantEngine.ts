import { getStoreProductRoute, type StoreProduct } from "@/hooks/useStoreProducts";
import type { ContentArticle } from "@/hooks/useContentArticles";
import { SITE_SEARCH_INDEX } from "@/lib/siteSearchIndex";
import { retailerMarketMap, retailerMarkets, retailerSearchIndex, type RetailerEntry } from "@/data/retailers";

export type AssistantProfile = "general_search" | "retailer_help" | "customer_support" | "portal_support";

export type AssistantLinkKind = "site" | "product" | "knowledge" | "retailer";

export interface AssistantLinkResult {
  id: string;
  title: string;
  description: string;
  path: string;
  label: string;
  kind: AssistantLinkKind;
  phone?: string;
  website?: string;
  marketName?: string;
  external?: boolean;
  score: number;
}

export interface AssistantQueryResult {
  query: string;
  profile: AssistantProfile;
  intent: "retailer" | "product" | "support" | "general";
  topLinks: AssistantLinkResult[];
  answer: string;
  confidence: "high" | "medium" | "low";
  suggestsHumanHelp: boolean;
}

type CorpusEntry = {
  id: string;
  title: string;
  description: string;
  path: string;
  label: string;
  text: string;
  kind: AssistantLinkKind;
  phone?: string;
  website?: string;
  marketSlug?: string;
  marketName?: string;
  external?: boolean;
};

export interface AssistantEngineInput {
  products: StoreProduct[];
  knowledge: ContentArticle[];
}

const RETAILER_WORDS = ["retailer", "optical", "optician", "clinic", "doctor", "ophthalmology", "barbados", "caribbean", "island"];
const PRODUCT_WORDS = ["lens", "lenses", "coating", "progressive", "single vision", "anti-fatigue", "photochromic", "polarized", "blue filter"];
const SUPPORT_WORDS = ["support", "help", "ticket", "contact", "email", "call", "order", "account", "portal", "customer service"];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) => normalizeText(value).split(" ").filter(Boolean);

const includesAny = (text: string, words: string[]) => words.some((word) => text.includes(normalizeText(word)));

const buildRetailerPath = (marketSlug: string) =>
  marketSlug === "barbados" ? "/find-a-retailer/barbados" : `/find-a-retailer#${marketSlug}`;

const buildRetailerDescription = (entry: RetailerEntry, marketName: string) =>
  [marketName, entry.category, entry.location, entry.notes].filter(Boolean).join(" • ");

export const buildAssistantCorpus = ({ products, knowledge }: AssistantEngineInput): CorpusEntry[] => {
  const siteEntries: CorpusEntry[] = SITE_SEARCH_INDEX.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    path: entry.path,
    label: entry.group,
    text: `${entry.title} ${entry.description} ${(entry.keywords ?? []).join(" ")}`,
    kind: "site",
  }));

  const productEntries: CorpusEntry[] = products.map((product) => ({
    id: `product-${product.product_type}-${product.id}`,
    title: product.name,
    description: `${product.category} • ${product.description}`.trim(),
    path: getStoreProductRoute(product),
    label: "Product",
    text: `${product.name} ${product.description} ${product.category} ${product.subcategory} ${product.tags.join(" ")}`,
    kind: "product",
  }));

  const knowledgeEntries: CorpusEntry[] = knowledge.map((article) => ({
    id: `knowledge-${article.id}`,
    title: article.title,
    description: article.description || article.content.slice(0, 160),
    path: `/knowledge#${article.category?.toLowerCase().replace(/\s+/g, "-") || article.page_slug || article.id}`,
    label: "Knowledge Base",
    text: `${article.title} ${article.description} ${article.content} ${article.category}`,
    kind: "knowledge",
  }));

  const retailerEntries: CorpusEntry[] = retailerSearchIndex.map((entry) => ({
    id: `retailer-${entry.marketSlug}-${entry.name}-${entry.location}`.replace(/\s+/g, "-").toLowerCase(),
    title: entry.name,
    description: buildRetailerDescription(entry, entry.marketName),
    path: buildRetailerPath(entry.marketSlug),
    label: "Retailer",
    text: `${entry.marketName} ${entry.name} ${entry.category} ${entry.location} ${entry.phone ?? ""} ${entry.website ?? ""} ${entry.notes ?? ""}`,
    kind: "retailer",
    phone: entry.phone,
    website: entry.website,
    marketSlug: entry.marketSlug,
    marketName: entry.marketName,
    external: Boolean(entry.website?.startsWith("http")),
  }));

  return [...siteEntries, ...productEntries, ...knowledgeEntries, ...retailerEntries];
};

const scoreEntry = (entry: CorpusEntry, query: string, route: string, profile: AssistantProfile) => {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenize(query);
  const haystack = normalizeText(entry.text);
  let score = 0;

  if (!normalizedQuery) return 0;
  if (haystack.includes(normalizedQuery)) score += 20;
  if (normalizeText(entry.title).includes(normalizedQuery)) score += 12;
  if (entry.path === route) score += 8;

  for (const token of tokens) {
    if (normalizeText(entry.title).includes(token)) score += 6;
    if (normalizeText(entry.description).includes(token)) score += 4;
    if (haystack.includes(token)) score += 2;
  }

  if (profile === "retailer_help" && entry.kind === "retailer") score += 10;
  if (profile === "portal_support" && (entry.path.startsWith("/profile") || entry.kind === "site")) score += 6;
  if (route.startsWith("/find-a-retailer") && entry.kind === "retailer") score += 8;
  if (route.startsWith("/profile") && entry.path.startsWith("/profile")) score += 8;

  return score;
};

const inferIntent = (query: string, route: string, profile: AssistantProfile): AssistantQueryResult["intent"] => {
  const text = normalizeText(query);
  if (profile === "retailer_help" || route.startsWith("/find-a-retailer") || includesAny(text, RETAILER_WORDS)) return "retailer";
  if (profile === "portal_support" || route.startsWith("/profile") || includesAny(text, SUPPORT_WORDS)) return "support";
  if (includesAny(text, PRODUCT_WORDS)) return "product";
  return "general";
};

const inferConfidence = (topScore: number): AssistantQueryResult["confidence"] => {
  if (topScore >= 30) return "high";
  if (topScore >= 16) return "medium";
  return "low";
};

const getNearbyRetailerMarkets = (query: string) => {
  const normalized = normalizeText(query);
  const exactMarket = retailerMarkets.find((market) => normalized.includes(normalizeText(market.name)));
  if (exactMarket) {
    return [exactMarket.name];
  }

  return retailerMarkets.slice(0, 3).map((market) => market.name);
};

const buildRetailerAnswer = (topLinks: AssistantLinkResult[], query: string) => {
  if (topLinks.length > 0) {
    const [first, second] = topLinks;
    const leading = second
      ? `I found strong website matches for ${first.title} and ${second.title}.`
      : `I found a strong website match for ${first.title}.`;
    return `${leading} Start with the retailer links above, then use Request help if you want Classic Visions to guide you to the best fit or nearby alternative.`;
  }

  const markets = getNearbyRetailerMarkets(query).join(", ");
  return `I couldn't find a strong retailer listing from the website for that exact request yet. Try a nearby market such as ${markets}, or use the help path so Classic Visions can route you to a suitable partner or clinic.`;
};

const buildProductAnswer = (topLinks: AssistantLinkResult[]) => {
  if (topLinks.length === 0) {
    return "I couldn't find a strong product or article match from the website yet. Try a more specific lens, coating, or use-case so I can narrow the results.";
  }

  const titles = topLinks.slice(0, 3).map((link) => link.title).join(", ");
  return `The strongest website matches for your question are ${titles}. Open those links first, then use the summary here to compare options before you decide what to read next.`;
};

const buildSupportAnswer = (topLinks: AssistantLinkResult[], route: string) => {
  if (route.startsWith("/profile")) {
    return topLinks.length > 0
      ? "I found the most relevant portal and support pages from your account area. Open those first, and if you still need help I can turn this into a support request with your portal context attached."
      : "I can help with account-aware support here in the portal. If the existing pages don't solve it, I can turn this into a support request with your account context attached.";
  }

  return topLinks.length > 0
    ? "I found the closest support and contact pages on the website. Open the best match above, and if it still doesn't solve it I can guide you to call, email, or a request form."
    : "I couldn't find a strong support article for that exact question. I can still guide you to call, email, or a request form from here.";
};

const buildGeneralAnswer = (topLinks: AssistantLinkResult[]) => {
  if (topLinks.length === 0) {
    return "I couldn't find a strong website match for that wording yet. Try rephrasing your question, or tell me whether you need retailer help, product guidance, or direct support.";
  }

  const leading = topLinks[0];
  return `The top website match is ${leading.title}. I also pulled the strongest related links above so you can open the official page first and keep browsing from there.`;
};

export const runAssistantQuery = ({
  query,
  route,
  profile,
  corpus,
}: {
  query: string;
  route: string;
  profile: AssistantProfile;
  corpus: CorpusEntry[];
}): AssistantQueryResult => {
  const intent = inferIntent(query, route, profile);
  const filteredCorpus = intent === "retailer"
    ? corpus.filter((entry) => entry.kind === "retailer" || entry.path.startsWith("/find-a-retailer") || entry.path === "/#contact")
    : intent === "product"
      ? corpus.filter((entry) => entry.kind !== "retailer")
      : corpus;

  const ranked = filteredCorpus
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, query, route, profile),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  const uniqueLinks = new Map<string, AssistantLinkResult>();
  for (const entry of ranked) {
    if (uniqueLinks.has(entry.path)) continue;
    uniqueLinks.set(entry.path, {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      path: entry.path,
      label: entry.label,
      kind: entry.kind,
      phone: entry.phone,
      website: entry.website,
      marketName: entry.marketName,
      external: entry.external,
      score: entry.score,
    });
  }

  const topLinks = Array.from(uniqueLinks.values()).slice(0, 4);
  const confidence = inferConfidence(topLinks[0]?.score ?? 0);

  let answer = "";
  if (intent === "retailer") answer = buildRetailerAnswer(topLinks, query);
  if (intent === "product") answer = buildProductAnswer(topLinks);
  if (intent === "support") answer = buildSupportAnswer(topLinks, route);
  if (intent === "general") answer = buildGeneralAnswer(topLinks);

  return {
    query,
    profile,
    intent,
    topLinks,
    answer,
    confidence,
    suggestsHumanHelp: intent === "support" || confidence === "low",
  };
};

export const buildRetailerPrompt = ({
  marketSlug,
  marketName,
  retailerName,
  location,
  query,
}: {
  marketSlug?: string;
  marketName?: string;
  retailerName?: string;
  location?: string;
  query?: string;
}) => {
  const marketLabel = marketName ?? (marketSlug ? retailerMarketMap.get(marketSlug)?.name : null) ?? "the Caribbean";
  if (retailerName) {
    return `Help me with ${retailerName} in ${marketLabel}. I want the best next step based only on the website.`;
  }

  if (query) {
    return `Help me find a retailer in ${marketLabel} for ${query}. Show website results first, then guide me if nothing fits.`;
  }

  if (location) {
    return `Help me find a retailer near ${location} in ${marketLabel}. Show website results first and then suggest the right help path.`;
  }

  return `Help me find a retailer in ${marketLabel}. Show the best website results first, then tell me what to do next if no listing fits.`;
};

export const shouldAskClarifier = ({
  previousNegativeFeedback,
  lastQuery,
  nextQuery,
}: {
  previousNegativeFeedback: boolean;
  lastQuery: string | null;
  nextQuery: string;
}) => {
  if (!previousNegativeFeedback || !lastQuery) return false;
  const last = normalizeText(lastQuery);
  const next = normalizeText(nextQuery);
  if (!last || !next) return false;
  return last === next || last.includes(next) || next.includes(last);
};

