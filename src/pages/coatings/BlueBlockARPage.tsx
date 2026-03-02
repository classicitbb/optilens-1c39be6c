import CoatingArticleLayout from "@/components/coatings/CoatingArticleLayout";

const BlueBlockARPage = () => (
  <CoatingArticleLayout
    title="BlueBlock AR (BlueGuard AR+)"
    intro="BlueBlock AR combines anti-reflective performance with selective blue-violet light management, helping reduce harsh glare from digital screens while preserving color balance for daily wear."
    sectionTitle="Where BlueBlock AR fits best"
    bullets={[
      "Reduces reflected glare from screen-heavy environments such as offices, classrooms, and remote-work setups.",
      "Targets the highest-energy blue-violet band while maintaining clear, patient-friendly lens aesthetics.",
      "Delivers AR clarity benefits for driving and indoor lighting in addition to digital comfort support.",
      "Popular for all-day wearers who want one lens for work, entertainment, and commuting.",
    ]}
    tips={[
      "Use for patients reporting late-day visual fatigue from prolonged device use.",
      "Set expectations: blue management helps comfort and glare, but does not replace healthy screen habits.",
    ]}
  />
);

export default BlueBlockARPage;
