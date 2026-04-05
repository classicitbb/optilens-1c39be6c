import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { Glasses, Layers3, Sparkles } from "lucide-react";

const LensDifferencesPage = () => (
  <PatientTopicPage
    title="What's the Difference Between Lenses?"
    description="A patient-friendly guide to single vision, progressive, and specialty lens choices."
    canonicalPath="/patients/lens-differences"
    eyebrow="Patient Lens Guide"
    intro="Lens categories are built for different jobs. The clearest choice usually comes from matching your daily routine, prescription, and comfort priorities to the right design instead of picking by product name alone."
    sections={[
      {
        title: "Single vision solves one main distance at a time",
        body:
          "Single-vision lenses are designed for one focal demand, such as distance, reading, or computer work. They are often the simplest option when your prescription and day-to-day routine do not require multiple viewing zones in the same pair.",
      },
      {
        title: "Progressives cover multiple distances in one lens",
        body:
          "Progressive lenses blend distance, intermediate, and near correction without a visible line. They are commonly recommended when you want one pair for driving, screen work, meetings, shopping, and reading instead of swapping between glasses.",
      },
      {
        title: "Specialty designs are tuned for specific habits",
        body:
          "Anti-fatigue, occupational, polarized, photochromic, and blue-filter options each solve a different comfort or performance problem. The best fit depends on whether your main challenge is digital fatigue, glare outdoors, indoor task range, or all-day convenience.",
      },
    ]}
    highlights={[
      {
        title: "Job first",
        description: "Start with what you do most: drive, read, use screens, or move between all three.",
        icon: Glasses,
      },
      {
        title: "Design matters",
        description: "Two lenses can share a prescription but feel very different because the design goals are different.",
        icon: Layers3,
      },
      {
        title: "Coatings finish the system",
        description: "Anti-reflective, UV, scratch, and easy-clean layers affect comfort and durability after you choose the base lens.",
        icon: Sparkles,
      },
    ]}
    faqs={[
      {
        question: "Does a stronger prescription automatically mean I need a special lens type?",
        answer:
          "Not always. Prescription strength may influence material choice and thickness, but the lens design itself should still match how you use your glasses.",
      },
      {
        question: "Can one pair do everything?",
        answer:
          "Sometimes. Many people do well with progressives or photochromic designs, while others prefer a main pair plus a task-specific second pair for maximum comfort.",
      },
      {
        question: "Should I choose the lens first or the frame first?",
        answer:
          "They work together. Frame size, shape, and fit can affect lens thickness, progressive fitting, and comfort, so it is best to choose them as a system.",
      },
      {
        question: "Why do opticians ask about my routine so much?",
        answer:
          "Because your routine often reveals the real problem to solve. The right lens for an office worker may be very different from the right lens for a driver or someone outdoors most of the day.",
      },
    ]}
    primaryAction={{ label: "Compare Lens Options", to: "/zenvue/compare" }}
    secondaryAction={{ label: "Explore Progressive Lenses", to: "/patients/progressive-lenses", variant: "outline" }}
  />
);

export default LensDifferencesPage;
