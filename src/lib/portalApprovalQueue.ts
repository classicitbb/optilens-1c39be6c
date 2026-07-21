import { normalizeAccountNumberInput } from "@/lib/accountNumberAssignment";

export type PendingSignupProfile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  organization_name: string | null;
  claimed_account_number: string | null;
  crm_contact_id: string | null;
  updated_at: string | null;
};

export type ApprovalQueueCustomer = {
  id: number;
  name: string | null;
  account_number: string | null;
};

export type ApprovalQueueStaffMember = {
  full_name: string | null;
  email: string | null;
};

export type ResolvedPendingSignup = {
  profile: PendingSignupProfile;
  /** Set only when the claimed account number matched exactly one customer. */
  matchedCustomer: ApprovalQueueCustomer | null;
  /** Present linked people at the matched account, for the "is this a colleague?" check. */
  existingStaff: ApprovalQueueStaffMember[];
  /** Domain of the signup email, for a light plausibility check. */
  emailDomain: string | null;
};

export type PortalApprovalQueue = {
  /** Claimed account number matched an existing customer — one-click confirm. */
  staffAtExisting: ResolvedPendingSignup[];
  /** No claim, or claim matched nothing — hand off to Deploy Access. */
  newOrUnresolved: ResolvedPendingSignup[];
};

const emailDomainOf = (email: string | null): string | null => {
  const at = (email ?? "").trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = (email ?? "").trim().toLowerCase().slice(at + 1);
  return domain || null;
};

/**
 * Splits pending signups into the two queue sections. A claimed account number
 * is only routed to "staff at existing" when it matches EXACTLY ONE customer —
 * an ambiguous multi-match is treated as unresolved so a human picks the right
 * account rather than the queue guessing. The claim never grants access here;
 * it only decides which section (and confirm target) a signup lands in.
 */
export const buildPortalApprovalQueue = (
  profiles: PendingSignupProfile[],
  customers: ApprovalQueueCustomer[],
  staffByCustomerId: Record<number, ApprovalQueueStaffMember[]>,
): PortalApprovalQueue => {
  const customersByAccount = new Map<string, ApprovalQueueCustomer[]>();
  for (const customer of customers) {
    const key = normalizeAccountNumberInput(customer.account_number);
    if (!key) continue;
    customersByAccount.set(key, [...(customersByAccount.get(key) ?? []), customer]);
  }

  const staffAtExisting: ResolvedPendingSignup[] = [];
  const newOrUnresolved: ResolvedPendingSignup[] = [];

  for (const profile of profiles) {
    const claimKey = normalizeAccountNumberInput(profile.claimed_account_number);
    const matches = claimKey ? customersByAccount.get(claimKey) ?? [] : [];
    const matchedCustomer = matches.length === 1 ? matches[0] : null;
    const resolved: ResolvedPendingSignup = {
      profile,
      matchedCustomer,
      existingStaff: matchedCustomer ? staffByCustomerId[matchedCustomer.id] ?? [] : [],
      emailDomain: emailDomainOf(profile.email),
    };
    if (matchedCustomer) staffAtExisting.push(resolved);
    else newOrUnresolved.push(resolved);
  }

  return { staffAtExisting, newOrUnresolved };
};
