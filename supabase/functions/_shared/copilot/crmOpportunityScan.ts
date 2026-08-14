export type CrmScanContact = {
  id: string;
  name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  pipeline: string | null;
  stage: string | null;
  next_action_at: string | null;
  lead_score: number | null;
  is_company: boolean;
  is_archived: boolean;
};

export type CrmOrderHealth = {
  contact_id: string;
  last_order_date: string | null;
  quiet_days: number | null;
  avg_gap_days: number | null;
  orders_last_30_days: number | null;
  health: "alarm" | "flag" | "ok" | "unknown";
};

export type CrmOpportunitySignal = {
  id: string;
  contact_id: string;
  title: string;
  stage: string;
};

export type CrmActivitySignal = {
  contact_id: string | null;
  status: string;
};

export type QualifiedCrmRecommendation = {
  actionType: "create_followup_task";
  riskLevel: 2;
  status: "pending_approval";
  contactId: string;
  opportunityId: string | null;
  contactName: string;
  reasonCode: "lapsed_buyer" | "overdue_next_action" | "missing_contact_details" | "no_active_opportunity";
  priority: "urgent" | "high" | "normal";
  dueAt: string;
  title: string;
  summary: string;
  taskContent: string;
  evidence: string[];
  inference: string;
  recommendedNextAction: string;
  outreachDraft?: string;
};

export type QualifiedCrmPlan = {
  actions: QualifiedCrmRecommendation[];
  counts: {
    contactsReviewed: number;
    orderSignalsReviewed: number;
    suggestionsPrepared: number;
    lapsedBuyers: number;
    overdueNextActions: number;
    missingContactDetails: number;
    noActiveOpportunity: number;
  };
};

const OPEN_ACTIVITY_STATES = new Set(["open", "pending", "inbox", "planned", "in_progress", "waiting"]);
const PROSPECT_STAGES = new Set(["engaged", "qualifying", "presenting", "trial_offer", "trial_active", "converting"]);

const addDays = (now: Date, days: number) => {
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + days);
  return due.toISOString();
};

const displayName = (contact: CrmScanContact) => contact.business_name?.trim() || contact.name.trim() || "Unnamed contact";

const taskText = (name: string, evidence: string[], inference: string, nextAction: string) =>
  `${name}\n\nEvidence:\n${evidence.map((item) => `- ${item}`).join("\n")}\n\nInference:\n${inference}\n\nRecommended next action:\n${nextAction}`;

