import { useState } from "react";
import { useSearchParams } from "react-router";
import { AlertTriangle, FileText } from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { useRxDraft } from "@/features/lens-assistant/api";

type LabLinkEmbedPageProps = {
  title: string;
  iframeTitle: string;
  src: string;
  canonicalPath: string;
};

const LabLinkEmbedPage = ({ title, iframeTitle, src, canonicalPath }: LabLinkEmbedPageProps) => {
  const [frameVersion, setFrameVersion] = useState(0);
  const [searchParams] = useSearchParams();
  const draftId = canonicalPath === "/rx-order" ? searchParams.get("draft") ?? undefined : undefined;
  const { data: draft } = useRxDraft(draftId);

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
        <div className="mx-auto w-[min(100%_-_20px,1440px)] sm:w-[min(100%_-_32px,1440px)]">
          <div className={draft ? "grid gap-3 lg:grid-cols-[330px_minmax(0,1fr)]" : undefined}>
            {draft ? (
              <aside className="rounded-xl border bg-card p-4 lg:h-[calc(100vh_-_140px)] lg:min-h-[700px] lg:overflow-y-auto" aria-label="Saved Rx draft summary">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span><div><h2 className="font-semibold">{draft.name}</h2><Badge variant="outline" className="mt-1 capitalize">{draft.status.replace(/_/g, " ")}</Badge></div></div>
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mb-1 h-4 w-4" />This draft has not been submitted. Use the information below to complete the final order in LabLink.</div>
                <div className="mt-4 space-y-4 text-sm">
                  <DraftEye label="Right eye (OD)" eye={draft.input_payload.right} />
                  <DraftEye label="Left eye (OS)" eye={draft.input_payload.left} />
                  <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Frame</span><p className="mt-1 font-medium capitalize">{draft.input_payload.frameType.replace(/-/g, " ") || "Not entered"}</p><p className="text-xs text-muted-foreground">A {draft.input_payload.frameA ?? "—"} · B {draft.input_payload.frameB ?? "—"} · DBL {draft.input_payload.frameDbl ?? "—"}</p></div>
                  <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Approved options</span><div className="mt-2 space-y-2">{(draft.recommendation_snapshot?.recommendations ?? []).map((option) => <div key={option.productId} className="rounded-lg bg-muted/50 p-3"><p className="font-semibold capitalize">{option.tier} · {option.productName}</p><p className="mt-1 text-xs text-muted-foreground">{option.material || "Material to confirm"} · {option.priceBbd != null ? `BBD $${Number(option.priceBbd).toFixed(2)}` : "Price not assigned"}</p></div>)}</div></div>
                </div>
              </aside>
            ) : null}
          <div className="h-[calc(100vh_-_120px)] min-h-[600px] sm:h-[calc(100vh_-_140px)] sm:min-h-[700px]">
            <iframe
              key={frameVersion}
              title={iframeTitle}
              src={src}
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-full w-full border-0 bg-white"
            />
          </div>
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

const DraftEye = ({ label, eye }: { label: string; eye: { sphere: number | null; cylinder: number | null; axis: number | null; add: number | null; prism: number | null; prismBase: string } }) => (
  <div><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><p className="mt-1 font-medium">SPH {eye.sphere ?? "—"} · CYL {eye.cylinder ?? "—"} · AXIS {eye.axis ?? "—"}</p><p className="text-xs text-muted-foreground">ADD {eye.add ?? "—"} · Prism {eye.prism ?? "—"} {eye.prismBase}</p></div>
);

export default LabLinkEmbedPage;
