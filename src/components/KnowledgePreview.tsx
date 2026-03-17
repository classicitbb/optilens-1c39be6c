import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Lightbulb, HelpCircle, ArrowRight } from "lucide-react";

const articles = [
  {
    icon: BookOpen,
    title: "Lens Materials Guide",
    description: "Understanding CR-39, polycarbonate, and high-index materials for optimal patient outcomes.",
    category: "Materials",
  },
  {
    icon: Lightbulb,
    title: "Progressive Lens Design",
    description: "A comprehensive overview of progressive lens technology and fitting considerations.",
    category: "Technology",
  },
  {
    icon: HelpCircle,
    title: "Coating Options",
    description: "Anti-reflective, blue light, and photochromic coatings explained for your customers.",
    category: "Coatings",
  },
];

const KnowledgePreview = () => {
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

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {articles.map((article, index) => (
            <Card 
              key={article.title}
              variant="feature"
              className="group cursor-pointer opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-2 inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  {article.category}
                </div>
                <CardTitle className="flex items-center gap-2 text-base group-hover:text-accent transition-colors sm:text-lg">
                  <article.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {article.title}
                </CardTitle>
                <CardDescription>{article.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  to="/knowledge" 
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Read about {article.title}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KnowledgePreview;
