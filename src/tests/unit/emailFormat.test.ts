import { describe, expect, it } from "vitest";
import { formatEmailDate, forwardHeader, prefixSubject, quoteForReply } from "@/features/admin/email/format";

const message = {
  from_name: "Iris Clarke",
  from_address: "iris@baystreet.bb",
  sent_at: "2026-10-08T13:42:00Z",
  subject: "Remake RX-88214",
  body_text: "Line one\nLine two",
  to: [{ address: "orders@classicvisions.net" }],
};

describe("email formatting", () => {
  it("prefixes subjects once", () => {
    expect(prefixSubject("RE", "Remake")).toBe("RE: Remake");
    expect(prefixSubject("RE", "re: Remake")).toBe("re: Remake");
    expect(prefixSubject("FW", null)).toBe("FW: ");
  });

  it("quotes every line of the original in a reply", () => {
    const quoted = quoteForReply(message);
    expect(quoted).toContain("Iris Clarke <iris@baystreet.bb> wrote:");
    expect(quoted).toContain("> Line one\n> Line two");
  });

  it("forwards with the original headers", () => {
    const text = forwardHeader(message);
    expect(text).toContain("---------- Forwarded message ----------");
    expect(text).toContain("To: orders@classicvisions.net");
    expect(text).toContain("Subject: Remake RX-88214");
  });

  it("shows a time for today and a date otherwise", () => {
    const now = new Date("2026-10-08T18:00:00");
    expect(formatEmailDate(new Date("2026-10-08T09:05:00").toISOString(), now)).toMatch(/9:05/);
    expect(formatEmailDate("2026-10-01T09:05:00Z", now)).toMatch(/Oct|1/);
    expect(formatEmailDate(null, now)).toBe("");
  });
});
