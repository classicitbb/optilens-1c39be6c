import { describe, expect, it } from "vitest";
import { emailTaskInput, emailTaskLink, tomorrowAtNine } from "@/features/admin/email/useEmailToTask";

const message = {
  subject: "  Lens order 1234  ",
  from_name: "Ailyn Campiz",
  from_address: "ailyn@example.com",
  sent_at: "2026-10-13T14:30:00Z",
  body_text: "Hello,\n\n\n\nPlease confirm the coating.",
  snippet: "Hello, please confirm",
};

describe("email to task", () => {
  it("is due tomorrow at 09:00 local time, including across a month end", () => {
    const due = tomorrowAtNine(new Date(2026, 9, 31, 17, 45));
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours(), due.getMinutes()]).toEqual([2026, 10, 1, 9, 0]);
  });

  it("builds a follow-up for the user linked to the contact with an excerpt and a link back", () => {
    const link = emailTaskLink("https://admin.example", { account_code: "russell", folder_id: 7, message_id: 123 });
    expect(link).toBe("https://admin.example/admin/email?account=russell&folder=7&message=123");
    const input = emailTaskInput(message, { contactId: "c1", userId: "u1", link, now: new Date(2026, 9, 13, 10) });
    expect(input).toMatchObject({
      activityType: "Follow up: Lens order 1234",
      type: "email",
      taskChannel: "todo",
      contactId: "c1",
      ownerId: "u1",
      createdBy: "u1",
      dueAt: new Date(2026, 9, 14, 9).toISOString(),
    });
    expect(input.content).toContain("From: Ailyn Campiz <ailyn@example.com>");
    expect(input.content).toContain("Hello,\n\nPlease confirm the coating.");
    expect(input.content).toContain(`Open the email: ${link}`);
  });

  it("drops whitespace-only lines and the quoted thread from Outlook-style bodies", () => {
    const body_text = "Good Morning Joy,\r\n\r\n \r\n\r\nPlease update me.\r\n\r\nFrom: Someone <a@b.com>\r\nSent: Monday\r\nOld text";
    const input = emailTaskInput({ ...message, body_text }, { link: "L" });
    expect(input.content).toContain("Good Morning Joy,\n\nPlease update me.\n\nOpen the email: L");
    expect(input.content).not.toContain("Old text");
  });

  it("handles a missing subject and truncates long bodies", () => {
    const input = emailTaskInput({ ...message, subject: null, body_text: "x".repeat(900) }, { link: "L" });
    expect(input.activityType).toBe("Follow up: (no subject)");
    expect(input.content).toContain(`${"x".repeat(500)}…`);
    expect(input.content).not.toContain("x".repeat(501));
    expect(input.contactId).toBeUndefined();
  });
});
