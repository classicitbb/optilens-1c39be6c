import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

const highlights = [
  "Enhances cosmetic appeal with fashion-forward reflective color options.",
  "Adds comfort in bright environments by reducing glare and visible light intensity.",
  "Pairs with AR back-surface treatments to maintain visual clarity.",
  "Commonly selected for sunglass, sport, and outdoor lifestyle dispensing.",
];

const MirrorFinishPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">Mirror Coatings & Finish Guide</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Mirror coatings apply a reflective top layer to tinted or sun lenses, improving style and bright-light comfort
            for active wearers.
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">When to recommend mirror coatings</h2>
            <ul className="mt-4 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Canonical slug: <code>/coatings/mirror</code>. Legacy <code>/coatings/mirrors</code> requests are redirected.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MirrorFinishPage;
