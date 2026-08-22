import { ArrowDown } from "lucide-react";
import { Link } from "react-router";
import About from "@/components/About";
import BlogCarousel from "@/components/BlogCarousel";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Products from "@/components/Products";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";

const AboutUsPage = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="About Classic Visions | Optical Wholesale Partner"
      description="Learn about Classic Visions, our product lines, the service standards behind our work, and the insights we share with optical professionals."
      canonicalPath="/about-us"
    />
    <Header />
    <main id="main-content">
      <section className="relative overflow-hidden border-b border-border bg-muted/30 py-20 sm:py-28">
        <div className="container relative mx-auto max-w-4xl px-4 text-center lg:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">About Classic Visions</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Built for the people behind better vision.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We bring lens expertise, dependable service, and practical tools together so optical professionals can serve every patient with confidence.
          </p>
          <Button asChild className="mt-8">
            <Link to="#products">
              Explore what we do
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <Products />
      <Features sectionId="why-choose" />
      <About sectionId="our-story" heading="Our Story" />
      <BlogCarousel sectionId="insights" />
    </main>
    <Footer />
  </div>
);

export default AboutUsPage;