export const buildQualifiedCrmPlan = (
  contacts: CrmScanContact[],
  orderHealth: CrmOrderHealth[],
  opportunities: CrmOpportunitySignal[],
  activities: CrmActivitySignal[],
  now = new Date(),
  limit = 25,
): QualifiedCrmPlan => {
  const activeActivityContacts = new Set(
    activities.filter((activity) => activity.contact_id && OPEN_ACTIVITY_STATES.has(activity.status)).map((activity) => activity.contact_id as string),
  );
  const activeOpportunities = new Map<string, CrmOpportunitySignal[]>();
  for (const opportunity of opportunities) {
    if (["won", "lost", "closed_won", "closed_lost"].includes(opportunity.stage.toLowerCase())) continue;
    const current = activeOpportunities.get(opportunity.contact_id) ?? [];
    current.push(opportunity);
    activeOpportunities.set(opportunity.contact_id, current);
  }
  const healthByContact = new Map(orderHealth.map((row) => [row.contact_id, row]));
  const actions: QualifiedCrmRecommendation[] = [];

  for (const contact of contacts) {
    if (contact.is_archived || !contact.pipeline || activeActivityContacts.has(contact.id)) continue;
    const name = displayName(contact);
    const health = healthByContact.get(contact.id);
    const activeOpportunity = activeOpportunities.get(contact.id)?.[0] ?? null;
    let action: QualifiedCrmRecommendation | null = null;

    if (health && (health.health === "alarm" || health.health === "flag")) {
      const quietDays = health.quiet_days ?? "unknown";
      const evidence = [
        `Order health is ${health.health}; last order was ${health.last_order_date ?? "not recorded"} (${quietDays} quiet days).`,
        `Orders in the last 30 days: ${health.orders_last_30_days ?? 0}.`,
        health.avg_gap_days != null ? `Historical average gap between orders: ${health.avg_gap_days} days.` : "Historical order-gap baseline is not available.",
      ];
      const inference = "The contact may benefit from re-engagement; the data does not establish why ordering slowed.";
      const nextAction = "Review recent order/category history, then make a personal re-engagement call before drafting any offer.";
      action = {
        actionType: "create_followup_task", riskLevel: 2, status: "pending_approval",
        contactId: contact.id, opportunityId: activeOpportunity?.id ?? null, contactName: name,
        reasonCode: "lapsed_buyer", priority: health.health === "alarm" ? "urgent" : "high",
        dueAt: addDays(now, health.health === "alarm" ? 1 : 3),
        title: `Re-engage lapsed buyer: ${name}`,
        summary: `${name} is ${health.health === "alarm" ? "well beyond" : "past"} its observed buying cadence. This is an order-history signal, not a prediction of why volume changed.`,
        evidence, inference, recommendedNextAction: nextAction,
        taskContent: taskText(name, evidence, inference, nextAction),
        outreachDraft: `Hi ${contact.name || name}, I noticed it has been a little while since your last order with Classic Visions. Could we schedule a quick check-in to understand what has changed and where we can help?`,
      };
    } else if (contact.next_action_at && new Date(contact.next_action_at).getTime() < now.getTime()) {
      const evidence = [`CRM next action was due ${contact.next_action_at}.`, `No open CRM activity currently covers this contact.`];
      const inference = "The planned follow-up may have been missed or may no longer be relevant; a person must review the history.";
      const nextAction = "Review the previous interaction and schedule the most appropriate call, email, or meeting.";
      action = {
        actionType: "create_followup_task", riskLevel: 2, status: "pending_approval",
        contactId: contact.id, opportunityId: activeOpportunity?.id ?? null, contactName: name,
        reasonCode: "overdue_next_action", priority: "high", dueAt: addDays(now, 1),
        title: `Recover overdue next action: ${name}`,
        summary: `${name} has an overdue CRM next-action date and no open activity.`, evidence,
        inference, recommendedNextAction: nextAction, taskContent: taskText(name, evidence, inference, nextAction),
      };
    } else if (!contact.email?.trim() || !contact.phone?.trim()) {
      const missing = [!contact.email?.trim() ? "email" : null, !contact.phone?.trim() ? "phone" : null].filter(Boolean).join(" and ");
      const evidence = [`CRM record is missing ${missing}.`, `Pipeline: ${contact.pipeline}; stage: ${contact.stage ?? "not set"}.`];
      const inference = "Completing the missing business fields could make this record actionable, subject to source verification.";
      const nextAction = "Confirm the missing business contact details from an approved source; do not overwrite any existing field.";
      action = {
        actionType: "create_followup_task", riskLevel: 2, status: "pending_approval",
        contactId: contact.id, opportunityId: activeOpportunity?.id ?? null, contactName: name,
        reasonCode: "missing_contact_details", priority: "normal", dueAt: addDays(now, 5),
        title: `Complete CRM details: ${name}`,
        summary: `${name} is in an active pipeline but is missing ${missing}.`, evidence,
        inference, recommendedNextAction: nextAction, taskContent: taskText(name, evidence, inference, nextAction),
      };
    } else if (contact.stage && PROSPECT_STAGES.has(contact.stage) && !activeOpportunity) {
      const evidence = [
        `CRM stage is ${contact.stage} in the ${contact.pipeline} pipeline.`,
        `Lead score: ${contact.lead_score ?? 0}.`,
        "No open opportunity is linked to this contact.",
      ];
      const inference = "This progressed prospect may warrant an opportunity, but fit and commercial intent are not yet proven.";
      const nextAction = "Review fit and current engagement, then decide whether to create a qualified opportunity with a specific commercial hypothesis.";
      action = {
        actionType: "create_followup_task", riskLevel: 2, status: "pending_approval",
        contactId: contact.id, opportunityId: null, contactName: name,
        reasonCode: "no_active_opportunity", priority: ["presenting", "trial_offer", "trial_active", "converting"].includes(contact.stage) ? "high" : "normal",
        dueAt: addDays(now, 3), title: `Review opportunity fit: ${name}`,
        summary: `${name} has progressed to ${contact.stage} but has no active opportunity. The recommendation is to review, not auto-create one.`,
        evidence, inference, recommendedNextAction: nextAction, taskContent: taskText(name, evidence, inference, nextAction),
      };
    }

    if (action) actions.push(action);
  }

  const priorityRank = { urgent: 0, high: 1, normal: 2 } as const;
  actions.sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority] || left.contactName.localeCompare(right.contactName));
  const limited = actions.slice(0, Math.max(1, limit));
  return {
    actions: limited,
    counts: {
      contactsReviewed: contacts.length,
      orderSignalsReviewed: orderHealth.length,
      suggestionsPrepared: limited.length,
      lapsedBuyers: limited.filter((action) => action.reasonCode === "lapsed_buyer").length,
      overdueNextActions: limited.filter((action) => action.reasonCode === "overdue_next_action").length,
      missingContactDetails: limited.filter((action) => action.reasonCode === "missing_contact_details").length,
      noActiveOpportunity: limited.filter((action) => action.reasonCode === "no_active_opportunity").length,
    },
  };
};

export const isQualifiedCrmScanCommand = (command: string) => {
  const normalized = command.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const asksForWork = /(suggest|find|prepare|review|scan|show|identify)/.test(normalized);
  const mentionsCrm = /(crm|pipeline|opportunit|follow up|lapsed|inactive|buyer|prospect)/.test(normalized);
  return asksForWork && mentionsCrm;
};
