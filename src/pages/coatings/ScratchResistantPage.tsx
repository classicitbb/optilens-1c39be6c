import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const ScratchResistantPage = () => (
  <CoatingArticleLayout
    title="Scratch-Resistant Coating"
    intro="Scratch-resistant hard coat forms the durability base for modern ophthalmic lenses, helping preserve optical quality during routine cleaning, handling, and everyday wear."
    sectionTitle="Everyday protection benefits"
    bullets={[
      "Adds a hardened surface layer that reduces micro-scratches from normal use.",
      "Supports longer-lasting clarity by protecting lens surfaces from abrasive dust and cleaning contact.",
      "Acts as the foundation layer that premium AR systems bond to for better overall performance.",
      "Recommended across clear, sun, and digital-use prescriptions.",
    ]}
    tips={[
      "Always rinse lenses before wiping to avoid grinding particles into the surface.",
      "Use microfiber cloths and approved lens cleaners instead of tissues or garments.",
    ]}
  />
);

export default ScratchResistantPage;
