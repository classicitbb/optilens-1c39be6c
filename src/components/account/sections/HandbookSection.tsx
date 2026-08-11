import { BookOpen, Download, GraduationCap, Layers, Wrench, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HANDBOOK_URL = "/downloads/Classic_Visions_Dispenser_Handbook.pdf";

const CONTENTS = [
  {
    icon: Layers,
    title: "Products & current names",
    text: "The Best · Better · Good · Adept ladder, the full Endless range, and a naming guide so you always use the current names.",
  },
  {
    icon: Wrench,
    title: "Progressive mastery",
    text: "Understanding, fitting, dispensing and troubleshooting progressives — with lens-anatomy and fitting diagrams and a full issue/cause/remedy table.",
  },
  {
    icon: GraduationCap,
    title: "Reference & policies",
    text: "Single vision, bifocals, materials, coatings, Crizal & Eyezen addendums, a recommendation cheat sheet, and the warranties every dispenser must know.",
  },
  {
    icon: Palette,
    title: "Tints & Chemistrie",
    text: "Tint colours, intensity and material behaviour, plus the Chemistrie clip system including Avulux and FL-41 for light sensitivity.",
  },
];

const HandbookSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dispenser Handbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your new-hire onboarding manual and counter-side reference for the Classic Visions lens
          portfolio. Available to approved trade accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-xl">Classic Visions Dispenser Handbook</CardTitle>
                <CardDescription>Edition 2026.1 · PDF · 22 pages</CardDescription>
              </div>
            </div>
            <Button asChild>
              <a href={HANDBOOK_URL} download>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Download PDF
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Read it cover to cover to get fluent in what we sell, our current names for it, and how to
            fit, dispense and troubleshoot it. Keep it at the counter.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CONTENTS.map((item) => (
              <div key={item.title} className="flex gap-3 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <a href={HANDBOOK_URL} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Questions on a fit or a non-adapt? Your first call is the lab — send your two-column
              analysis and we'll give you the solution.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HandbookSection;
