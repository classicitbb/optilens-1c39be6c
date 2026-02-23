import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useParams } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";
import { Skeleton } from "@/components/ui/skeleton";

const SLUG_MAP: Record<string, string> = {
  "privacy-policy": "privacy-policy",
  "terms": "terms-conditions",
  "return-policy": "return-policy",
  "disclaimer": "disclaimer",
  "cookie-policy": "cookie-policy",
};

const LegalPage = () => {
  const { slug = "" } = useParams();
  const dbSlug = SLUG_MAP[slug] || slug;
  const { data: article, isLoading } = useLegalPage(dbSlug);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : article ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-6">{article.title}</h1>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {article.content}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">This page is not yet available.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
