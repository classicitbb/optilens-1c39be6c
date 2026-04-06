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
  runtimeHeadings?: RuntimeHeadingEntry[];
}

export interface RuntimeHeadingEntry {
  id: string;
  title: string;
  description?: string;
  path: string;
}

const RETAILER_WORDS = ["retailer", "optical", "optician", "clinic", "doctor", "ophthalmology", "barbados", "caribbean", "island"];
const PRODUCT_WORDS = ["lens", "lenses", "coating", "progressive", "single vision", "anti-fatigue", "photochromic", "polarized", "blue filter"];
const SUPPORT_WORDS = ["support", "help", "ticket", "contact", "email", "call", "order", "account", "portal", "customer service"];
const HOME_PATH = "/";
const MIN_ANSWER_LENGTH = 150;
const MAX_ANSWER_LENGTH = 200;
const INDUSTRY_FALLBACK = "I can help with lenses, coatings, eyewear care, retailer search, and optical support across Barbados and the Caribbean. Ask within that context and I will guide you.";

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
const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const limitLength = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_ANSWER_LENGTH && normalized.length >= MIN_ANSWER_LENGTH) return normalized;
  if (normalized.length > MAX_ANSWER_LENGTH) {
    const shortened = normalized.slice(0, MAX_ANSWER_LENGTH - 1);
    const pivot = Math.max(shortened.lastIndexOf("."), shortened.lastIndexOf(","), shortened.lastIndexOf(" "));
    return `${shortened.slice(0, pivot > 120 ? pivot : MAX_ANSWER_LENGTH - 4).trim()}...`;
  }

  return `${normalized} Ask another optical question and I will keep the answer concise and useful.`;
};

const buildRetailerPath = (marketSlug: string) =>
  marketSlug === "barbados" ? "/find-a-retailer/barbados" : `/find-a-retailer#${marketSlug}`;

const buildRetailerDescription = (entry: RetailerEntry, marketName: string) =>
  [marketName, entry.category, entry.location, entry.notes].filter(Boolean).join(" • ");

