import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { CalendarCheck2, HeartPulse, SearchCheck } from "lucide-react";

const RegularEyeExamsPage = () => (
  <PatientTopicPage
    title="Regular Eye Exams"
    description="Why routine eye exams matter for prescription accuracy, comfort, and long-term eye health."
    canonicalPath="/patients/regular-eye-exams"
    eyebrow="Eye Health Guide"
    intro="Routine eye exams do more than update a prescription. They help catch changes early, keep your lenses aligned with your real visual needs, and support long-term eye health with fewer surprises."
    sections={[
      {
        title: "Prescriptions can drift before you fully notice it",
        body:
          "Many people adapt gradually to small vision changes, which means you may not realize how much extra effort your eyes are using until the prescription is updated. An exam can uncover that hidden strain before it becomes your new normal.",
      },
      {
        title: "Exams support both vision and health",
        body:
          "A comprehensive eye exam looks beyond clarity alone. It helps monitor ocular health, track risk factors, and flag changes that may need medical attention or a different lens strategy.",
      },
      {
        title: "Updated exam data improves lens recommendations",
        body:
          "When your measurements are current, your optician can make better decisions about lens design, coatings, frame fit, and whether your routine calls for a single primary pair or multiple task-specific options.",
      },
    ]}
    highlights={[
      {
        title: "Better accuracy",
        description: "Fresh prescription data improves day-to-day comfort and reduces the guesswork in lens selection.",
        icon: SearchCheck,
      },
      {
        title: "Preventive value",
        description: "Regular exams help detect issues earlier instead of waiting until symptoms become obvious.",
        icon: HeartPulse,
      },
      {
        title: "Stay on schedule",
        description: "Your clinician can recommend the right exam interval based on age, symptoms, and health history.",
        icon: CalendarCheck2,
      },
    ]}
    faqs={[
      {
        question: "How often should most adults have an eye exam?",
        answer:
          "The right interval varies, but many adults benefit from regular scheduled exams. Your clinician should set the cadence based on your age, symptoms, prescription, and health profile.",
      },
      {
        question: "If I can still see, do I really need an exam?",
        answer:
          "Yes. Some changes develop gradually or affect eye health before they noticeably affect day-to-day clarity.",
      },
      {
        question: "Can exams help with headaches or tired eyes?",
        answer:
          "They can. Headaches and visual fatigue sometimes point to prescription changes, binocular issues, or task demands that deserve a closer look.",
      },
      {
        question: "Should I bring my current glasses to the appointment?",
        answer:
          "Definitely. Your current pair gives useful context about what is working, what is not, and whether your lens setup still fits your routine.",
      },
    ]}
    primaryAction={{ label: "Find a Vision Expert Near You", to: "/find-a-retailer" }}
    secondaryAction={{ label: "Visit the Patients Hub", to: "/patients", variant: "outline" }}
  />
);

export default RegularEyeExamsPage;
