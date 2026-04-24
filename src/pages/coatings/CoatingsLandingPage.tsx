import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router";

type CoatingGuideLink = {
  title: string;
  description: string;
  to: string;
};

type CoatingGuideSection = {
  title: string;
  links: CoatingGuideLink[];
};

const coatingSections: CoatingGuideSection[] = [
  {
    title: "Premium Performance",
    links: [
      {
        title: "Super AR",
        description: "Multi-layer anti-reflective for maximum clarity and glare elimination.",
        to: "/coatings/ultraclear-ar",
      },
      {
        title: "Blue Defense AR+ (BlueBlock AR)",
        description: "Blue-violet management combined with premium AR clarity for screen-heavy environments.",
        to: "/coatings/blueblock-ar",
      },
      {
        title: "Mirror Finish",
        description: "Fashion and sport mirror coatings for style and high-sun performance.",
        to: "/coatings/mirror",
      },
    ],
  },
  {
    title: "Everyday Protection",
    links: [
      {
        title: "Scratch-Resistant",
        description: "Hard coat durability foundation that extends lens life and maintains optical clarity.",
        to: "/coatings/scratch-resistant",
      },
      {
        title: "UV Shield — UVA, UVB, BV",
        description: "Ultraviolet and blue-violet filtering to protect eyes from harmful radiation.",
        to: "/coatings/uv-shield",
      },
      {
        title: "Hydrophobic & Oleophobic",
        description: "Water and oil repellent top coats that resist smudges, fingerprints, and moisture.",
        to: "/coatings/hydrophobic-oleophobic",
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        title: "How AR Coating Works",
        description: "The science behind anti-reflective layers and why they improve vision.",
        to: "/knowledge#how-ar-coating-works",
      },
      {
        title: "Caring for Your Coated Lenses",
        description: "Maintenance tips and best practices to preserve coating performance.",
        to: "/knowledge#caring-for-coated-lenses",
      },
    ],
  },
];

const CoatingsLandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground">Coatings Guide</h1>
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              Browse coating categories and product education pages in one place. This page mirrors the Coatings
              navigation and gives direct links with practical summaries for quick selection.
            </p>
          </div>

          {coatingSections.map((section) => (
            <section key={section.title} className="mb-10">
              <h2 className="mb-4 text-2xl font-semibold text-foreground">{section.title}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.links.map((coating) => {
                  const isHashLink = coating.to.includes("#") && !coating.to.startsWith("#");
                  const card = (
                    <Card className="h-full border-border transition-colors group-hover:border-primary/50">
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground group-hover:text-primary">
                          {coating.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{coating.description}</p>
                      </CardContent>
                    </Card>
                  );
                  return isHashLink ? (
                    <a key={coating.title} href={coating.to} className="group">
                      {card}
                    </a>
                  ) : (
                    <Link key={coating.title} to={coating.to} className="group">
                      {card}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoatingsLandingPage;
