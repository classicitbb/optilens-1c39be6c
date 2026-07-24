import { Sparkles } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { LensAssistantForm } from "@/features/lens-assistant/LensAssistantForm";

const LensAssistantPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Controlled Lens Selection Assistant | Classic Visions" description="Enter prescription, frame and lifestyle details to see approved Classic Visions catalogue options." canonicalPath="/lens-assistant" />
      <Header />
      <main id="main-content" className="pt-[68px] sm:pt-[72px]">
        <section className="border-b bg-[linear-gradient(135deg,#0b1e35,#0d5363)] text-white">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Controlled recommendations</Badge>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Find a suitable lens without guessing.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">
              Product eligibility, prescription ranges and prices come from approved Classic Visions data. AI does not invent them.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <LensAssistantForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LensAssistantPage;
