import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

type CoatingArticleLayoutProps = {
  title: string;
  intro: string;
  sectionTitle: string;
  bullets: string[];
  tipsTitle?: string;
  tips?: string[];
};

const CoatingArticleLayout = ({ title, intro, sectionTitle, bullets, tipsTitle, tips }: CoatingArticleLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{intro}</p>

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">{sectionTitle}</h2>
            <ul className="mt-4 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {tips && tips.length > 0 && (
            <div className="mt-6 rounded-xl border border-border/80 bg-background p-6">
              <h2 className="text-lg font-semibold text-foreground">{tipsTitle ?? "Care tips"}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoatingArticleLayout;
