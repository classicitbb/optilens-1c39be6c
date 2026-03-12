import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Car, ExternalLink, MoonStar, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const recommendations = [
{
  title: "Premium anti-reflective (AR) coatings",
  reason:
  "High-quality AR coatings reduce headlight reflections on both lens surfaces, improving contrast and reducing halo-like glare for many wearers.",
  bestFor: "Everyday single-vision and progressive wearers who drive after dark."
},
{
  title: "Accurate Rx + well-centered optics",
  reason:
  "Night discomfort can worsen when prescription power, fitting height, or frame alignment is off. A current exam and precise fitting are foundational before specialty add-ons.",
  bestFor: "Anyone noticing new starbursts, blur, or fatigue at night."
},
{
  title: "Chemistrie® Driving clip options",
  reason:
  "Chemistrie Driving products are positioned for improved road contrast and daytime glare control, with customizable clip formats that preserve your base prescription frame.",
  bestFor: "Drivers wanting optional clip-on support for specific road conditions."
},
{
  title: "Comfort-focused driving habits",
  reason:
  "Dry-eye management, clean lenses, and reduced windshield haze can meaningfully improve night-time clarity without changing lens technology.",
  bestFor: "Drivers with intermittent discomfort rather than constant blur."
}];


const NightDrivingAidsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden pt-24">
        <div className="absolute inset-0">
          <img src="https://www.forecps.com/wp-content/uploads/2025/12/A91ocokfo_1fphqiw_w2g-scaled.png" alt="Night driving aids" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/75" />
        </div>
        <div className="container relative mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Patient Feature Guide</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-foreground md:text-5xl">Night Driving Aids</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            If bright oncoming headlights are uncomfortable, the best strategy is usually layered: precise prescription, premium anti-reflective optics, and optional driving-specific accessories for the right scenario.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/professionals/chemistrie-lens-system">Explore Chemistrie System</Link>
            </Button>
            <Button variant="outline" asChild>
              <a target="_blank" rel="noreferrer noopener" href="https://www.forecps.com/chemistrie-drive/">
                Forecps Chemistrie Driving
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl space-y-8 px-4 py-12 lg:px-8">
        <section className="grid gap-6 md:grid-cols-2">
          {recommendations.map((item) =>
          <Card key={item.title} variant="glass">
              <CardContent className="space-y-3 p-6">
                <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
                <p className="text-sm"><span className="font-semibold text-foreground">Best for:</span> <span className="text-muted-foreground">{item.bestFor}</span></p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Important deconflict: Drivewear® and night driving</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Drivewear is generally presented as a daytime driving lens category and begins from a tinted state. That makes it a poor choice for night driving where maximum light transmission is typically preferred.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                For night discomfort, prioritize clear high-quality lenses with excellent AR performance and professional fitting first, then evaluate specialized aids only when clinically appropriate.
              </p>
              <div className="mt-3">
                <a className="inline-flex items-center text-sm font-medium text-accent hover:underline" href="https://drivewear.com" target="_blank" rel="noreferrer noopener">
                  Review Drivewear manufacturer site
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-3">
          {[
          { icon: MoonStar, title: "Start with clear optics", text: "Update prescription and verify centration before adding specialty products." },
          { icon: Shield, title: "Control reflections", text: "Premium AR and clean lens surfaces reduce unnecessary scatter from headlights." },
          { icon: Car, title: "Use driving aids selectively", text: "Use driving-specific clips where they match your route conditions and clinician advice." }].
          map((item) =>
          <div key={item.title} className="space-y-2">
              <item.icon className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Need a clinician-guided recommendation?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Bring your driving pattern (highway, rain, long commute) so lens choices can be matched to real conditions.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/patients#vision-tips">Back to Vision Tips</Link>
              </Button>
              <Button asChild>
                <Link to="/professionals/chemistrie-lens-system">
                  Chemistrie Lens System
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);

};

export default NightDrivingAidsPage;