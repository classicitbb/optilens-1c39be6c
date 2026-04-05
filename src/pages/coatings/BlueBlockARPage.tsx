import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import {
  Monitor,
  Shield,
  Eye,
  Sun,
  ArrowRight,
  Laptop,
  GraduationCap,
  Briefcase,
  Gamepad2,
} from "lucide-react";

const BENEFITS = [
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Digital Screen Comfort",
    text: "Reduces harsh reflected glare from screens in offices, classrooms, and remote-work setups for more comfortable extended viewing.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Blue-Violet Management",
    text: "Targets the highest-energy blue-violet band while maintaining clear, patient-friendly lens aesthetics and natural color balance.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Full AR Performance",
    text: "Delivers all the anti-reflective benefits — reduced glare, better contrast, improved night vision — in addition to blue management.",
  },
  {
    icon: <Sun className="h-5 w-5" />,
    title: "All-Day Wearability",
    text: "Designed for one lens that covers work, entertainment, commuting, and indoor lighting without compromise.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Selective Filtering",
    description: "The coating selectively targets the highest-energy blue-violet wavelengths (415–455 nm) that contribute most to visual discomfort from digital sources.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    name: "AR Clarity Layer",
    description: "Multi-layer anti-reflective technology reduces surface reflections from both sides of the lens, improving contrast and visual sharpness.",
  },
  {
    icon: <Sun className="h-6 w-6" />,
    name: "Color Balance",
    description: "Engineered to maintain natural color perception so lenses appear clear and cosmetically appealing — no heavy yellow or amber tint.",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    name: "Glare Reduction",
    description: "Works across LED overhead lighting, screen-emitted light, and daylight to reduce visual fatigue throughout the day.",
  },
];

const IDEAL_WEARERS = [
  {
    icon: <Laptop className="h-6 w-6" />,
    label: "Office Workers",
    description: "Professionals spending 6+ hours daily under LED lighting and in front of multiple screens.",
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    label: "Students",
    description: "Learners who switch between tablets, laptops, and classroom projectors throughout the day.",
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    label: "Remote Workers",
    description: "Home-office users on video calls all day who need clear lenses for camera and screen comfort.",
  },
  {
    icon: <Gamepad2 className="h-6 w-6" />,
    label: "Digital Enthusiasts",
    description: "Gamers, content creators, and heavy device users reporting late-day visual fatigue.",
  },
];

const BlueBlockARPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-24">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Premium Performance</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">BlueBlock AR (Blue Defense&nbsp;AR+)</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Combines anti-reflective performance with selective blue-violet light management, helping reduce harsh glare from digital screens while preserving color balance for daily wear.
          </p>
        </section>

        {/* Benefits */}
        <section className="container mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">{b.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-20 bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">How BlueBlock AR Works</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              A dual-purpose coating system that manages blue-violet exposure while delivering full anti-reflective performance.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((t) => (
                <Card key={t.name} className="border-border bg-background">
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{t.icon}</div>
                    <h3 className="text-base font-semibold text-foreground">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Ideal Wearers */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
          <p className="mt-1 text-muted-foreground">Best for patients reporting late-day visual fatigue from prolonged device use.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAL_WEARERS.map((w) => (
              <Card key={w.label} className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{w.icon}</div>
                  <h3 className="text-base font-semibold text-foreground">{w.label}</h3>
                  <p className="text-sm text-muted-foreground">{w.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto mt-20 max-w-6xl px-4 lg:px-8">
          <Card className="border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold">Add BlueBlock AR to any lens</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">Blue management helps comfort and glare — pair with progressive or single vision for best results.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild><Link to="/#contact">Contact Us</Link></Button>
                <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/store">Shop Coatings <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlueBlockARPage;
