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
    title: "Super AR coating guide",
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
    title: "Blue Defense AR+ guide",
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
    title: "Find a vision expert near you",
    description: "Connect with a local optician or eye care professional for exam scheduling, personalized dispensing advice, and frame fitting.",
    href: "/patients#find-care",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["find optician", "eye care provider", "retailer", "appointment"],
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
    id: "collection-zenvue-wholesale",
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
  // ── Lens Guides — additional designs ─────────────────────────────────────
  {
    id: "lens-single-vision-guide",
    title: "Single vision lenses explained",
    description: "Understand how single vision lenses work, who they suit best, and what to consider when recommending them for distance, near, or intermediate tasks.",
    href: "/lenses/single-vision",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["single vision", "distance lenses", "reading lenses", "sv"],
    estimatedReadMinutes: 4,
  },
  {
    id: "lens-bifocals-guide",
    title: "Bifocal lenses: when and why",
    description: "A practical overview of bifocal designs, segment types, and the patient profiles where they remain a strong dispensing choice.",
    href: "/lenses/bifocals",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["bifocals", "d-segment", "flat-top", "multifocal"],
    estimatedReadMinutes: 5,
  },
  {
    id: "lens-office-occupational-guide",
    title: "Office and occupational lenses",
    description: "Explore enhanced intermediate and near lens designs built for desk workers, tradespeople, and any patient with a defined visual working zone.",
    href: "/lenses/office-occupational",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["office lens", "occupational", "intermediate", "desk lens"],
    estimatedReadMinutes: 5,
  },
  {
    id: "lens-myopia-control-guide",
    title: "Myopia control options",
    description: "A clinically-focused overview of lens-based myopia management strategies, progression research, and when to recommend specialist designs.",
    href: "/lenses/myopia-control",
    categoryId: "lens-guides",
    audience: "professionals",
    keywords: ["myopia control", "myopia management", "axial elongation", "children"],
    estimatedReadMinutes: 6,
  },
  {
    id: "lens-blue-filter-guide",
    title: "Blue-filter lens guide",
    description: "Understand how blue-light management lenses work, the evidence behind them, and how to discuss options with patients who spend long hours on screens.",
    href: "/lenses/blue-filter",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["blue filter", "blue light", "screen lenses", "digital lenses"],
    estimatedReadMinutes: 5,
  },
  {
    id: "lens-polarized-guide",
    title: "Polarized lenses explained",
    description: "Learn how polarization eliminates reflected glare, which activities benefit most, and the differences between polarized and standard tinted lenses.",
    href: "/lenses/polarized",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["polarized", "glare", "sunglasses", "fishing", "driving"],
    estimatedReadMinutes: 5,
  },
  {
    id: "lens-tints-fashion-colors-guide",
    title: "Tints and fashion colors guide",
    description: "Browse available tint densities, fashion color options, and gradient finishes — with guidance on pairing tints to lifestyle and frame style.",
    href: "/lenses/tints-fashion-colors",
    categoryId: "lens-guides",
    audience: "all",
    keywords: ["tints", "fashion colors", "gradient", "sunglass tint", "solid tint"],
    estimatedReadMinutes: 4,
  },
  // ── Coatings — mirror finish ──────────────────────────────────────────────
  {
    id: "coatings-mirror-finish",
    title: "Mirror finish coating guide",
    description: "A visual-impact coating overview covering available mirror colors, flash mirror versus full mirror options, and frame pairing recommendations.",
    href: "/coatings/mirror",
    categoryId: "coatings-care",
    audience: "all",
    keywords: ["mirror coating", "flash mirror", "mirror finish", "reflective lens"],
    estimatedReadMinutes: 4,
  },
  // ── Patient Support — sub-pages ───────────────────────────────────────────
  {
    id: "patient-lens-differences",
    title: "What's the difference between lens types?",
    description: "A patient-friendly breakdown of single vision, progressive, bifocal, and specialty designs so patients can make sense of their dispensing options.",
    href: "/patients/lens-differences",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["lens differences", "single vision vs progressive", "which lens type"],
    estimatedReadMinutes: 5,
  },
  {
    id: "patient-progressive-lenses",
    title: "Progressive lenses for patients",
    description: "A clear, jargon-free explanation of how progressive lenses work, what the adaptation period feels like, and tips for making the transition easier.",
    href: "/patients/progressive-lenses",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["progressive lenses", "adaptation", "no-line bifocal", "multifocal"],
    estimatedReadMinutes: 5,
  },
  {
    id: "patient-anti-fatigue-lenses",
    title: "Anti-fatigue lenses for digital users",
    description: "Patient-friendly guidance on eye strain symptoms, when anti-fatigue lenses help, and what to expect from near-support single vision designs.",
    href: "/patients/anti-fatigue-lenses",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["anti-fatigue", "eye strain", "digital fatigue", "tired eyes"],
    estimatedReadMinutes: 4,
  },
  {
    id: "patient-caring-for-glasses",
    title: "How to care for your glasses",
    description: "Simple, practical instructions for cleaning lenses, storing glasses safely, and protecting coatings from everyday wear and heat damage.",
    href: "/patients/caring-for-glasses",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["glasses care", "cleaning lenses", "microfiber", "lens care tips"],
    estimatedReadMinutes: 3,
  },
  {
    id: "patient-computer-mobile-use",
    title: "Screen use and eye comfort",
    description: "Practical habits for reducing digital eye strain — screen distance, the 20-20-20 rule, ergonomics, and how lenses and coatings can support long sessions.",
    href: "/patients/computer-mobile-use",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["screen use", "computer eye strain", "20-20-20", "mobile", "ergonomics"],
    estimatedReadMinutes: 4,
  },
  {
    id: "patient-sunlight-protection",
    title: "Sunlight and UV protection for your eyes",
    description: "Why UV protection matters, how to evaluate sun options, and the difference between polarized, tinted, and photochromic lenses for outdoor wear.",
    href: "/patients/sunlight-protection",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["uv protection", "sunlight", "outdoor lenses", "polarized sun"],
    estimatedReadMinutes: 4,
  },
  {
    id: "patient-regular-eye-exams",
    title: "Why regular eye exams matter",
    description: "An accessible guide to how often patients should get examined, what comprehensive exams check for, and how prescriptions change over time.",
    href: "/patients/regular-eye-exams",
    categoryId: "patient-support",
    audience: "patients",
    keywords: ["eye exam", "optometrist", "prescription check", "eye health"],
    estimatedReadMinutes: 3,
  },
  // ── Professional Resources — policy pages ────────────────────────────────
  {
    id: "professional-customer-supplied-frames",
    title: "Customer-supplied frames policy",
    description: "Understand the conditions, liability limits, and handling requirements when patients supply their own frames for glazing.",
    href: "/professionals/customer-supplied-frames-policy",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["customer frames", "patient frames", "own frames", "glazing policy"],
    estimatedReadMinutes: 4,
  },
  {
    id: "professional-freight-delivery",
    title: "Freight and delivery policy",
    description: "Delivery timeframes, freight charges, regional coverage, and what to do when an order arrives damaged or delayed.",
    href: "/professionals/freight-delivery-policy",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["freight", "delivery", "shipping", "lead times"],
    estimatedReadMinutes: 4,
  },
  {
    id: "professional-repairs-policy",
    title: "Repairs policy and process",
    description: "How to submit a repair request, what types of repairs are accepted, and the turnaround and cost structure for lens and frame repair work.",
    href: "/professionals/repairs-policy",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["repairs", "lens repair", "frame repair", "warranty repair"],
    estimatedReadMinutes: 4,
  },
  {
    id: "professional-returns-replacements",
    title: "Returns and replacements",
    description: "Eligibility criteria, timeframes, and the step-by-step process for returning lenses or requesting replacements for manufacturing defects and remakes.",
    href: "/professionals/returns-replacements",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["returns", "replacements", "remakes", "refund", "warranty"],
    estimatedReadMinutes: 5,
  },
  {
    id: "professional-chemistrie-lens-system",
    title: "Chemistrie lens system for professionals",
    description: "Technical and dispensing overview of the Chemistrie magnetic lens attachment system — compatibility, fitting workflow, and patient suitability.",
    href: "/professionals/chemistrie-lens-system",
    categoryId: "professional-resources",
    audience: "professionals",
    keywords: ["chemistrie", "magnetic lens", "clip-on", "lens attachment"],
    estimatedReadMinutes: 5,
  },
  // ── Collections and Programs — ZenVue home ───────────────────────────────
  {
    id: "collection-zenvue-home",
    title: "Introducing the ZenVue collection",
    description: "An overview of the ZenVue branded lens range — the product lineup, positioning story, and how to navigate the collection as a patient or trade partner.",
    href: "/zenvue",
    categoryId: "collections-programs",
    audience: "all",
    keywords: ["zenvue", "lens collection", "branded lenses", "product range"],
    estimatedReadMinutes: 3,
  },
  // ── FAQ ───────────────────────────────────────────────────────────────────
  {
    id: "faq-progressive-adaptation",
    title: "How long does it take to adapt to progressives?",
    description: "Most wearers adapt within one to two weeks. This article explains what the adjustment period feels like and what warrants a follow-up with your optician.",
    href: "/lenses/progressive",
    categoryId: "faq",
    audience: "all",
    keywords: ["progressive adaptation", "adjustment period", "getting used to progressives"],
    estimatedReadMinutes: 3,
  },
  {
    id: "faq-blue-light-evidence",
    title: "Do blue-light lenses actually work?",
    description: "A balanced look at the current evidence on blue-light filtering, digital eye strain causes, and when these lenses are most likely to help.",
    href: "/lenses/blue-filter",
    categoryId: "faq",
    audience: "all",
    keywords: ["blue light evidence", "do blue light lenses work", "blue light research"],
    estimatedReadMinutes: 4,
  },
  {
    id: "faq-photochromic-driving",
    title: "Can I use photochromic lenses while driving?",
    description: "Explains how most photochromic lenses react behind windscreens, which products are designed for driving use, and what to discuss with your optician.",
    href: "/photochromic",
    categoryId: "faq",
    audience: "all",
    keywords: ["photochromic driving", "transitions driving", "car windscreen"],
    estimatedReadMinutes: 3,
  },
  {
    id: "faq-high-index-vs-polycarbonate",
    title: "High-index vs polycarbonate: which is better?",
    description: "A comparison of the two most common premium materials — covering thickness, impact resistance, weight, and which prescriptions benefit most from each.",
    href: "/lenses/materials",
    categoryId: "faq",
    audience: "all",
    keywords: ["high index vs polycarbonate", "lens material comparison", "which material"],
    estimatedReadMinutes: 4,
  },
  {
    id: "faq-uv-protection-clear-lenses",
    title: "Do clear lenses provide UV protection?",
    description: "Yes — UV protection is a coating or material property, not a tint. This article explains how clear lenses can offer full UV400 coverage.",
    href: "/coatings/uv-shield",
    categoryId: "faq",
    audience: "patients",
    keywords: ["clear lens uv", "uv without tint", "uv400 clear"],
    estimatedReadMinutes: 3,
  },
  {
    id: "faq-ar-coating-worth-it",
    title: "Is anti-reflective coating worth it?",
    description: "What AR coatings do, when the improvement is most noticeable, and how to explain the value to patients who are weighing up the additional cost.",
    href: "/coatings/ultraclear-ar",
    categoryId: "faq",
    audience: "all",
    keywords: ["ar coating worth it", "anti reflective value", "is ar worth it"],
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
