import Header from "@/components/Header";
import Footer from "@/components/Footer";

type LensResourcePageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const LensResourcePage = ({ eyebrow, title, description }: LensResourcePageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LensResourcePage;
