import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, HelpCircle, Layers, Droplets, Sun, Lightbulb } from "lucide-react";
import { useState, useMemo } from "react";
import { usePublicKnowledge, ContentArticle } from "@/hooks/useContentArticles";
import { Skeleton } from "@/components/ui/skeleton";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";
import BlogPostRenderer from "@/components/blog/BlogPostRenderer";

/** Convert a string to Sentence case – first letter upper, rest lower */
const toSentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/**
 * Sentence-case each segment around " - " (space-dash-space only)
 * e.g. "PROGRESSIVE - BEST" → "Progressive – Best"
 * but "Getting-Started" stays "Getting-started"
 */
const formatHeading = (text: string) => {
  // Only split on " - " with surrounding spaces
  const parts = text.split(" - ");
  if (parts.length > 1) {
    return parts.map((seg) => toSentenceCase(seg.trim())).join(" – ");
  }
  // No " - " delimiter: just sentence-case the whole string
  return toSentenceCase(text);
};

const ICON_MAP: Record<string, React.ElementType> = {
  "Lens Materials": Layers,
  "Lens Designs": Lightbulb,
  "Lens Coatings": Droplets,
  "Specialty Lenses": Sun,
};

const Knowledge = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: articles = [], isLoading } = usePublicKnowledge();

  const kbArticles = useMemo(() => articles.filter((a) => a.content_type === "knowledge"), [articles]);
  const faqArticles = useMemo(() => articles.filter((a) => a.content_type === "faq"), [articles]);

  const categories = useMemo(() => {
    const map = new Map<string, ContentArticle[]>();
    for (const a of kbArticles) {
      const key = a.category || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      icon: ICON_MAP[title] || BookOpen,
      articles: items,
    }));
  }, [kbArticles]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const lower = searchTerm.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(lower) ||
            a.content.toLowerCase().includes(lower)
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [categories, searchTerm]);

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return faqArticles;
    const lower = searchTerm.toLowerCase();
    return faqArticles.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.content.toLowerCase().includes(lower)
    );
  }, [faqArticles, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page header */}
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

          {isLoading ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Category cards */}
              <div className="mb-16 grid gap-8 lg:grid-cols-2">
                {filteredCategories.map((category, catIndex) => {
                  const hashId = category.title.toLowerCase().replace(/\s+/g, "-");
                  const Icon = category.icon;
                  return (
                    <Card
                      key={category.title}
                      id={hashId}
                      variant="default"
                      className="opacity-0 animate-fade-in scroll-mt-24 overflow-hidden"
                      style={{ animationDelay: `${catIndex * 100}ms` }}
                    >
                      <CardHeader className="pb-3">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent">
                          <Icon className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <CardTitle className="text-xl">{formatHeading(category.title)}</CardTitle>
                        <CardDescription>
                          {category.articles.length} article{category.articles.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Accordion type="single" collapsible className="w-full -mx-1">
                          {category.articles.map((article) => (
                            <AccordionItem
                              key={article.id}
                              value={article.id}
                              className="border-b border-border/50 last:border-b-0 px-1"
                            >
                              <AccordionTrigger className="text-left text-sm font-medium py-3.5 hover:no-underline hover:text-primary transition-colors gap-3">
                                {formatHeading(article.title)}
                              </AccordionTrigger>
                              <AccordionContent className="pb-5 pt-1">
                                <div className="rounded-lg bg-muted/30 p-4">
                                  <BlogPostRenderer content={article.content} className="text-sm" />
                                </div>
                                <div className="mt-3">
                                  <HelpFeedbackButtons articleId={article.id} pageSlug="knowledge" />
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredCategories.length === 0 && filteredFaqs.length === 0 && searchTerm && (
                <p className="text-center text-muted-foreground py-12">
                  No articles match "{searchTerm}"
                </p>
              )}

              {/* FAQs */}
              {filteredFaqs.length > 0 && (
                <div className="mx-auto max-w-3xl">
                  <div className="mb-8 text-center">
                    <div className="mb-2 inline-flex items-center gap-2 text-accent">
                      <HelpCircle className="h-5 w-5" />
                      <span className="text-sm font-semibold uppercase tracking-wider">FAQ</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                  </div>

                  <Card variant="default" className="overflow-hidden">
                    <CardContent className="p-6">
                      <Accordion type="single" collapsible className="w-full">
                        {filteredFaqs.map((faq) => (
                          <AccordionItem
                            key={faq.id}
                            value={faq.id}
                            className="border-b border-border/50 last:border-b-0"
                          >
                            <AccordionTrigger className="text-left font-medium py-4 hover:no-underline hover:text-primary transition-colors gap-3">
                              {formatHeading(faq.title)}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5 pt-1">
                              <div className="rounded-lg bg-muted/30 p-4">
                                <BlogPostRenderer content={faq.content} className="text-sm" />
                              </div>
                              <div className="mt-3">
                                <HelpFeedbackButtons articleId={faq.id} pageSlug="knowledge" />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
