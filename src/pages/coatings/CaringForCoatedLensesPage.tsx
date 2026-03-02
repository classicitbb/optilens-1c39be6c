import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const CaringForCoatedLensesPage = () => (
  <CoatingArticleLayout
    title="Caring for Your Coated Lenses"
    intro="Premium coatings last longest when cleaning and storage routines are consistent. A simple care process helps protect AR layers, top coats, and long-term visual clarity."
    sectionTitle="Daily care routine"
    bullets={[
      "Rinse lenses with lukewarm water first to remove dust or debris.",
      "Use coating-safe lens cleaner or mild soap, then gently wipe with a clean microfiber cloth.",
      "Avoid dry wiping, household glass cleaners, paper towels, and shirt fabric.",
      "Store eyewear in a hard case and keep lenses away from extreme heat (cars, steam, dashboards).",
    ]}
    tipsTitle="Service-desk reminders"
    tips={[
      "Replace microfiber cloths regularly; saturated cloths can re-smear oils.",
      "If coatings appear hazy after normal cleaning, book a frame and lens-care check in-store.",
    ]}
  />
);

export default CaringForCoatedLensesPage;
