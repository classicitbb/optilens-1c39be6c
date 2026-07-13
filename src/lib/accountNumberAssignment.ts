import { supabase } from "@/integrations/supabase/client";

export type AccountNumberAssignmentResult = {
  ok: boolean;
  status: "assigned" | "cleared" | "conflict" | "not_found" | string;
  customer_id: number;
  account_number: string | null;
  conflict_customer_id: number | null;
  conflict_customer_name: string | null;
  conflict_account_number: string | null;
  message: string | null;
};

export class AccountNumberAssignmentError extends Error {
  result: AccountNumberAssignmentResult;

  constructor(result: AccountNumberAssignmentResult) {
    super(accountNumberAssignmentMessage(result));
    this.name = "AccountNumberAssignmentError";
    this.result = result;
  }
}

export const normalizeAccountNumberInput = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim().toUpperCase();
  return trimmed || "";
};

export const accountNumberAssignmentMessage = (result: AccountNumberAssignmentResult) => {
  if (result.message) return result.message;
  if (result.status === "conflict" && result.conflict_customer_id) {
    const account = result.account_number ?? result.conflict_account_number ?? "This account number";
    const name = result.conflict_customer_name ?? "Unnamed customer";
    return `${account} is already linked to Customer #${result.conflict_customer_id}: ${name}`;
  }
  return "Account number could not be assigned.";
};

export async function assignCustomerAccountNumber(customerId: number, accountNumber: string | null | undefined) {
  const { data, error } = await (supabase.rpc as any)("assign_customer_account_number", {
    p_customer_id: customerId,
    p_account_number: accountNumber ?? null,
  });
  if (error) throw error;

  const result = (Array.isArray(data) ? data[0] : data) as AccountNumberAssignmentResult | null;
  if (!result) throw new Error("Account number assignment returned no result.");
  if (!result.ok) throw new AccountNumberAssignmentError(result);
  return result;
}
