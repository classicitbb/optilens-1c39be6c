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

const isHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

const RichContent = ({ content }: { content: string }) => {
  if (isHtml(content)) {
    return (
      <div
        className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1 [&_p]:leading-relaxed [&_ul]:pl-4 [&_ul]:my-1 [&_ul]:list-disc [&_ol]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_li]:my-0.5 [&_li]:leading-relaxed [&_li]:marker:text-primary [&_a]:text-primary [&_a]:underline [&_br]:leading-3"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <span>{content}</span>;
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

  // Group KB articles by category
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
              {/* Categories Grid */}
              <div className="mb-16 grid gap-8 lg:grid-cols-2">
                {filteredCategories.map((category, catIndex) => {
                  const hashId = category.title.toLowerCase().replace(/\s+/g, "-");
                  const Icon = category.icon;
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
                          <Icon className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <CardTitle className="text-xl">{category.title}</CardTitle>
                        <CardDescription>
                          {category.articles.length} article{category.articles.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {category.articles.map((article, articleIndex) => (
                            <AccordionItem key={article.id} value={article.id}>
                              <AccordionTrigger className="text-left text-sm font-medium">
                                {article.title}
                              </AccordionTrigger>
                              <AccordionContent className="text-sm text-muted-foreground space-y-3">
                                <RichContent content={article.content} />
                                <HelpFeedbackButtons articleId={article.id} pageSlug="knowledge" />
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

                  <Card variant="default">
                    <CardContent className="p-6">
                      <Accordion type="single" collapsible className="w-full">
                        {filteredFaqs.map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-left font-medium">
                              {faq.title}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-3">
                              <RichContent content={faq.content} />
                              <HelpFeedbackButtons articleId={faq.id} pageSlug="knowledge" />
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
