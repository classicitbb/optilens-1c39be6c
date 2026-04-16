import AdminContentEditLink from "@/components/admin/AdminContentEditLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { buildPublicHelpCenterTree, toKnowledgeArticlePath } from "@/lib/helpCenter";
import { ArrowRight, BookOpen } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";

const KnowledgePreview = () => {
  const { data: articles = [], isLoading } = usePublicKnowledge();

  const featuredArticles = useMemo(() => {
    const tree = buildPublicHelpCenterTree(articles);
    return tree.nodes
      .filter((node) => node.kind === "article" && node.source === "cms")
      .slice(0, 3);
  }, [articles]);

  return (
    <section className="bg-background py-16 sm:py-24" aria-label="Knowledge base preview">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 text-center sm:mb-16 md:flex-row md:text-left">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Knowledge Base
            </h2>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Resources and guides to help you serve your customers better.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/knowledge">
              View All Articles
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <Card
                key={article.id}
                variant="feature"
                className="group opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      {article.categoryId}
                    </div>
                    <AdminContentEditLink
                      mode="article"
                      articleId={article.id}
                      contentType={article.categoryId === "faq" ? "faq" : "knowledge"}
                      className="h-7 rounded-full px-2 text-[11px]"
                    />
                  </div>
                  <CardTitle className="flex items-center gap-2 text-base group-hover:text-accent transition-colors sm:text-lg">
                    <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {article.title}
                  </CardTitle>
                  <CardDescription>{article.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    to={toKnowledgeArticlePath(article.slug)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    Read article
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default KnowledgePreview;
