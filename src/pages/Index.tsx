import Header from "@/components/Header";
import AccountRequestBanner from "@/components/AccountRequestBanner";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Features from "@/components/Features";
import About from "@/components/About";
import KnowledgePreview from "@/components/KnowledgePreview";
import ContactForm from "@/components/ContactForm";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import PublicSearchPanel from "@/components/PublicSearchPanel";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <AccountRequestBanner />
      <main id="main-content">
        <Hero />
        <section id="site-search" className="-mt-12 px-4 lg:px-8 scroll-mt-24">
          <div className="container mx-auto rounded-2xl border bg-card/90 p-6 shadow-soft backdrop-blur">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Intelligent Site Search</p>
            <h2 className="mb-2 text-2xl font-bold">Find anything instantly</h2>
            <p className="mb-4 text-sm text-muted-foreground">Search pages, products, knowledge base articles, forms, and anchored sections.</p>
            <PublicSearchPanel />
          </div>
        </section>
        <Products />
        <Features />
        <About />
        <KnowledgePreview />
        <ContactForm />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
