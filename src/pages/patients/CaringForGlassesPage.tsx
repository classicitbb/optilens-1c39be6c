import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { Droplets, ShieldCheck, Sparkles } from "lucide-react";

const CaringForGlassesPage = () => (
  <PatientTopicPage
    title="Caring for Your Glasses"
    description="Simple care habits that protect lenses, coatings, and day-to-day visual clarity."
    canonicalPath="/patients/caring-for-glasses"
    eyebrow="Lens Care Guide"
    intro="Small cleaning habits have a big impact on how long your lenses stay clear and comfortable. Good lens care protects coatings, reduces scratches, and helps your glasses perform the way they were designed to."
    sections={[
      {
        title: "Rinse first, then clean",
        body:
          "Dust and grit can scratch lenses if you rub them dry. A quick rinse with lukewarm water before using approved lens cleaner helps lift debris away before wiping.",
      },
      {
        title: "Use the right tools for coated lenses",
        body:
          "Microfiber cloths and lens-safe cleaning sprays are designed to clean without stripping or scuffing coatings. Paper towels, shirt hems, tissues, and household cleaners can shorten the life of premium coatings.",
      },
      {
        title: "Storage matters when you are not wearing them",
        body:
          "A protective case reduces accidental scratches, frame warping, and coating wear. Heat, dashboards, and steamy environments can also stress lens materials and treatments over time.",
      },
    ]}
    highlights={[
      {
        title: "Water first",
        description: "Rinsing before wiping reduces the chance of rubbing abrasive particles across the lens surface.",
        icon: Droplets,
      },
      {
        title: "Case every day",
        description: "Most avoidable scratches happen when glasses are loose in a bag, pocket, or on a hard surface.",
        icon: ShieldCheck,
      },
      {
        title: "Protect your coatings",
        description: "Premium anti-reflective and easy-clean layers last longer when cleaned gently and consistently.",
        icon: Sparkles,
      },
    ]}
    faqs={[
      {
        question: "Can I use glass cleaner or alcohol wipes on my lenses?",
        answer:
          "It is better to avoid household cleaners unless your optician specifically approves them. Some chemicals can damage coatings or frame finishes.",
      },
      {
        question: "Why do my lenses still smear after cleaning?",
        answer:
          "Skin oils, old cloth buildup, or using the wrong cleaner can leave residue. Washing the microfiber cloth regularly also helps.",
      },
      {
        question: "Is hot water bad for glasses?",
        answer:
          "Yes, very hot water can stress coatings and some frame materials. Stick with lukewarm water instead.",
      },
      {
        question: "How often should I replace microfiber cloths?",
        answer:
          "Replace them when they stay dirty, feel rough, or no longer clean well. A worn cloth can reintroduce residue and debris.",
      },
    ]}
    primaryAction={{ label: "Learn About Lens Coatings", to: "/knowledge" }}
    secondaryAction={{ label: "Find a Retailer", to: "/find-a-retailer", variant: "outline" }}
  />
);

export default CaringForGlassesPage;
