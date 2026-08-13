export type CopilotCustomer = {
  id: number;
  name: string;
  account_number: string | null;
  email: string | null;
  contact_id: string | null;
  innovations_customer_id: number | null;
};

export type CopilotPersonContact = {
  id: string;
  name: string;
  email: string | null;
  parent_id: string | null;
  linked_customer_id: number | null;
  innovations_parent_customer_id: number | null;
  is_company: boolean;
  is_archived: boolean;
};

export type CopilotMembership = {
  customer_id: number;
  status: string;
};

export type PortalEmailRule = {
  templateKey: string;
  templateName: string;
  subjectPattern: string;
};

export type PlannedCopilotAction = {
  actionType: "send_portal_invite" | "create_followup_task";
  riskLevel: 2 | 4;
  status: "pending_approval";
  customerId: number;
  contactId: string | null;
  customerName: string;
  accountNumber: string | null;
  title: string;
  summary: string;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  body?: string;
  templateKey?: string;
  templateName?: string;
  taskContent?: string;
};

export type ErpPortalRolloutPlan = {
  actions: PlannedCopilotAction[];
  counts: {
    erpCustomers: number;
    alreadyActive: number;
    invitationsReady: number;
    followUpsNeeded: number;
  };
};

export const DEFAULT_PORTAL_EMAIL_RULE: PortalEmailRule = {
  templateKey: "builtin:erp-portal-access-v1",
  templateName: "ERP Portal Access v1",
  subjectPattern: "Your Classic Visions portal access — {{customer_name}}",
};

const clean = (value: string | null | undefined) => value?.trim() ?? "";
const normalizeEmail = (value: string | null | undefined) => clean(value).toLowerCase();
const usableEmail = (value: string | null | undefined) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));

export const isErpPortalRolloutCommand = (command: string) => {
  const normalized = command.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (!normalized) return false;
  const mentionsPortal = normalized.includes("portal");
  const mentionsErp = normalized.includes("erp") || normalized.includes("innovations");
  const asksForRollout = /(roll out|rollout|onboard|invite|invitation|access)/.test(normalized);
  return mentionsPortal && mentionsErp && asksForRollout;
};

const belongsToCustomer = (contact: CopilotPersonContact, customer: CopilotCustomer) =>
  contact.linked_customer_id === customer.id ||
  (!!customer.contact_id && contact.parent_id === customer.contact_id) ||
  (!!customer.innovations_customer_id && contact.innovations_parent_customer_id === customer.innovations_customer_id);

const renderSubject = (pattern: string, customerName: string) =>
  pattern.replaceAll("{{customer_name}}", customerName).replaceAll("{customer}", customerName);

const emailBody = (recipientName: string, customerName: string) =>
  `Hi ${recipientName},\n\nClassic Visions has prepared portal access for ${customerName}. ` +
  "After this action is approved, you will receive a secure link to set up your password and sign in.\n\n" +
  "If you were not expecting this invitation, contact Classic Visions before continuing.";

const followUp = (
  customer: CopilotCustomer,
  contactId: string | null,
  reason: string,
): PlannedCopilotAction => ({
  actionType: "create_followup_task",
  riskLevel: 2,
  status: "pending_approval",
  customerId: customer.id,
  contactId,
  customerName: customer.name,
  accountNumber: customer.account_number,
  title: `Resolve portal rollout details for ${customer.name}`,
  summary: reason,
  taskContent: `ERP portal rollout follow-up for ${customer.name}${customer.account_number ? ` (${customer.account_number})` : ""}: ${reason}`,
});

export const buildErpPortalRolloutPlan = (
  customers: CopilotCustomer[],
  contacts: CopilotPersonContact[],
  memberships: CopilotMembership[],
  emailRule: PortalEmailRule = DEFAULT_PORTAL_EMAIL_RULE,
): ErpPortalRolloutPlan => {
  const erpCustomers = customers.filter((entry) => entry.innovations_customer_id != null);
  const activeCustomerIds = new Set(
    memberships.filter((membership) => membership.status === "active").map((membership) => membership.customer_id),
  );
  const actions: PlannedCopilotAction[] = [];
  let alreadyActive = 0;

  for (const customer of erpCustomers) {
    if (activeCustomerIds.has(customer.id)) {
      alreadyActive += 1;
      continue;
    }

    const people = contacts.filter((contact) =>
      !contact.is_company && !contact.is_archived && belongsToCustomer(contact, customer),
    );
    const peopleWithEmail = people.filter((contact) => usableEmail(contact.email));
    const customerEmail = normalizeEmail(customer.email);
    const exactEmailMatches = customerEmail
      ? peopleWithEmail.filter((contact) => normalizeEmail(contact.email) === customerEmail)
      : [];

    const domainOf = (value: string | null | undefined) => normalizeEmail(value).split("@")[1] ?? "";
    const customerDomain = domainOf(customer.email);
    const domainMatches = customerDomain
      ? peopleWithEmail.filter((contact) => domainOf(contact.email) === customerDomain)
      : [];

    let selected: CopilotPersonContact | null = null;
    if (exactEmailMatches.length === 1) selected = exactEmailMatches[0];
    else if (peopleWithEmail.length === 1) selected = peopleWithEmail[0];
    else if (domainMatches.length === 1) selected = domainMatches[0];

    if (!selected) {
      const candidateList = (list: CopilotPersonContact[]) =>
        list.slice(0, 5).map((contact) => `${contact.name}${contact.email ? ` <${clean(contact.email)}>` : ""}`).join(", ");
      if (peopleWithEmail.length > 1) {
        actions.push(followUp(customer, customer.contact_id, `There are multiple possible recipients (${peopleWithEmail.length}); confirm which person should own the portal login. Candidates: ${candidateList(peopleWithEmail)}.`));
      } else if (people.length === 1) {
        actions.push(followUp(customer, people[0].id, `${people[0].name} is the only linked contact but has no valid email; add or confirm an email before inviting them.`));
      } else if (people.length > 1) {
        actions.push(followUp(customer, customer.contact_id, `There are multiple possible recipients (${people.length}) and none has a valid email; confirm the person and email. Candidates: ${candidateList(people)}.`));
      } else {
        actions.push(followUp(customer, customer.contact_id, "No person contact is safely linked to this ERP customer; link or create the intended portal user first."));
      }
      continue;
    }


    const recipientEmail = clean(selected.email);
    actions.push({
      actionType: "send_portal_invite",
      riskLevel: 4,
      status: "pending_approval",
      customerId: customer.id,
      contactId: selected.id,
      customerName: customer.name,
      accountNumber: customer.account_number,
      recipientEmail,
      recipientName: selected.name,
      subject: renderSubject(emailRule.subjectPattern, customer.name),
      body: emailBody(selected.name, customer.name),
      templateKey: emailRule.templateKey,
      templateName: emailRule.templateName,
      title: `Invite ${selected.name} to ${customer.name}`,
      summary: `Prepared a portal invitation for ${recipientEmail}. Sending it is customer-facing and requires explicit approval.`,
    });
  }

  return {
    actions,
    counts: {
      erpCustomers: erpCustomers.length,
      alreadyActive,
      invitationsReady: actions.filter((action) => action.actionType === "send_portal_invite").length,
      followUpsNeeded: actions.filter((action) => action.actionType === "create_followup_task").length,
    },
  };
};
