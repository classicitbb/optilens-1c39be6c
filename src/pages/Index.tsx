import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Features from "@/components/Features";
import KnowledgePreview from "@/components/KnowledgePreview";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Products />
        <Features />
        <KnowledgePreview />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
