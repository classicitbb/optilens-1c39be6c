import EmailDeliveryHealthBanner from "@/components/admin/EmailDeliveryHealthBanner";
import DocStudioEmbed from "@/features/admin/doc-studio/DocStudioEmbed";

/**
 * Doc Studio — the brand-aware document generator ported from optilens-local
 * (emails, letterheads, signatures, pricelists, ship labels, statements,
 * billing docs). The established Studio template is mounted directly into this
 * page's DOM by DocStudioEmbed (no iframe), retaining its exact layout,
 * templates, theme, interactions, and handoff behavior while it is refactored
 * behind that stable visual contract.
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
