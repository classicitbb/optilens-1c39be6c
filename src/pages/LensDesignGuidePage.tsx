import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router";

type LensGuideLink = {
  title: string;
  description: string;
  to: string;
};

type LensGuideSection = {
  title: string;
  links: LensGuideLink[];
};

const lensSections: LensGuideSection[] = [
  {
    title: "Everyday Vision",
    links: [
      {
        title: "Progressive",
        description: "Premium multifocal options for all-day vision across distance, intermediate, and near.",
        to: "/lenses/progressive",
      },
      {
        title: "Office / Occupational",
        description: "Task-focused near and intermediate designs for workstation and desk-centric use.",
        to: "/lenses/office-occupational",
      },
      {
        title: "Anti-Fatigue",
        description: "Single-vision comfort support for digital users with mild near-demand stress.",
        to: "/lenses/anti-fatigue",
      },
      {
        title: "Single Vision",
        description: "A single prescription power across the full lens for distance, intermediate, or near.",
        to: "/lenses/single-vision",
      },
      {
        title: "Bifocals",
        description: "Compare conventional flat-top bifocals with modern digital freeform bifocal alternatives.",
        to: "/lenses/bifocals",
      },
    ],
  },
  {
    title: "Lifestyle Lenses",
    links: [
      {
        title: "Photochromic",
        description: "Adaptive lenses that change tint with UV/light conditions for indoor-outdoor convenience.",
        to: "/photochromic",
      },
      {
        title: "LED PRO",
        description: "Selective LED filtering for glare-heavy headlights, screens, stadiums, and bright indoor lighting.",
        to: "/lenses/led-pro",
      },
      {
        title: "Blue Filter",
        description: "Lens options for screen-heavy routines and digital comfort preferences.",
        to: "/lenses/blue-filter",
      },
      {
        title: "Polarized",
        description: "Outdoor glare-cutting solutions for sun, driving, and high-reflection environments.",
        to: "/lenses/polarized",
      },
      {
        title: "Tints & Fashion Colors",
        description: "Performance and style tint selections for visual comfort and aesthetics.",
        to: "/lenses/tints-fashion-colors",
      },
      {
        title: "Myopia Control",
        description: "Evidence-based strategies to slow progression using lens and clinical management options.",
        to: "/lenses/myopia-control",
      },
    ],
  },
  {
    title: "Technical Specs",
    links: [
      {
        title: "Materials (1.50–1.74)",
        description: "Compare index ranges, thickness trade-offs, and material characteristics.",
        to: "/lenses/materials",
      },
      {
        title: "Thickness Chart",
        description: "Understand expected lens thickness outcomes across prescription ranges.",
        to: "/lenses/thickness-chart",
      },
    ],
  },
];

const LensDesignGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground">Lens Design Guide</h1>
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              Browse lens categories and product education pages in one place. This page mirrors the Lenses navigation
              and gives direct links with practical summaries for quick selection.
            </p>
          </div>

          {lensSections.map((section) => (
            <section key={section.title} className="mb-10">
              <h2 className="mb-4 text-2xl font-semibold text-foreground">{section.title}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.links.map((lens) => (
                  <Link key={lens.title} to={lens.to} className="group">
                    <Card className="h-full border-border transition-colors group-hover:border-primary/50">
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground group-hover:text-primary">{lens.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{lens.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LensDesignGuidePage;
