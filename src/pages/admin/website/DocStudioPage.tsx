import EmailDeliveryHealthBanner from "@/components/admin/EmailDeliveryHealthBanner";
import DocStudioEmbed from "@/features/admin/doc-studio/DocStudioEmbed";

/**
 * Doc Studio — the brand-aware document generator ported from optilens-local
 * (emails, letterheads, signatures, pricelists, ship labels, statements,
 * billing docs). The studio is mounted natively in this page by DocStudioEmbed
 * (no iframe); its /api/* calls are redirected to the docstudio-api edge
 * function by public/ds/cloud-bridge.js. Handoff params (staffInvite,
 * billingDocument) stay on this route's URL, where the studio logic reads
 * them from location.search.
 */
const DocStudioPage = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <EmailDeliveryHealthBanner />
      <DocStudioEmbed />
    </div>
  );
};

export default DocStudioPage;
