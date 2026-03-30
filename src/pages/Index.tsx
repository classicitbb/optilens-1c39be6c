import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import Products from "@/components/Products";
import Features from "@/components/Features";
import About from "@/components/About";
import KnowledgePreview from "@/components/KnowledgePreview";
import ContactForm from "@/components/ContactForm";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import AccountRequestBanner from "@/components/AccountRequestBanner";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <AccountRequestBanner />
      <main id="main-content">
        <Hero />

        {/* Intelligent Site Search */}
        <section id="site-search" className="px-4 py-10 lg:px-8 scroll-mt-24">
          <div className="container mx-auto rounded-2xl border border-border bg-card/90 p-6 shadow-soft backdrop-blur">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Intelligent Site Search</p>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Find anything instantly</h2>
            <p className="mb-4 text-sm text-muted-foreground">Search pages, products, knowledge base articles, forms, and anchored sections.</p>
            <PublicSearchPanel />
          </div>
        </section>

        <Products />
        <Features />
        <About />
        <KnowledgePreview />

        {/* Contact Section */}
        <section id="contact" className="py-16 sm:py-24 scroll-mt-24" aria-label="Contact us">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                Contact Our Team
              </h2>
              <p className="mb-8 text-base text-muted-foreground sm:text-lg">
                Have questions about our lens products? Fill out the form below and our optical
                experts will respond within 24 hours.
              </p>
            </div>
            <div className="mx-auto max-w-2xl">
              <ContactForm />
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
