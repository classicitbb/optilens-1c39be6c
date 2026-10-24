import { describe, expect, it } from "vitest";
import { creditApplicationNotes, emptyCreditApplication } from "@/components/home/creditApplicationLogic";

describe("credit application intake", () => {
  it("permits prepaid applicants without reference details", () => {
    expect(creditApplicationNotes(emptyCreditApplication())).toContain("before production");
  });
  it("requires two distinct complete references and authority to follow up", () => {
    const application = { ...emptyCreditApplication(), path: "references" as const };
    expect(creditApplicationNotes(application)).toBeNull();
    application.references[0] = { supplier: "Supplier A", contact: "Accounts", email: "accounts@example.com" };
    application.references[1] = { supplier: "Supplier B", contact: "Accounts", email: "accounts@example.org" };
    expect(creditApplicationNotes(application)).toBeNull();
    application.consent = true;
    expect(creditApplicationNotes(application)).toContain("Approval and terms pending verification");
    application.references[1].supplier = " supplier a ";
    expect(creditApplicationNotes(application)).toBeNull();
  });
  it("requires a complete third reference if supplied", () => {
    const application = { ...emptyCreditApplication(), path: "references" as const, consent: true };
    application.references = [
      { supplier: "A", contact: "Accounts", email: "a@example.com" },
      { supplier: "B", contact: "Accounts", email: "b@example.com" },
      { supplier: "C", contact: "", email: "" },
    ];
    expect(creditApplicationNotes(application)).toBeNull();
  });
  it("records a requested starter limit without granting it", () => {
    const application = { ...emptyCreditApplication(), path: "starter" as const, amount: "0" };
    expect(creditApplicationNotes(application)).toBeNull();
    application.amount = "500";
    expect(creditApplicationNotes(application)).toContain("USD 500.00");
    expect(creditApplicationNotes(application)).toContain("no limit granted");
  });
});
