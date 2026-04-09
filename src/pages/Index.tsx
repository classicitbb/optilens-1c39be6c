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
import Seo from "@/components/seo/Seo";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Classic Visions",
  url: "https://www.classicvisions.net",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.classicvisions.net/knowledge?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Classic Visions",
  url: "https://www.classicvisions.net",
  logo: "https://www.classicvisions.net/favicon.ico",
  telephone: "+12464334928",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Uplands Factory, Four Roads",
    addressLocality: "Saint George",
    postalCode: "BB20031",
    addressCountry: "BB",
  },
  sameAs: [
    "https://www.facebook.com/classicvisionscb",
    "https://www.instagram.com/classicvisionscb",
    "https://www.linkedin.com/company/classic-visions/",
  ],
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="Classic Visions | Wholesale Optical Supplier — Barbados"
        description="Your trusted wholesale partner for premium prescription lenses. Quality, precision, and reliable fulfillment for optical professionals."
        canonicalPath="/"
        jsonLd={[websiteJsonLd, organizationJsonLd]}
      />
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
