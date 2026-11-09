import { describe, expect, it } from "vitest";
import { checkOutreachDraft } from "../../../supabase/functions/_shared/crm/outreachGate";
import { ETHICS_RULES, psychologyPrompt, STAGE_PRINCIPLES } from "../../../supabase/functions/_shared/crm/outreachPsychology";

const good = {
  subject: "Faster lens turnaround for your Bridgetown practice",
  body: "Hi Gail,\n\nWe cut Rx lens turnaround for Caribbean opticians to about two days.\n\nWould a trial order on one regular product be useful?",
};

describe("checkOutreachDraft", () => {
  it("passes a short, personal draft with one ask", () => {
    expect(checkOutreachDraft(good, "email")).toEqual({ ok: true, reasons: [] });
  });

  it("flags banned phrases, placeholders and a missing ask", () => {
    const r = checkOutreachDraft({ subject: "Limited time offer", body: "Hi {{name}}, I hope this email finds you well." }, "email");
    expect(r.ok).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/banned phrase/);
    expect(r.reasons.join(" ")).toMatch(/placeholder/);
    expect(r.reasons.join(" ")).toMatch(/clear ask/);
  });

  it("enforces channel length limits and one link", () => {
    const long = "word ".repeat(80) + "? https://a.example https://b.example";
    expect(checkOutreachDraft({ subject: "", body: long }, "whatsapp").reasons.join(" ")).toMatch(/over 60 words/);
    expect(checkOutreachDraft({ subject: "Hi", body: long }, "email").reasons.join(" ")).toMatch(/more than one link/);
  });

  it("requires a subject on email only", () => {
    expect(checkOutreachDraft({ subject: "", body: "Are you open to a chat?" }, "email").ok).toBe(false);
    expect(checkOutreachDraft({ subject: "", body: "Are you open to a chat?" }, "whatsapp").ok).toBe(true);
  });
});

describe("psychologyPrompt", () => {
  it("gives every known stage a principle and always carries the ethics rules", () => {
    for (const stage of Object.keys(STAGE_PRINCIPLES)) expect(psychologyPrompt(stage)).toContain(ETHICS_RULES);
    expect(psychologyPrompt("trial_offer")).toMatch(/Regret aversion/);
  });

  it("falls back to the first-contact principle for unknown stages", () => {
    expect(psychologyPrompt("nonsense")).toBe(psychologyPrompt("target"));
  });
});
