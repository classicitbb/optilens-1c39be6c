import {
  BookOpen,
  BriefcaseBusiness,
  Droplets,
  Glasses,
  GraduationCap,
  HelpCircle,
  Layers,
  LucideIcon,
  Sparkles,
} from "lucide-react";

export type KnowledgeAudience = "all" | "patients" | "professionals";

export type KnowledgeCategoryId =
  | "start-here"
  | "lens-guides"
  | "coatings-care"
  | "patient-support"
  | "professional-resources"
  | "collections-programs"
  | "faq";

export interface KnowledgeCategoryMeta {
  id: KnowledgeCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
}

export interface CuratedKnowledgeArticle {
  id: string;
  title: string;
  description: string;
  href: string;
  categoryId: KnowledgeCategoryId;
  audience: KnowledgeAudience;
  keywords: string[];
  estimatedReadMinutes: number;
  featured?: boolean;
}

export interface KnowledgeListingEntry {
  categoryId: KnowledgeCategoryId;
  title: string;
}

export const KNOWLEDGE_CATEGORY_ORDER: KnowledgeCategoryId[] = [
  "start-here",
  "lens-guides",
  "coatings-care",
  "patient-support",
  "professional-resources",
  "collections-programs",
  "faq",
];

export const KNOWLEDGE_CATEGORY_META: Record<KnowledgeCategoryId, KnowledgeCategoryMeta> = {
  "start-here": {
    id: "start-here",
    title: "Start Here",
    description: "The fastest way to understand the site, compare options, and find the right next step.",
    icon: Sparkles,
    accentClassName: "from-primary/15 via-primary/5 to-transparent",
  },
  "lens-guides": {
    id: "lens-guides",
    title: "Lens Guides",
    description: "Core education on lens designs, materials, thickness, comfort, and specialty options.",
    icon: Layers,
    accentClassName: "from-sky-500/15 via-sky-500/5 to-transparent",
  },
  "coatings-care": {
    id: "coatings-care",
    title: "Coatings and Care",
    description: "Learn how premium coatings work, when to recommend them, and how to keep them performing well.",
    icon: Droplets,
    accentClassName: "from-cyan-500/15 via-cyan-500/5 to-transparent",
  },
  "patient-support": {
    id: "patient-support",
    title: "Patient Support",
    description: "Readable guides patients can scan before an exam, fitting conversation, or product decision.",
    icon: Glasses,
    accentClassName: "from-amber-500/15 via-amber-500/5 to-transparent",
  },
  "professional-resources": {
    id: "professional-resources",
    title: "Professional Resources",
    description: "Trade resources for dispensing, ordering, lab coordination, and service workflows.",
    icon: BriefcaseBusiness,
    accentClassName: "from-emerald-500/15 via-emerald-500/5 to-transparent",
  },
  "collections-programs": {
    id: "collections-programs",
    title: "Collections and Programs",
    description: "Browse branded product collections, wholesale programs, and comparison tools.",
    icon: GraduationCap,
    accentClassName: "from-fuchsia-500/15 via-fuchsia-500/5 to-transparent",
  },
  faq: {
    id: "faq",
    title: "Frequently Asked Questions",
    description: "Quick answers to recurring questions about products, use cases, and care.",
    icon: HelpCircle,
    accentClassName: "from-rose-500/15 via-rose-500/5 to-transparent",
  },
};

