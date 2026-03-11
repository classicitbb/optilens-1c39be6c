import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, HelpCircle, Layers, Droplets, Sun, Lightbulb, Filter, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { usePublicKnowledge, ContentArticle } from "@/hooks/useContentArticles";
import { Skeleton } from "@/components/ui/skeleton";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";
import BlogPostRenderer from "@/components/blog/BlogPostRenderer";
import { Button } from "@/components/ui/button";

const toSentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const formatHeading = (text: string) => {
  const parts = text.split(" - ");
  if (parts.length > 1) return parts.map((seg) => toSentenceCase(seg.trim())).join(" – ");
  return toSentenceCase(text);
};

const ICON_MAP: Record<string, React.ElementType> = {
  "Lens Materials": Layers,
  "Lens Designs": Lightbulb,
  "Lens Coatings": Droplets,
  "Specialty Lenses": Sun,
  FAQ: HelpCircle,
};

const Knowledge = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { data: articles = [], isLoading } = usePublicKnowledge();

  const kbArticles = useMemo(() => articles.filter((a) => a.content_type === "knowledge"), [articles]);
  const faqArticles = useMemo(() => articles.filter((a) => a.content_type === "faq"), [articles]);

  const categories = useMemo(() => {
    const map = new Map<string, ContentArticle[]>();
    for (const article of kbArticles) {
      const key = article.category || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(article);
    }

    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      icon: ICON_MAP[title] || BookOpen,
      articles: items,
    }));
  }, [kbArticles]);

  const filteredCategories = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();

    return categories
      .filter((category) => activeCategory === "all" || category.title === activeCategory)
      .map((category) => ({
        ...category,
        articles: category.articles.filter((article) => {
          if (!lower) return true;
          return (
            article.title.toLowerCase().includes(lower) ||
            article.content.toLowerCase().includes(lower) ||
            (article.description || "").toLowerCase().includes(lower)
          );
        }),
      }))
      .filter((category) => category.articles.length > 0);
  }, [activeCategory, categories, searchTerm]);

  const filteredFaqs = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    return faqArticles.filter((article) => {
      const categoryMatch = activeCategory === "all" || activeCategory === "FAQ";
      if (!categoryMatch) return false;
      if (!lower) return true;
      return (
        article.title.toLowerCase().includes(lower) ||
        article.content.toLowerCase().includes(lower) ||
        (article.description || "").toLowerCase().includes(lower)
      );
    });
  }, [activeCategory, faqArticles, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <BookOpen className="h-4 w-4" />
              Learning Resources
            </div>
            <h1 className="mb-4 text-4xl font-bold text-foreground">Knowledge Base</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to know about optical lenses, materials, coatings, and more.
            </p>
          </div>

          <div className="mx-auto mb-10 max-w-3xl rounded-2xl border bg-card p-4 shadow-soft">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Sparkles className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <Input
                placeholder="Search by title, topic, FAQ, or article content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 pr-12 text-base"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
              <Skeleton className="h-72 rounded-xl" />
              <div className="grid gap-8 lg:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
              <aside className="h-fit rounded-xl border bg-card p-4 shadow-soft lg:sticky lg:top-24">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter className="h-4 w-4" />
                  Filter Categories
                </div>
                <div className="space-y-2">
                  <Button variant={activeCategory === "all" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveCategory("all")}>All Categories</Button>
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Button
                        key={category.title}
                        variant={activeCategory === category.title ? "default" : "outline"}
                        className="w-full justify-between"
                        onClick={() => setActiveCategory(category.title)}
                      >
                        <span className="flex items-center gap-2 truncate"><Icon className="h-4 w-4" />{formatHeading(category.title)}</span>
                        <span className="text-xs text-muted-foreground">{category.articles.length}</span>
                      </Button>
                    );
                  })}
                  <Button variant={activeCategory === "FAQ" ? "default" : "outline"} className="w-full justify-between" onClick={() => setActiveCategory("FAQ")}>
                    <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />FAQ</span>
                    <span className="text-xs text-muted-foreground">{faqArticles.length}</span>
                  </Button>
                </div>
              </aside>

              <section>
                <div className="mb-14 grid gap-8 xl:grid-cols-2">
                  {filteredCategories.map((category, catIndex) => {
                    const hashId = category.title.toLowerCase().replace(/\s+/g, "-");
                    const Icon = category.icon;
                    return (
                      <Card key={category.title} id={hashId} variant="default" className="opacity-0 animate-fade-in scroll-mt-24 overflow-hidden" style={{ animationDelay: `${catIndex * 80}ms` }}>
                        <CardHeader className="pb-3">
                          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent">
                            <Icon className="h-6 w-6 text-accent-foreground" />
                          </div>
                          <CardTitle className="text-xl">{formatHeading(category.title)}</CardTitle>
                          <CardDescription>{category.articles.length} article{category.articles.length !== 1 ? "s" : ""}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Accordion type="single" collapsible className="w-full -mx-1">
                            {category.articles.map((article) => (
                              <AccordionItem key={article.id} value={article.id} className="border-b border-border/50 last:border-b-0 px-1">
                                <AccordionTrigger className="gap-3 py-3.5 text-left text-sm font-medium transition-colors hover:text-primary hover:no-underline">
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

                {filteredFaqs.length > 0 && (
                  <div className="mx-auto max-w-4xl rounded-2xl border bg-card p-6 shadow-soft">
                    <div className="mb-6 text-center">
                      <div className="mb-2 inline-flex items-center gap-2 text-accent">
                        <HelpCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold uppercase tracking-wider">FAQ Group</span>
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      {filteredFaqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id} className="border-b border-border/50 last:border-b-0">
                          <AccordionTrigger className="gap-3 py-4 text-left font-medium transition-colors hover:text-primary hover:no-underline">
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
                  </div>
                )}

                {filteredCategories.length === 0 && filteredFaqs.length === 0 && (
                  <p className="py-12 text-center text-muted-foreground">No articles match “{searchTerm || activeCategory}”.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
