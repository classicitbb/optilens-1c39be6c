import { lazy } from "react";
import { registerAtlasHost } from "@/features/atlas/host";
import { atlasIrisProvider } from "./atlasIris";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ASSIGNABLE_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import { CONTENT_TYPE_OPTIONS, VISIBILITY_OPTIONS } from "@/hooks/useContentArticles";

/**
 * The host app's side of Atlas: the business-specific data Atlas core is not allowed to contain.
 * Registered once from the Atlas route module.
 */
const KNOWLEDGE_CATEGORIES = [
  "Lens Materials",
  "Lens Designs",
  "Lens Coatings",
  "Specialty Lenses",
  "Ordering & Delivery",
  "Pricing & Payments",
  "General",
];

/** Fixed pages the site renders by `page_slug`; they stay locked once published. */
const LOCKED_PAGES = [
  { value: "copyright", label: "Copyright / Footer Text" },
  { value: "privacy-policy", label: "Privacy Policy" },
  { value: "terms-conditions", label: "Terms & Conditions" },
  { value: "return-policy", label: "Return Policy" },
  { value: "disclaimer", label: "Disclaimer" },
  { value: "cookie-policy", label: "Cookie Policy" },
];

const useCompanyName = (): string | null => {
  const { data } = useCompanySettings();
  return data?.company_name ?? null;
};

let registered = false;

export const registerAtlasHostOnce = () => {
  if (registered) return;
  registered = true;
  registerAtlasHost({
    iris: atlasIrisProvider,
    useWorkspaceName: useCompanyName,
    contextOptions: ASSIGNABLE_CONTEXT_OPTIONS,
    optionSets: {
      contentTypes: CONTENT_TYPE_OPTIONS.filter((option) => option.value !== "wiki").map(({ value, label }) => ({ value, label })),
      visibility: VISIBILITY_OPTIONS.map(({ value, label }) => ({ value, label })),
      categories: KNOWLEDGE_CATEGORIES.map((value) => ({ value, label: value })),
      lockedPages: LOCKED_PAGES,
    },
    embeds: {
      "blog-posts": lazy(() => import("@/config/AtlasBlogEmbed")),
    },
  });
};
