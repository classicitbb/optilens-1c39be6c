import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { ArrowUpDown, BookOpenText, Glasses } from "lucide-react";

const ProgressiveLensesPage = () => (
  <PatientTopicPage
    title="Why Choose Progressive Lenses?"
    description="Understand when progressive lenses make sense and what patients should expect from them."
    canonicalPath="/patients/progressive-lenses"
    eyebrow="Progressive Lens Guide"
    intro="Progressive lenses are designed for people who want distance, intermediate, and near vision in one pair. They can be a strong fit when convenience matters and you are ready for a short adaptation period."
    sections={[
      {
        title: "They replace the need to switch between multiple pairs",
        body:
          "A well-fit progressive lens lets you move from driving to computer work to reading without changing glasses. That convenience is the main reason many patients choose them once near vision starts to change.",
      },
      {
        title: "Adaptation is normal, not failure",
        body:
          "Because the lens contains several visual zones, your eyes and posture may need a little time to learn where to look for each task. Precise measurements and frame fit make a major difference in how easy that adaptation feels.",
      },
      {
        title: "The best progressive is the one matched to your lifestyle",
        body:
          "Different progressive designs prioritize different things, such as wider reading space, smoother transitions, or better distance stability. Your work style, reading habits, and frame choice all help determine which design will feel best.",
      },
    ]}
    highlights={[
      {
        title: "One pair convenience",
        description: "Progressives reduce the need to carry separate glasses for reading and daily life.",
        icon: Glasses,
      },
      {
        title: "Fit is critical",
        description: "Accurate fitting height, pupillary distance, and frame position matter as much as the prescription.",
        icon: ArrowUpDown,
      },
      {
        title: "Training helps",
        description: "Simple coaching on head movement and reading posture often improves early comfort quickly.",
        icon: BookOpenText,
      },
    ]}
    faqs={[
      {
        question: "Who usually benefits most from progressives?",
        answer:
          "Patients who need help at more than one distance and want one primary pair for everyday life often benefit most.",
      },
      {
        question: "Do progressive lenses always have distortion?",
        answer:
          "All multifocal designs involve tradeoffs, but better design, correct fitting, and realistic expectations usually make the experience much more comfortable.",
      },
      {
        question: "Can I use progressives for computer work all day?",
        answer:
          "Many people do, but if screens dominate your day, an occupational or office lens may be more comfortable as a second pair.",
      },
      {
        question: "What causes progressive lenses to feel wrong?",
        answer:
          "Common causes include outdated prescription, inaccurate fitting data, poor frame alignment, or a design mismatch for your main tasks.",
      },
    ]}
    primaryAction={{ label: "Explore Progressive Products", to: "/lenses/progressive" }}
    secondaryAction={{ label: "Read Lens Differences", to: "/patients/lens-differences", variant: "outline" }}
  />
);

export default ProgressiveLensesPage;
