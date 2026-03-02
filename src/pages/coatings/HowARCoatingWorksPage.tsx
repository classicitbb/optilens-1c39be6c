import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const HowARCoatingWorksPage = () => (
  <CoatingArticleLayout
    title="How AR Coating Works"
    intro="Modern anti-reflective (AR) lenses use multiple ultra-thin layers with different refractive properties. Together, they reduce reflected light and increase the amount of light transmitted through the lens to the eye."
    sectionTitle="AR coating fundamentals"
    bullets={[
      "Untreated lenses reflect a portion of incoming light from both front and back surfaces.",
      "AR stacks use interference principles so reflected waves partially cancel one another.",
      "Lower reflection means better contrast, cleaner night vision, and improved cosmetic transparency.",
      "Most premium systems add hard-coat, hydrophobic, and oleophobic layers for durability and easier care.",
    ]}
    tipsTitle="Patient education script"
    tips={[
      "'AR helps more light pass through the lens, so your vision is clearer and glare is reduced.'",
      "'You will still see bright light sources, but the distracting halo and surface reflections are reduced.'",
    ]}
  />
);

export default HowARCoatingWorksPage;
