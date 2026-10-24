import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { Coins, Layers, Sparkles } from "lucide-react";

const PrescriptionLensCostPage = () => (
  <PatientTopicPage
    title="How Much Do Prescription Lenses Cost?"
    description="A plain-language guide to what drives the price of prescription lenses: lens type, material, coatings and prescription strength, and how to get the best value."
    canonicalPath="/patients/prescription-lens-cost"
    eyebrow="Pricing Guide"
    intro="There is no single price for prescription lenses. The total depends on the type of lens you need, the material, the coatings you add, and your prescription. Here is what moves the price up or down, so you can compare quotes with confidence."
    sections={[
      {
        title: "Lens type is the biggest factor",
        body:
          "Single vision lenses are the most affordable because one power covers the whole lens. Bifocals add a reading segment, and progressive lenses blend distance, intermediate and near vision in one lens, which takes more design and manufacturing work. Specialty designs such as office, anti-fatigue and myopia control lenses sit in between or above, depending on the design.",
      },
      {
        title: "Material changes price, weight and thickness",
        body:
          "Standard plastic is the entry point. Polycarbonate adds impact resistance and is a common choice for children and safety use. High-index materials cost more, but they make strong prescriptions noticeably thinner and lighter, so the extra cost often pays for itself in comfort and appearance.",
      },
      {
        title: "Coatings and treatments are add-ons",
        body:
          "Anti-reflective, scratch-resistant, UV, blue-filter, hydrophobic and mirror coatings are each priced as upgrades. A quality anti-reflective coating is usually the most worthwhile, because it improves clarity, reduces glare and makes lenses easier to keep clean. Photochromic and polarized options are priced higher again.",
      },
      {
        title: "Your prescription and frame matter too",
        body:
          "Strong prescriptions, significant astigmatism or a large, wrap or rimless frame can require a thicker blank, a higher-index material or extra fitting work. Your optician can tell you how your own prescription and frame choice affect the price.",
      },
      {
        title: "Who sets the final price",
        body:
          "Lenses are made by a lab and sold to you by your optician, who sets the retail price and includes fitting and aftercare. Prices therefore vary between practices. Ask for the lens, material and coatings itemised so you can compare like for like.",
      },
    ]}
    highlights={[
      {
        title: "Start with the lens type",
        description: "Single vision, bifocal and progressive lenses are priced very differently, so confirm which one you need first.",
        icon: Layers,
      },
      {
        title: "Spend where it counts",
        description: "Thin materials for strong prescriptions and a good anti-reflective coating usually give the most day-to-day benefit.",
        icon: Sparkles,
      },
      {
        title: "Compare itemised quotes",
        description: "Ask for lens design, material and each coating listed separately before you decide.",
        icon: Coins,
      },
    ]}
    faqs={[
      {
        question: "How much do prescription lenses cost?",
        answer:
          "It depends on the lens type, material, coatings and your prescription. Basic single vision lenses cost the least, progressives with premium materials and coatings cost the most. Your optician can give you an itemised quote.",
      },
      {
        question: "Why are progressive lenses more expensive than single vision?",
        answer:
          "Progressives combine several vision zones in one lens with a smooth transition, which requires a more complex design and more precise manufacturing than a single power.",
      },
      {
        question: "Are high-index lenses worth the extra cost?",
        answer:
          "For stronger prescriptions, usually yes. They make lenses thinner and lighter, which looks better and is more comfortable. For mild prescriptions, standard materials are often enough.",
      },
      {
        question: "Which coatings are worth paying for?",
        answer:
          "Anti-reflective and scratch-resistant coatings benefit almost everyone. UV protection is important outdoors, and blue-filter coatings suit heavy screen use. Add others based on how you live and work.",
      },
      {
        question: "Why do prices differ between opticians?",
        answer:
          "Each practice sets its own retail prices and includes different levels of service, such as fitting, adjustments and warranty. Compare what is included, not only the total.",
      },
    ]}
    primaryAction={{ label: "Find a Vision Expert Near You", to: "/find-a-retailer" }}
    secondaryAction={{ label: "Compare Lens Types", to: "/patients/lens-differences", variant: "outline" }}
  />
);

export default PrescriptionLensCostPage;
