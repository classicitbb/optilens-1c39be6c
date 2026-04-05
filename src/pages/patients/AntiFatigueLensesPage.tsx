import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { Eye, Laptop, TimerReset } from "lucide-react";

const AntiFatigueLensesPage = () => (
  <PatientTopicPage
    title="Eye Strain and Anti-Fatigue Lenses"
    description="A practical guide to digital eye strain and when anti-fatigue lenses may help."
    canonicalPath="/patients/anti-fatigue-lenses"
    eyebrow="Digital Comfort Guide"
    intro="Eye strain is often caused by long near-focus sessions, reduced blinking, glare, and posture fatigue. Anti-fatigue lenses are built to support comfort for people who spend long stretches on phones, laptops, and desktop screens."
    sections={[
      {
        title: "Digital discomfort is usually a combination problem",
        body:
          "Screen-related symptoms such as tired eyes, headaches, and blurry refocusing often come from several factors at once: too much near work, poor screen position, dry eyes, and reflections. Lens choice helps most when it is paired with ergonomic habits.",
      },
      {
        title: "Anti-fatigue lenses add gentle support for near work",
        body:
          "These designs typically include a mild boost in the lower portion of the lens. The goal is not to replace a full reading prescription, but to reduce effort for younger or early presbyopic wearers who spend heavy time on devices.",
      },
      {
        title: "They work best for the right patient profile",
        body:
          "Anti-fatigue lenses are often a good conversation when you are comfortable at distance but feel worn down after screens, especially late in the day. They are not the answer for every symptom, which is why a current exam still matters.",
      },
    ]}
    highlights={[
      {
        title: "Comfort over time",
        description: "The goal is less end-of-day fatigue, not dramatic instant vision change.",
        icon: TimerReset,
      },
      {
        title: "Screen-heavy routines",
        description: "They are most relevant for students, office workers, and anyone bouncing between laptop and phone all day.",
        icon: Laptop,
      },
      {
        title: "Symptoms matter",
        description: "Headaches, tired eyes, and slow refocusing are better clues than marketing language.",
        icon: Eye,
      },
    ]}
    faqs={[
      {
        question: "Do anti-fatigue lenses replace blue-light filters?",
        answer:
          "No. They solve a different problem. Anti-fatigue designs provide optical support, while blue-filter options address short-wavelength light management and glare preferences.",
      },
      {
        question: "Will anti-fatigue lenses make distance vision blurry?",
        answer:
          "They should not when prescribed and fitted correctly. The support is subtle and intended to preserve everyday distance use.",
      },
      {
        question: "Can teenagers use anti-fatigue lenses?",
        answer:
          "Sometimes, especially in screen-heavy academic routines, but the right choice depends on symptoms, exam findings, and clinician judgment.",
      },
      {
        question: "What else should I change besides the lenses?",
        answer:
          "Screen height, viewing distance, blinking, lighting, and break habits all matter. Good lens design works best with good visual hygiene.",
      },
    ]}
    primaryAction={{ label: "Explore Anti-Fatigue Lenses", to: "/lenses/anti-fatigue" }}
    secondaryAction={{ label: "See Computer and Mobile Tips", to: "/patients/computer-mobile-use", variant: "outline" }}
  />
);

export default AntiFatigueLensesPage;
