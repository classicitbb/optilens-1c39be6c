export type CreditPath = "prepaid" | "references" | "starter";
export type CreditReference = { supplier: string; contact: string; email: string };
export type CreditApplicationValue = {
  path: CreditPath;
  references: CreditReference[];
  amount: string;
  currency: string;
  consent: boolean;
};

export const emptyCreditApplication = (): CreditApplicationValue => ({
  path: "prepaid",
  references: Array.from({ length: 3 }, () => ({ supplier: "", contact: "", email: "" })),
  amount: "",
  currency: "USD",
  consent: false,
});

export function creditApplicationNotes(value: CreditApplicationValue): string | null {
  if (value.path === "prepaid") return "Payment preference: pay in full before production. No credit requested.";
  if (value.path === "starter") {
    if (!Number.isFinite(Number(value.amount)) || Number(value.amount) <= 0) return null;
    return `Payment preference: new-business starter limit requested: ${value.currency} ${Number(value.amount).toFixed(2)}. Office approval required; no limit granted by this application. Further work requires payment once the agreed limit is reached.`;
  }

  const references = value.references.filter((reference, index) => index < 2 || Object.values(reference).some((part) => part.trim()));
  if (!value.consent || references.some((reference) => !reference.supplier.trim() || !reference.contact.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reference.email.trim()))) return null;
  if (new Set(references.map((reference) => reference.supplier.trim().toLowerCase())).size !== references.length) return null;

  return `Payment preference: supplier-reference credit review. Applicant authorises reference checks. Approval and terms pending verification.\n${references.map((reference, index) => `Supplier ${index + 1}: ${reference.supplier.trim()}; contact: ${reference.contact.trim()}; email: ${reference.email.trim()}`).join("\n")}`;
}