export const CURATED_KNOWLEDGE_ARTICLES: CuratedKnowledgeArticle[] = [
  {
    id: "start-compare-lens-options",
    title: "Compare lens options in one place",
    description: "Start with a high-level comparison before diving into specific designs or premium add-ons.",
    href: "/zenvue/compare",
    categoryId: "start-here",
    audience: "all",
    keywords: ["compare lenses", "product comparison", "which lens"],
    estimatedReadMinutes: 4,
    featured: true,
  },
  {
    id: "start-find-retailer",
    title: "Find a local retailer or clinic",
    description: "Use the retailer directory when you need in-person advice, ordering support, or a fitting appointment.",
    href: "/find-a-retailer",
    categoryId: "start-here",
    audience: "all",
    keywords: ["retailer", "clinic", "where to buy", "appointment"],
    estimatedReadMinutes: 3,
    featured: true,
  },
  {
    id: "start-professionals-overview",
    title: "Explore the professionals hub",
    description: "See every trade resource, onboarding link, technical guide, and support path available to practices.",
    href: "/professionals",
    categoryId: "start-here",
    audience: "professionals",
    keywords: ["trade", "professional support", "resources"],
    estimatedReadMinutes: 4,
  },
  {
    id: "start-patients-overview",
    title: "Browse the patient education hub",
    description: "Share a simple entry point for lens basics, care guidance, and common patient questions.",
    href: "/patients",
    categoryId: "start-here",
    audience: "patients",
    keywords: ["patients", "education", "lens basics"],
    estimatedReadMinutes: 4,
  },
  {
    id: "lens-design-guide",
    title: "Lens design guide",
    description: "Understand how single vision, occupational, anti-fatigue, bifocal, and progressive designs differ.",
    href: "/lenses/lens-types",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["lens design", "progressive", "single vision", "bifocal"],
    estimatedReadMinutes: 7,
    featured: true,
  },
  {
    id: "lens-materials-guide",
    title: "Lens materials and index guide",
    description: "Compare CR-39, polycarbonate, Trivex, and high-index materials with practical tradeoffs.",
    href: "/lenses/materials",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["materials", "high index", "polycarbonate", "thickness"],
    estimatedReadMinutes: 6,
    featured: true,
  },
  {
    id: "lens-progressive-guide",
    title: "Progressive lenses explained",
    description: "A practical overview of all-distance vision, fitting expectations, and who benefits most.",
    href: "/lenses/progressive",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["progressive lenses", "multifocal", "adaptation"],
    estimatedReadMinutes: 6,
  },
  {
    id: "lens-anti-fatigue-guide",
    title: "Anti-fatigue lenses for digital lifestyles",
    description: "Help patients and staff identify when near-support lenses are a better fit than basic single vision.",
    href: "/lenses/anti-fatigue",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["anti-fatigue", "digital eye strain", "computer lenses"],
    estimatedReadMinutes: 5,
  },
  {
    id: "lens-photochromic-guide",
    title: "Photochromic lens guide",
    description: "Understand adaptive light-responsive lenses, everyday use cases, and product family differences.",
    href: "/photochromic",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["photochromic", "transition lenses", "adaptive tint"],
    estimatedReadMinutes: 6,
  },
  {
    id: "lens-thickness-chart",
    title: "Lens thickness chart",
    description: "Use this visual reference when discussing cosmetic thickness and frame-material pairings.",
    href: "/lenses/thickness-chart",
    categoryId: "lens-guides",
    audience: "professionals",
    keywords: ["thickness", "edge thickness", "cosmetics", "index comparison"],
    estimatedReadMinutes: 4,
  },
  {
    id: "coatings-ultraclear",
    title: "UltraClear AR coating guide",
    description: "A premium anti-reflective overview covering clarity, appearance, and daily-wear benefits.",
    href: "/coatings/ultraclear-ar",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["anti reflective", "ar coating", "reflection"],
    estimatedReadMinutes: 5,
    featured: true,
  },
  {
    id: "coatings-blueblock",
    title: "BlueBlock AR guide",
    description: "See how blue-violet management combines with anti-reflective performance for screen-heavy routines.",
    href: "/coatings/blueblock-ar",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["blue block", "blue filter", "screen glare"],
    estimatedReadMinutes: 5,
  },
  {
    id: "coatings-scratch-resistant",
    title: "Scratch-resistant coating basics",
    description: "A simple explanation of hard coats, wear expectations, and why scratch resistance still needs care.",
    href: "/coatings/scratch-resistant",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["scratch resistant", "hard coat", "durability"],
    estimatedReadMinutes: 4,
  },
  {
    id: "coatings-uv-shield",
    title: "UV Shield protection guide",
    description: "Use this article when recommending UV-focused lens protection for daily outdoor exposure.",
    href: "/coatings/uv-shield",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["uv", "uv protection", "sun"],
    estimatedReadMinutes: 4,
  },
  {
    id: "coatings-hydrophobic-care",
    title: "Hydrophobic and oleophobic coatings",
    description: "Explain easy-clean top coats, smudge resistance, and how they improve real-world maintenance.",
    href: "/coatings/hydrophobic-oleophobic",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["easy clean", "smudge resistant", "oleophobic", "hydrophobic"],
    estimatedReadMinutes: 4,
  },
  {
    id: "patient-night-driving",
    title: "Night driving aids and glare control",
    description: "Patient-friendly guidance for glare, comfort, and visibility concerns after dark.",
    href: "/patients/night-driving-aids",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["night driving", "glare", "headlights"],
    estimatedReadMinutes: 5,
    featured: true,
  },
  {
    id: "patient-lens-basics",
    title: "Understanding your lens options",
    description: "A readable primer for patients choosing between designs, coatings, and use-case-specific upgrades.",
    href: "/patients#understanding-lenses",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["understanding lenses", "patients", "lens basics"],
    estimatedReadMinutes: 4,
  },
  {
    id: "patient-find-care",
    title: "How to prepare for an eye care visit",
    description: "A short guide to help patients show up with the right questions and daily-routine details.",
    href: "/patients#find-care",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["eye exam", "optician visit", "questions to ask"],
    estimatedReadMinutes: 3,
  },
  {
    id: "patient-vision-tips",
    title: "Everyday vision care tips",
    description: "Computer use, sunlight habits, and practical comfort tips in one patient-facing resource.",
    href: "/patients#vision-tips",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["vision tips", "screen use", "sunlight", "care"],
    estimatedReadMinutes: 4,
  },
  {
    id: "professional-dispensing",
    title: "Dispensing tips and fitting guide",
    description: "A go-to reference for better handoff conversations, lifestyle discovery, and product recommendations.",
    href: "/dispensing-tips",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["dispensing", "fitting", "recommendation", "optical staff"],
    estimatedReadMinutes: 8,
    featured: true,
  },
  {
    id: "professional-ordering-tips",
    title: "Lens ordering tips",
    description: "Reduce avoidable delays and remakes with a tighter ordering checklist for your team.",
    href: "/professionals/lens-ordering-tips",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["ordering", "remakes", "checklist", "lab order"],
    estimatedReadMinutes: 5,
  },
  {
    id: "professional-lab-process",
    title: "Lab process overview",
    description: "Share what happens after an order is placed so staff can set better expectations with confidence.",
    href: "/professionals/lab-process-overview",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["lab process", "production", "workflow"],
    estimatedReadMinutes: 5,
  },
  {
    id: "professional-tracing-cutting",
    title: "Tracing and cutting guide",
    description: "A technical resource for teams working on frame tracing accuracy and edging preparation.",
    href: "/professionals/tracing-cutting-guide",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["tracing", "cutting", "edging", "frame prep"],
    estimatedReadMinutes: 6,
  },
  {
    id: "professional-wholesale",
    title: "ZenVue wholesale program",
    description: "Learn how the branded lens range is presented for optical partners and wholesale inquiries.",
    href: "/zenvue/wholesale",
    categoryId: "collections-programs",
    audience: "professionals",
    keywords: ["wholesale", "program", "trade account", "zenvue"],
    estimatedReadMinutes: 4,
    featured: true,
  },
  {
    id: "collection-zenvue-brilliance",
    title: "ZenVue Brilliance progressive",
    description: "Review the flagship progressive positioning, messaging, and value story for premium wearers.",
    href: "/zenvue/brilliance",
    categoryId: "collections-programs",
    audience: "all",
    keywords: ["zenvue", "brilliance", "progressive collection"],
    estimatedReadMinutes: 4,
  },
  {
    id: "collection-zenvue-single-vision",
    title: "ZenVue single vision overview",
    description: "A product-focused article for straightforward single-vision positioning within the collection.",
    href: "/zenvue/single-vision",
    categoryId: "collections-programs",
    audience: "all",
    keywords: ["zenvue", "single vision", "collection"],
    estimatedReadMinutes: 4,
  },
  {
    id: "collection-zenvue-darkun",
    title: "ZenVue Darkun guide",
    description: "Position a darker adaptive option for light-sensitive wearers and outdoor-heavy routines.",
    href: "/zenvue/darkun",
    categoryId: "collections-programs",
    audience: "all",
    keywords: ["darkun", "photochromic", "sun adaptive"],
    estimatedReadMinutes: 4,
  },
];

export const KNOWLEDGE_FEATURED_IDS = CURATED_KNOWLEDGE_ARTICLES
  .filter((article) => article.featured)
  .map((article) => article.id);

const CMS_CATEGORY_TO_KNOWLEDGE_CATEGORY: Record<string, KnowledgeCategoryId> = {
  "lens materials": "lens-guides",
  "lens designs": "lens-guides",
  "lens coatings": "coatings-care",
  "specialty lenses": "lens-guides",
  faq: "faq",
};

export const normalizeKnowledgeCategory = (value?: string | null): string =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const resolveKnowledgeCategoryId = (category?: string | null): KnowledgeCategoryId => {
  const normalized = normalizeKnowledgeCategory(category);
  return CMS_CATEGORY_TO_KNOWLEDGE_CATEGORY[normalized] ?? "start-here";
};

export const dedupeKnowledgeListings = <T extends KnowledgeListingEntry>(entries: T[]): T[] => {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.categoryId}::${entry.title.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const formatKnowledgeCategoryTitle = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
