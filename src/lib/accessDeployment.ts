import type { Contact } from "@/hooks/useContacts";

export type AccessDeploymentCustomerOption = {
  id: number;
  name: string;
  account_number: string | null;
  email: string | null;
  contact_id: string | null;
  innovations_customer_id: number | null;
};

export const resolveCompatibleCustomerAccounts = (
  contact: Contact | null,
  customers: AccessDeploymentCustomerOption[],
) => {
  if (!contact) return [];
  const matches = customers.filter((customer) =>
    customer.contact_id === contact.id ||
    (contact.parent_id !== null && customer.contact_id === contact.parent_id) ||
    customer.id === contact.linked_customer_id ||
    (contact.innovations_parent_customer_id !== null && customer.innovations_customer_id === contact.innovations_parent_customer_id)
  );

  return Array.from(new Map(matches.map((customer) => [customer.id, customer])).values());
};
