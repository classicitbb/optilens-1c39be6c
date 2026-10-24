import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import MyOrdersSection, { type StaffOrdersTarget } from "@/components/account/sections/MyOrdersSection";
import { InquireHandlerContext } from "@/components/account/InquireButton";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";

/**
 * Staff view of a customer's "My orders" page. The life-buoy icons open the
 * shared create-ticket form, prefilled for the selected contact; email defaults on.
 */
const CustomerOrdersPanel = ({ target, contactId }: { target: StaffOrdersTarget; contactId: string | null }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{ title: string; description: string } | null>(null);

  return (
    <InquireHandlerContext.Provider value={(title, description) => setDraft({ title, description })}>
      <MyOrdersSection staffTarget={target} />
      <CreateHelpdeskTicketDialog
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        initialValues={{ title: draft?.title, description: draft?.description, contactId: contactId ?? undefined, notifyContacts: true }}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["website-portals-customer-detail"] })}
      />
    </InquireHandlerContext.Provider>
  );
};

export default CustomerOrdersPanel;
