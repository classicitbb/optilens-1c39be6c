import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const lensTypes = [
  {
    title: "Single Vision",
    description:
      "A single prescription power across the full lens for distance, intermediate, or near tasks.",
  },
  {
    title: "Bifocal",
    description:
      "Two viewing zones in one lens, typically distance on top and near vision in the segment.",
  },
  {
    title: "Progressive",
    description:
      "A seamless power gradient that supports distance, intermediate, and near without visible segment lines.",
  },
  {
    title: "Occupational / Office",
    description:
      "Task-focused designs optimized for computer and workstation distances with wider near/intermediate fields.",
  },
];

const LensDesignGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground">Lens Design Guide</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Explore lens design fundamentals used by dispensing teams, optical labs, and patient-care staff.
            </p>
          </div>

          <section id="lens-types" className="scroll-mt-28">
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Lens Types</h2>
            <p className="mb-6 text-muted-foreground">
              This section replaces the broken <code>#Lens-Types</code> jump behavior and provides a direct, publishable
              destination URL at <code>/lenses/lens-types</code>.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {lensTypes.map((lens) => (
                <Card key={lens.title}>
                  <CardHeader>
                    <CardTitle className="text-lg">{lens.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{lens.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LensDesignGuidePage;
