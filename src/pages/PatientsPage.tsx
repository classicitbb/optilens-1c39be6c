import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpenText, Glasses, HeartHandshake, Laptop, MapPin, SunMedium, Stethoscope } from "lucide-react";

const understandingItems = [
  {
    title: "What’s the Difference Between Lenses?",
    description:
      "Single vision helps one focal range, while progressives support distance, intermediate, and near in one lens. Material and coatings also impact thickness, comfort, and durability.",
  },
  {
    title: "Why Choose Progressive?",
    description:
      "Progressive designs provide seamless transitions between visual zones, reducing the need to switch between multiple glasses for driving, computer work, and reading.",
  },
  {
    title: "Eye Strain & Anti-Fatigue Lenses",
    description:
      "Anti-fatigue lenses include gentle near support for frequent device users who notice tired eyes, headaches, or refocusing difficulty later in the day.",
  },
  {
    title: "Caring for Your Glasses",
    description:
      "Rinse with lukewarm water, use approved lens cleaner, and dry with microfiber cloth. Avoid paper towels and high heat to preserve coating performance.",
  },
];

const careItems = [
  {
    title: "Find a Vision Expert Near You",
    description: "Work with a licensed eye care professional to confirm your prescription, lens design, frame fit, and coating recommendations.",
  },
  {
    title: "Ask Your Optician About Classic Visions",
    description:
      "Ask about Classic Visions options for progressive comfort, digital-eye-strain support, and UV-focused coatings matched to your daily routine.",
  },
];

const tipItems = [
  {
    title: "Computer & Mobile Use",
    description:
      "Use the 20-20-20 habit, increase blink frequency, and keep screens an arm’s length away. Blue-light filtering and anti-reflective coatings may improve long-session comfort.",
  },
  {
    title: "Sunlight & Protection",
    description:
      "Choose full UV protection outdoors. Polarized and photochromic options can reduce glare and support comfortable contrast in bright conditions.",
  },
  {
    title: "Regular Eye Exams",
    description:
      "Comprehensive eye exams support early detection and keep your prescription updated as your visual needs change over time.",
  },
];

const faqs = [
  {
    question: "Do blue-light lenses block all blue light?",
    answer:
      "No. Most designs selectively filter portions of high-energy visible light while preserving color balance and clarity for daily tasks.",
  },
  {
    question: "Who should consider anti-fatigue lenses?",
    answer:
      "People with long digital workdays who report end-of-day eye tiredness, mild headaches, or trouble shifting focus between devices and distance.",
  },
  {
    question: "How often should I replace my lenses?",
    answer:
      "There is no one-size schedule. Replace when your prescription changes, coatings show wear, or visual comfort decreases. Annual exams help determine timing.",
  },
];

const PatientsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-2xl border border-border bg-card p-8">
            <h1 className="text-4xl font-bold text-foreground">Patients Hub</h1>
            <p className="mt-4 max-w-4xl text-lg text-muted-foreground">
              Explore practical lens education, digital-eye-strain guidance, and appointment prep in one place so you can have a more informed conversation with your eye care team.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/zenvue/compare">Compare Lens Options</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/knowledge">Read Knowledge Articles</Link>
              </Button>
            </div>
          </section>

          <section className="mt-8 grid gap-6 md:grid-cols-3">
            <article id="understanding-lenses" className="scroll-mt-24 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <BookOpenText className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Understanding Your Lenses</h2>
              </div>
              <div className="mt-4 space-y-4">
                {understandingItems.map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article id="find-care" className="scroll-mt-24 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <HeartHandshake className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Find Care</h2>
              </div>
              <div className="mt-4 space-y-4">
                {careItems.map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium text-foreground">Care conversation starter</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bring your daily routine details (screen time, driving at night, outdoor exposure) so your optician can personalize lens recommendations.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/find-a-retailer">Find a retailer by island</Link>
                </Button>
              </div>
            </article>

            <article id="vision-tips" className="scroll-mt-24 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <Glasses className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Vision Tips</h2>
              </div>
              <div className="mt-4 space-y-4">
                {tipItems.map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/patients/night-driving-aids">Explore Night Driving Aids</Link>
                </Button>
              </div>
            </article>
          </section>

          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <article id="blue-light-education" className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <Laptop className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Blue-Light Education</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Blue light is a natural part of sunlight and also emitted by digital screens and LED lighting.</li>
                <li>• Visual discomfort from screen use is often tied to reduced blinking, near-focus load, and glare.</li>
                <li>• Blue-filter and anti-reflective options can be paired with proper ergonomics for better all-day comfort.</li>
              </ul>
            </article>

            <article id="patients-faq" className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <Stethoscope className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Patient FAQs</h2>
              </div>
              <div className="mt-4 space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-8 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Need in-person help?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Connect with your local eye care provider for exam scheduling and personalized dispensing advice.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link to="/find-a-retailer">
                    <MapPin className="mr-2 h-4 w-4" />
                    Find a Retailer
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/lenses/blue-filter">
                    <SunMedium className="mr-2 h-4 w-4" />
                    Explore Blue Filter Lenses
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PatientsPage;
