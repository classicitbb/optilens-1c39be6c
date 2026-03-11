export type SiteSearchEntry = {
  id: string;
  title: string;
  description: string;
  path: string;
  group: "Pages" | "Forms" | "Anchors";
  keywords?: string[];
};

export const SITE_SEARCH_INDEX: SiteSearchEntry[] = [
  {
    id: "page-home",
    title: "Home",
    description: "Main landing page with featured products, company overview, and contact options.",
    path: "/",
    group: "Pages",
    keywords: ["hero", "about", "features", "contact", "welcome"],
  },
  {
    id: "page-knowledge",
    title: "Knowledge Base",
    description: "Articles, guides, and frequently asked questions for optical lenses and coatings.",
    path: "/knowledge",
    group: "Pages",
    keywords: ["faq", "articles", "learning resources"],
  },
  {
    id: "page-store",
    title: "Product Catalog",
    description: "Browse lenses and optical supplies.",
    path: "/store",
    group: "Pages",
    keywords: ["products", "lenses", "supplies", "catalog"],
  },
  {
    id: "page-professionals",
    title: "Professionals",
    description: "Resources and services for optical stores and clinics.",
    path: "/for-professionals",
    group: "Pages",
    keywords: ["wholesale", "partners", "trade"],
  },
  {
    id: "page-patients",
    title: "Patients",
    description: "Patient education and lens care information.",
    path: "/patients",
    group: "Pages",
    keywords: ["vision", "care", "guide"],
  },
  {
    id: "anchor-home-about",
    title: "About section",
    description: "Jump to company story, mission, and values.",
    path: "/#about",
    group: "Anchors",
    keywords: ["mission", "values", "story"],
  },
  {
    id: "anchor-home-contact",
    title: "Contact section",
    description: "Jump to contact and support section.",
    path: "/#contact",
    group: "Anchors",
    keywords: ["phone", "email", "support"],
  },
  {
    id: "anchor-patients-understanding",
    title: "Patients: Understanding lenses",
    description: "Educational lens overview for patients.",
    path: "/patients#understanding-lenses",
    group: "Anchors",
    keywords: ["progressive", "single vision", "anti-fatigue"],
  },
  {
    id: "anchor-patients-find-care",
    title: "Patients: Find care",
    description: "How to connect with a vision expert.",
    path: "/patients#find-care",
    group: "Anchors",
    keywords: ["optician", "clinic", "eye care"],
  },
  {
    id: "form-trade-account",
    title: "Apply for a Trade Account",
    description: "Professional onboarding form.",
    path: "/professionals/trade-account",
    group: "Forms",
    keywords: ["application", "onboarding", "professional form"],
  },
  {
    id: "form-price-list-request",
    title: "Price List Request",
    description: "Request wholesale pricing form.",
    path: "/professionals/price-list-request",
    group: "Forms",
    keywords: ["pricing", "request form", "wholesale"],
  },
];
