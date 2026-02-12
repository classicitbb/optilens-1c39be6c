import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Lightbulb, HelpCircle, Layers, Droplets, Sun } from "lucide-react";
import { useState } from "react";

const categories = [
  {
    icon: Layers,
    title: "Lens Materials",
    articles: [
      {
        title: "CR-39 Plastic Lenses",
        content: "CR-39 (Columbia Resin #39) is the most common optical plastic material, offering excellent optical clarity at an affordable price. With a refractive index of 1.50, it provides good scratch resistance and is easily tinted. Best suited for low to moderate prescriptions where thickness is not a primary concern.",
      },
      {
        title: "Polycarbonate Lenses",
        content: "Polycarbonate lenses (index 1.59) are the go-to choice for safety eyewear and children's glasses due to their exceptional impact resistance. They're lightweight and provide 100% UV protection inherently. Ideal for sports, safety applications, and active lifestyles.",
      },
      {
        title: "High-Index Materials",
        content: "High-index materials (1.60, 1.67, 1.74) allow for thinner, lighter lenses for higher prescriptions. The higher the index, the thinner the lens. These materials are especially beneficial for prescriptions over +/- 4.00 diopters where standard materials would result in thick, heavy lenses.",
      },
    ],
  },
  {
    icon: Lightbulb,
    title: "Lens Designs",
    articles: [
      {
        title: "Single Vision Lenses",
        content: "Single vision lenses provide one prescription power throughout the entire lens. They're used for distance vision correction (myopia), near vision correction (hyperopia/presbyopia), or astigmatism correction. The simplest and most cost-effective lens design.",
      },
      {
        title: "Progressive Lenses",
        content: "Progressive lenses offer seamless vision correction for distance, intermediate, and near viewing without visible lines. The corridor design allows natural transition between zones. Digital/FreeForm progressives provide wider fields of vision and reduced peripheral distortion.",
      },
      {
        title: "Bifocal & Trifocal Lenses",
        content: "Bifocals feature two distinct viewing zones (distance and near) separated by a visible line. Trifocals add an intermediate zone for computer work. While progressives are often preferred for aesthetics, lined multifocals offer wider reading areas and can be easier to adapt to.",
      },
    ],
  },
  {
    icon: Droplets,
    title: "Lens Coatings",
    articles: [
      {
        title: "Anti-Reflective Coatings",
        content: "AR coatings reduce glare and reflections, improving visual clarity and the cosmetic appearance of lenses. Premium AR coatings include hydrophobic and oleophobic properties for easier cleaning. Essential for night driving, computer use, and high-index lenses.",
      },
      {
        title: "Scratch-Resistant Coatings",
        content: "While no lens is scratch-proof, scratch-resistant coatings significantly improve durability. Applied during manufacturing, these hard coatings protect against everyday wear and tear. Recommended for all lens materials, especially softer plastics.",
      },
      {
        title: "Blue Light Filtering",
        content: "Blue light coatings filter high-energy visible (HEV) blue light emitted from digital screens. They can reduce eye strain during extended screen time and may help with sleep patterns by reducing blue light exposure before bedtime.",
      },
    ],
  },
  {
    icon: Sun,
    title: "Specialty Lenses",
    articles: [
      {
        title: "Photochromic Lenses",
        content: "Photochromic lenses (like Transitions) automatically darken in sunlight and return to clear indoors. They provide convenient UV protection without needing separate sunglasses. Modern formulations activate and fade faster than previous generations.",
      },
      {
        title: "Polarized Lenses",
        content: "Polarized lenses contain a special filter that blocks horizontal glare, making them ideal for driving, fishing, and water sports. They reduce eye strain in bright conditions and enhance visual comfort and clarity outdoors.",
      },
      {
        title: "Occupational Lenses",
        content: "Occupational or task-specific lenses are designed for particular activities like computer work, golf, or music reading. They optimize the lens design for specific working distances and visual tasks, improving comfort and productivity.",
      },
    ],
  },
];

const faqs = [
  {
    question: "What's the difference between surfaced and finished lenses?",
    answer: "Finished lenses are pre-made stock lenses with set prescriptions, ready to be cut and fit into frames. Surfaced lenses are custom-made by grinding the prescription onto a lens blank, allowing for any prescription and additional customization options.",
  },
  {
    question: "How do I choose the right lens material?",
    answer: "Consider the prescription strength, patient lifestyle, and frame selection. Low prescriptions work well with CR-39. Higher prescriptions benefit from high-index materials. Active patients and children should consider polycarbonate for safety.",
  },
  {
    question: "What are the minimum order quantities?",
    answer: "Minimum orders vary by product type. Finished stock lenses have no minimum. Surfaced lenses are typically ordered per job. Contact our sales team for bulk pricing on larger orders.",
  },
  {
    question: "How long does production take?",
    answer: "Finished lenses ship same-day for orders before 2 PM. Surfaced lenses typically take 3-5 business days. Rush processing is available for an additional fee.",
  },
];

const Knowledge = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <BookOpen className="h-4 w-4" />
              Learning Resources
            </div>
            <h1 className="mb-4 text-4xl font-bold text-foreground">Knowledge Base</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to know about optical lenses, materials, coatings, and more.
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mb-12 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 text-base"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="mb-16 grid gap-8 lg:grid-cols-2">
            {categories.map((category, catIndex) => {
              const hashId = category.title.toLowerCase().replace(/\s+/g, "-");
              return (
              <Card 
                key={category.title}
                id={hashId}
                variant="default"
                className="opacity-0 animate-fade-in scroll-mt-24"
                style={{ animationDelay: `${catIndex * 100}ms` }}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent">
                    <category.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                  <CardDescription>
                    {category.articles.length} articles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.articles
                      .filter((article) =>
                        searchTerm === "" ||
                        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        article.content.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((article, articleIndex) => (
                        <AccordionItem key={articleIndex} value={`${catIndex}-${articleIndex}`}>
                          <AccordionTrigger className="text-left text-sm font-medium">
                            {article.title}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {article.content}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                </CardContent>
              </Card>
              );
            })}
          </div>

          {/* FAQs */}
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-2 inline-flex items-center gap-2 text-accent">
                <HelpCircle className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">FAQ</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            </div>

            <Card variant="default">
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
