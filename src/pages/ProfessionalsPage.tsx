import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, Microscope, GraduationCap, CircleHelp } from "lucide-react";

const pillars = [
  {
    icon: BriefcaseBusiness,
    title: "Optical Business Support",
    description: "Work with a wholesale partner focused on practical pricing, reliable turnarounds, and responsive service.",
  },
  {
    icon: Microscope,
    title: "Lab-Ready Product Guidance",
    description: "Reference lens design and coatings education to align recommendations with patient needs and frame choices.",
  },
  {
    icon: GraduationCap,
    title: "Dispensing Education",
    description: "Use training-ready explainers for lens materials, treatment options, and communication tips at handoff.",
  },
  {
    icon: CircleHelp,
    title: "FAQ & Support Channels",
    description: "Give teams one location for common ordering questions, process clarifications, and support contact details.",
  },
];

const ProfessionalsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="text-4xl font-bold text-foreground">For Optical Professionals</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              A dedicated hub for independent practices, optical chains, and dispensers who need dependable products,
              ordering clarity, and easy-to-share patient education resources.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/store">Browse Products</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/knowledge">Open Knowledge Base</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-xl border border-border bg-card p-5">
                <pillar.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 text-lg font-semibold text-foreground">{pillar.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfessionalsPage;
