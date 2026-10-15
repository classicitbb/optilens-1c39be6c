import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import StatementsSection, { type StaffStatementsTarget } from "@/components/account/sections/StatementsSection";
import { InquireHandlerContext } from "@/components/account/InquireButton";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";

/**
 * Staff view of a customer's statements. As on the orders panel, the life-buoy
 * icons open the shared create-ticket form for the selected contact, since the
 * admin has no customer support assistant to open.
 */
const CustomerStatementsPanel = ({ target, contactId }: { target: StaffStatementsTarget; contactId: string | null }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{ title: string; description: string } | null>(null);

  return (
    <InquireHandlerContext.Provider value={(title, description) => setDraft({ title, description })}>
      <StatementsSection staffTarget={target} />
      <CreateHelpdeskTicketDialog
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        initialValues={{ title: draft?.title, description: draft?.description, contactId: contactId ?? undefined, notifyContacts: true }}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["website-portals-customer-detail"] })}
      />
    </InquireHandlerContext.Provider>
  );
};

export default CustomerStatementsPanel;
