import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { AlarmClock, Laptop, Smartphone } from "lucide-react";

const ComputerMobileUsePage = () => (
  <PatientTopicPage
    title="Computer and Mobile Use"
    description="Practical ways to reduce digital eye strain during long screen sessions."
    canonicalPath="/patients/computer-mobile-use"
    eyebrow="Screen Comfort Guide"
    intro="Long screen sessions ask a lot from your eyes. A better setup, smarter break rhythm, and the right lens options can make digital work noticeably more comfortable over the course of a day."
    sections={[
      {
        title: "Distance and screen height influence fatigue",
        body:
          "A screen that is too close, too high, or too bright makes your eyes and neck work harder than they should. Keeping screens at a comfortable arm's length and slightly below eye level usually improves comfort quickly.",
      },
      {
        title: "Blinking drops during device use",
        body:
          "Many people blink less often when concentrating on screens, which can make eyes feel dry, gritty, or tired. Room humidity, airflow, and deliberate blinking breaks can all help.",
      },
      {
        title: "Lens support can reduce workload",
        body:
          "Anti-reflective coatings, anti-fatigue designs, and task-specific office lenses can each improve comfort depending on your setup. The best choice depends on whether your strain comes more from glare, prolonged focus, or both.",
      },
    ]}
    highlights={[
      {
        title: "20-20-20 helps",
        description: "Every 20 minutes, look at something 20 feet away for 20 seconds to relax near-focus demand.",
        icon: AlarmClock,
      },
      {
        title: "Laptop posture counts",
        description: "External keyboards, stands, and better chair setup can reduce both eye and neck strain.",
        icon: Laptop,
      },
      {
        title: "Phones are extra demanding",
        description: "Smaller text and shorter viewing distance can increase strain faster than larger screens.",
        icon: Smartphone,
      },
    ]}
    faqs={[
      {
        question: "Do blue-light lenses fix digital eye strain by themselves?",
        answer:
          "Not by themselves. Many screen symptoms come from focusing effort, dryness, and glare, so the best results usually come from combining lenses with better habits and setup.",
      },
      {
        question: "Should I hold my phone farther away?",
        answer:
          "Usually yes. Very close viewing increases demand on your eyes, so enlarging text and holding devices a bit farther away can help.",
      },
      {
        question: "What if I feel fine in the morning but not by afternoon?",
        answer:
          "That pattern often points to visual fatigue building over time, which is exactly when break habits, better ergonomics, and comfort-focused lens designs can help.",
      },
      {
        question: "Would a second pair for computer work be overkill?",
        answer:
          "Not necessarily. For heavy screen users, a dedicated office or occupational pair can be one of the most comfortable upgrades available.",
      },
    ]}
    primaryAction={{ label: "Explore Anti-Fatigue Lenses", to: "/patients/anti-fatigue-lenses" }}
    secondaryAction={{ label: "Read Blue Filter Guide", to: "/lenses/blue-filter", variant: "outline" }}
  />
);

export default ComputerMobileUsePage;
