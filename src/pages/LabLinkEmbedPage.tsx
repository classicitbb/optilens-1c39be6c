import { useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";

type LabLinkEmbedPageProps = {
  title: string;
  iframeTitle: string;
  src: string;
  canonicalPath: string;
};

const LabLinkEmbedPage = ({ title, iframeTitle, src, canonicalPath }: LabLinkEmbedPageProps) => {
  const [frameVersion, setFrameVersion] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={title}
        description={`${title} for Classic Visions optical professionals.`}
        canonicalPath={canonicalPath}
      />
      <Header />
      <main id="main-content" className="w-full pt-[68px] pb-1.5 sm:pt-[72px] sm:pb-2">
        <h1 className="sr-only">{title}</h1>
        <div className="mx-auto w-[min(100%_-_20px,1200px)] sm:w-[min(100%_-_32px,1200px)]">
          <div className="h-[calc(100vh_-_120px)] min-h-[600px] sm:h-[calc(100vh_-_140px)] sm:min-h-[700px]">
            <iframe
              key={frameVersion}
              title={iframeTitle}
              src={src}
              allow="clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-full w-full border-0 bg-white"
            />
          </div>
          <div className="flex justify-end gap-3 py-1 text-[11px] leading-none text-muted-foreground">
            <a href={src} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Open LabLink
            </a>
            <button
              type="button"
              onClick={() => setFrameVersion((version) => version + 1)}
              className="hover:text-foreground"
            >
              Reload frame
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LabLinkEmbedPage;
