import EmailDeliveryHealthBanner from "@/components/admin/EmailDeliveryHealthBanner";

/**
 * Doc Studio — the brand-aware document generator ported from optilens-local
 * (emails, letterheads, signatures, pricelists, ship labels, statements,
 * billing docs). The studio itself is the static app at public/ds/studio.html,
 * embedded same-origin exactly as optilens-local embedded it; its /api/* calls
 * are redirected to the docstudio-api edge function by public/ds/cloud-bridge.js.
 */
const DocStudioPage = () => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <EmailDeliveryHealthBanner />
    <iframe
      src="/ds/studio.html?embedded=1"
      title="Doc Studio"
      allow="clipboard-write"
      className="min-h-0 w-full flex-1 border-0"
    />
  </div>
);

export default DocStudioPage;
