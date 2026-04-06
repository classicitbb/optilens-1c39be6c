import Header from "@/components/Header";
import Hero from "@/components/Hero";
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

        <Products />
        <Features />
        <About />
        <KnowledgePreview />

        {/* Contact Section */}
        <ContactForm />

        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
