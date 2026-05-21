import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";

type LabLinkEmbedPageProps = {
  title: string;
  iframeTitle: string;
  src: string;
  canonicalPath: string;
};

const LabLinkEmbedPage = ({ title, iframeTitle, src, canonicalPath }: LabLinkEmbedPageProps) => (
  <div className="min-h-screen bg-background">
    <Seo
      title={title}
      description={`${title} for Classic Visions optical professionals.`}
      canonicalPath={canonicalPath}
    />
    <Header />
    <main id="main-content" className="w-full pt-20 pb-6 sm:pt-24 sm:pb-8">
      <h1 className="sr-only">{title}</h1>
      <div className="mx-auto h-[calc(100vh_-_140px)] min-h-[600px] w-[min(100%_-_20px,1200px)] sm:h-[calc(100vh_-_180px)] sm:min-h-[700px] sm:w-[min(100%_-_32px,1200px)]">
        <iframe
          title={iframeTitle}
          src={src}
          allow="clipboard-read; clipboard-write"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-full w-full border-0 bg-white"
        />
      </div>
    </main>
    <Footer />
  </div>
);

export default LabLinkEmbedPage;
