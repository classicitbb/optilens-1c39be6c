import PatientTopicPage from "@/components/patients/PatientTopicPage";
import { Shield, Sun, Waves } from "lucide-react";

const SunlightProtectionPage = () => (
  <PatientTopicPage
    title="Sunlight and Protection"
    description="How UV protection, glare control, and outdoor lens choices support comfortable vision."
    canonicalPath="/patients/sunlight-protection"
    eyebrow="Outdoor Vision Guide"
    intro="Bright environments can challenge both comfort and long-term eye protection. The right combination of UV blocking, glare management, and outdoor-ready lens design makes time outside easier on your eyes."
    sections={[
      {
        title: "UV protection matters even when light feels comfortable",
        body:
          "Ultraviolet exposure is not only a comfort issue. Good outdoor eyewear should help block harmful UV while still matching your prescription, frame style, and day-to-day use.",
      },
      {
        title: "Glare is different from brightness",
        body:
          "Harsh reflections from roads, water, sand, and windshields can reduce contrast even when you can technically still see. Polarized options and premium sun solutions are often chosen to improve visual comfort in those conditions.",
      },
      {
        title: "One outdoor strategy does not fit every routine",
        body:
          "Someone mostly walking between indoors and outdoors may prefer photochromic convenience, while someone spending long hours near water or driving may benefit more from dedicated polarized sunwear. Your environment should shape the recommendation.",
      },
    ]}
    highlights={[
      {
        title: "UV every day",
        description: "Protection matters in tropical climates, during overcast weather, and around reflective surfaces.",
        icon: Shield,
      },
      {
        title: "Glare control improves comfort",
        description: "Reducing reflected light often makes outdoor vision feel calmer and more stable.",
        icon: Waves,
      },
      {
        title: "Choose for your routine",
        description: "Driving, beach time, boating, and quick errands may each call for a different outdoor solution.",
        icon: Sun,
      },
    ]}
    faqs={[
      {
        question: "Are darker lenses always safer?",
        answer:
          "Not necessarily. Darkness alone does not guarantee UV protection, which is why lens quality and specification matter more than tint depth by itself.",
      },
      {
        question: "Do photochromic lenses replace sunglasses?",
        answer:
          "For some routines they can, but dedicated polarized sunwear may still perform better for strong glare and extended outdoor exposure.",
      },
      {
        question: "Can children benefit from UV-protective eyewear too?",
        answer:
          "Yes. Outdoor protection is relevant across ages, especially for children who spend significant time in bright sun.",
      },
      {
        question: "Why does glare feel exhausting?",
        answer:
          "Reflected light can lower contrast and force your eyes to work harder, which makes outdoor vision feel more stressful even when the prescription is correct.",
      },
    ]}
    primaryAction={{ label: "Explore Polarized Lenses", to: "/lenses/polarized" }}
    secondaryAction={{ label: "Compare Photochromic Options", to: "/photochromic", variant: "outline" }}
  />
);

export default SunlightProtectionPage;