export const buildAssistantCorpus = ({ products, knowledge, runtimeHeadings = [] }: AssistantEngineInput): CorpusEntry[] => {
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

  const headingEntries: CorpusEntry[] = runtimeHeadings.map((heading) => ({
    id: heading.id,
    title: heading.title,
    description: heading.description || "Relevant heading from this page.",
    path: heading.path,
    label: "Heading",
    text: `${heading.title} ${heading.description ?? ""}`,
    kind: "site",
  }));

  return [...siteEntries, ...productEntries, ...knowledgeEntries, ...retailerEntries, ...headingEntries];
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

const scoreEntry = (entry: CorpusEntry, query: string, route: string, profile: AssistantProfile) => {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenize(query);
  const haystack = normalizeText(entry.text);
  let score = 0;

  if (!normalizedQuery) return 0;
  if (haystack.includes(normalizedQuery)) score += 24;
  if (normalizeText(entry.title).includes(normalizedQuery)) score += 14;
  if (entry.path === route) score += 8;

  for (const token of tokens) {
    if (normalizeText(entry.title).includes(token)) score += 7;
    if (normalizeText(entry.description).includes(token)) score += 4;
    if (haystack.includes(token)) score += 2;
  }

  if (profile === "retailer_help" && entry.kind === "retailer") score += 12;
  if (profile === "portal_support" && entry.path.startsWith("/profile")) score += 10;
  if (route.startsWith("/find-a-retailer") && entry.kind === "retailer") score += 8;
  if (entry.kind === "knowledge") score += 4;
  if (entry.path === HOME_PATH) score -= 12;
  if (entry.title.toLowerCase() === "home") score -= 10;

  return score;
};

const preferUsefulLinks = (links: AssistantLinkResult[], intent: AssistantQueryResult["intent"]) => {
  const withoutHome = links.filter((link) => link.path !== HOME_PATH);
  if (withoutHome.length === 0) return links.slice(0, 1);
  if (intent === "general") return withoutHome;
  return withoutHome.sort((left, right) => {
    const leftBonus = left.kind === intentToKind(intent) ? 1 : 0;
    const rightBonus = right.kind === intentToKind(intent) ? 1 : 0;
    return rightBonus - leftBonus || right.score - left.score;
  });
};

const intentToKind = (intent: AssistantQueryResult["intent"]): AssistantLinkKind | null => {
  if (intent === "retailer") return "retailer";
  if (intent === "product") return "product";
  if (intent === "general" || intent === "support") return null;
  return null;
};

const getNearbyRetailerMarkets = (query: string) => {
  const normalized = normalizeText(query);
  const exactMarket = retailerMarkets.find((market) => normalized.includes(normalizeText(market.name)));
  if (exactMarket) return [exactMarket.name];
  return retailerMarkets.slice(0, 3).map((market) => market.name);
};

const buildAnswerFromLink = (lead: AssistantLinkResult, intent: AssistantQueryResult["intent"]) => {
  if (intent === "retailer") {
    return limitLength(`${lead.title} is a relevant ${lead.marketName ?? "Caribbean"} provider match from the website. Use the result for location context, then open the page or request guided retailer help if needed.`);
  }

  if (intent === "product") {
    return limitLength(`${lead.title} is the strongest on-site match. ${sentenceCase(lead.description)} Open the page for details, then ask a follow-up if you want a quicker comparison or recommendation.`);
  }

  if (intent === "support") {
    return limitLength(`${lead.title} is the best support-related match on the site. ${sentenceCase(lead.description)} If it still falls short, I can keep guiding you digitally before we move to direct contact.`);
  }

  return limitLength(`${lead.title} is the closest fit on the website. ${sentenceCase(lead.description)} Open it for context, or ask a more specific optical question and I will refine the answer.`);
};

const buildNoMatchAnswer = (intent: AssistantQueryResult["intent"], query: string) => {
  if (intent === "retailer") {
    const markets = getNearbyRetailerMarkets(query).join(", ");
    return limitLength(`I do not see an exact website listing for that request yet, but I can still guide you toward retailers or clinics in ${markets} and help narrow the best next digital option.`);
  }

  if (intent === "product") {
    return limitLength("I do not see an exact page for that question, but I can still help compare lenses, coatings, care guidance, and likely use cases if you rephrase it in optical terms.");
  }

  if (intent === "support") {
    return limitLength("I do not see a direct support page for that exact question yet, but I can still guide you through the closest on-site help paths before escalating to direct contact.");
  }

  return limitLength(INDUSTRY_FALLBACK);
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
    ? corpus.filter((entry) => entry.kind === "retailer" || entry.path.startsWith("/find-a-retailer"))
    : intent === "product"
      ? corpus.filter((entry) => entry.kind !== "retailer")
      : corpus;

  const ranked = filteredCorpus
    .map((entry) => ({ ...entry, score: scoreEntry(entry, query, route, profile) }))
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

  const topLinks = preferUsefulLinks(Array.from(uniqueLinks.values()), intent).slice(0, 4);
  const confidence = inferConfidence(topLinks[0]?.score ?? 0);
  const answer = topLinks[0] ? buildAnswerFromLink(topLinks[0], intent) : buildNoMatchAnswer(intent, query);

  return {
    query,
    profile,
    intent,
    topLinks,
    answer,
    confidence,
    suggestsHumanHelp: topLinks.length === 0 && confidence === "low",
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
  if (retailerName) return `Help me with ${retailerName} in ${marketLabel}.`;
  if (query) return `Help me find a retailer in ${marketLabel} for ${query}.`;
  if (location) return `Help me find a retailer near ${location} in ${marketLabel}.`;
  return `Help me find a retailer in ${marketLabel}.`;
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

export const collectRuntimeHeadings = (route: string): RuntimeHeadingEntry[] => {
  if (typeof document === "undefined") return [];

  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, [data-search-heading]"));
  const seen = new Set<string>();
  const entries: RuntimeHeadingEntry[] = [];

  for (const node of nodes) {
    const rawTitle = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!rawTitle || rawTitle.length < 3) continue;

    const normalized = normalizeText(rawTitle);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const anchorSource = node.id
      ? node
      : node.closest<HTMLElement>("[id]");
    const path = anchorSource?.id ? `${route}#${anchorSource.id}` : route;

    entries.push({
      id: `heading-${normalized.slice(0, 48).replace(/\s+/g, "-")}`,
      title: rawTitle,
      description: "Heading topic on this page",
      path,
    });
  }

  return entries.slice(0, 40);
};
