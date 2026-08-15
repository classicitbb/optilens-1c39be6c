import EmailDeliveryHealthBanner from "@/components/admin/EmailDeliveryHealthBanner";
import { useSearchParams } from "react-router";

/**
 * Doc Studio — the brand-aware document generator ported from optilens-local
 * (emails, letterheads, signatures, pricelists, ship labels, statements,
 * billing docs). The studio itself is the static app at public/ds/studio.html,
 * embedded same-origin exactly as optilens-local embedded it; its /api/* calls
 * are redirected to the docstudio-api edge function by public/ds/cloud-bridge.js.
 */
const DocStudioPage = () => {
  const [searchParams] = useSearchParams();
  const staffInvite = searchParams.get("staffInvite");
  const billingDocument = searchParams.get("billingDocument");
  // The parent route carries only an opaque handoff id. The password itself is
  // held in tab-scoped session storage until the same-origin iframe consumes it.
  const src = `/ds/studio.html?embedded=1${staffInvite ? `&staffInvite=${encodeURIComponent(staffInvite)}` : ""}${billingDocument ? `&billingDocument=${encodeURIComponent(billingDocument)}` : ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <EmailDeliveryHealthBanner />
      <iframe
        src={src}
        title="Doc Studio"
        allow="clipboard-write"
        className="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
};

export default DocStudioPage;
