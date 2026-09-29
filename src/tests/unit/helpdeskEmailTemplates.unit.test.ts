import { describe, expect, it } from "vitest";
import {
  accountOpenTicketsEmail,
  ticketCreatedEmail,
  ticketMessageEmail,
} from "../../../supabase/functions/_shared/email/helpdeskTemplates";

const base = {
  ticketNumber: "TCK-89820102",
  title: "O'dell Leacock - no cut-out",
  recipientName: "Janelle",
  accountName: "Eye Focus Inc.",
  viewUrl: "https://classicvisions.net/profile/helpdesk/abc",
};

describe("helpdesk email templates", () => {
  it.each([
    ["ticket created", ticketCreatedEmail],
    ["ticket message", ticketMessageEmail],
  ])("%s keeps the title in the subject and out of the body", (_label, build) => {
    const email = build(base);
    expect(email.subject).toContain("O'dell Leacock - no cut-out");
    expect(email.subject).toContain("TCK-89820102");
    expect(email.html).not.toMatch(/Leacock/i);
    expect(email.html).not.toContain("cut-out");
    expect(email.html).toContain("TCK-89820102");
    expect(email.html).toContain("Eye Focus Inc.");
    expect(email.html).toContain(base.viewUrl);
  });

  it("escapes names so they cannot inject markup", () => {
    const email = ticketCreatedEmail({ ...base, recipientName: "<b>x</b>", accountName: "A & B" });
    expect(email.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(email.html).toContain("A &amp; B");
  });

  it("account notice gives a count and no ticket detail", () => {
    const email = accountOpenTicketsEmail({ openCount: 2, recipientName: "Sam", accountName: "Eye Focus Inc.", viewUrl: "https://x/profile/helpdesk" });
    expect(email.html).toContain("are 2 open tickets");
    expect(email.subject).not.toMatch(/TCK-/);
  });
});
