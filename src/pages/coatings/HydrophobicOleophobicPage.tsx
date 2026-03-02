import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const HydrophobicOleophobicPage = () => (
  <CoatingArticleLayout
    title="Hydrophobic & Oleophobic Top Coats"
    intro="Hydrophobic and oleophobic finishing layers repel water, oils, and smudges so coated lenses stay cleaner between wipes and are easier to maintain."
    sectionTitle="Why this matters in daily use"
    bullets={[
      "Water-repellent chemistry helps droplets bead and roll off instead of spreading across the lens.",
      "Oil-repellent performance minimizes fingerprints and facial-oil smears on high-touch areas.",
      "Speeds up cleaning and reduces friction during wiping, helping preserve AR stack performance.",
      "Particularly valuable for humid climates, active users, and frequent mask wearers.",
    ]}
    tips={[
      "Reinforce proper cleaning: rinse, apply approved cleaner, then dry with microfiber.",
      "Recommend replacing heavily worn cloths to avoid re-depositing oils on premium coatings.",
    ]}
  />
);

export default HydrophobicOleophobicPage;
