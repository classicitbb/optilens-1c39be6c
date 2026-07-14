/**
 * Doc Studio — the brand-aware document generator ported from optilens-local
 * (emails, letterheads, signatures, pricelists, ship labels, statements,
 * billing docs). The studio itself is the static app at public/ds/studio.html,
 * embedded same-origin exactly as optilens-local embedded it; its /api/* calls
 * are redirected to the docstudio-api edge function by public/ds/cloud-bridge.js.
 */
const DocStudioPage = () => (
  <div className="-m-1 h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-border/70 bg-background">
    <iframe
      src="/ds/studio.html?embedded=1"
      title="Doc Studio"
      allow="clipboard-write"
      className="h-full w-full border-0"
    />
  </div>
);

export default DocStudioPage;
