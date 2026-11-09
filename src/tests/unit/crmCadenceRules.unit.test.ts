import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  emailBlockReason,
  isWithinSendWindow,
  nextDueAt,
  primaryEmail,
  renderOutreachEmail,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../../../supabase/functions/_shared/crm/cadenceRules";
import { findAuthUserByEmail } from "../../../supabase/functions/_shared/auth/findAuthUserByEmail";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const ID = "123e4567-e89b-12d3-a456-426614174000";

describe("primaryEmail", () => {
  it("takes the first valid address from a normalized list", () => {
    expect(primaryEmail("not-an-email; a@x.com, b@x.com")).toBe("a@x.com");
  });
  it("returns null for empty or invalid values", () => {
    expect(primaryEmail("")).toBeNull();
    expect(primaryEmail(null)).toBeNull();
    expect(primaryEmail("nobody")).toBeNull();
  });
});

describe("isWithinSendWindow (Barbados, UTC-4, Mon-Fri 08-17)", () => {
  it("allows a weekday morning", () => {
    expect(isWithinSendWindow(new Date("2026-11-04T13:00:00Z"))).toBe(true); // Wed 09:00 local
  });
  it("blocks before opening and at closing", () => {
    expect(isWithinSendWindow(new Date("2026-11-04T11:59:00Z"))).toBe(false); // 07:59 local
    expect(isWithinSendWindow(new Date("2026-11-04T21:00:00Z"))).toBe(false); // 17:00 local
  });
  it("blocks weekends", () => {
    expect(isWithinSendWindow(new Date("2026-11-07T15:00:00Z"))).toBe(false); // Sat
  });
  it("uses local day, not UTC day, near midnight", () => {
    expect(isWithinSendWindow(new Date("2026-11-05T01:00:00Z"))).toBe(false); // Wed 21:00 local
  });
});

describe("emailBlockReason", () => {
  it("blocks opt-out first, then archived, then missing email", () => {
    expect(emailBlockReason({ optedOutAt: "2026-01-01", archived: true, email: "a@x.com" })).toBe("opted_out");
    expect(emailBlockReason({ optedOutAt: null, archived: true, email: "a@x.com" })).toBe("archived");
    expect(emailBlockReason({ optedOutAt: null, archived: false, email: null })).toBe("no_valid_email");
    expect(emailBlockReason({ optedOutAt: null, archived: false, email: "a@x.com" })).toBeNull();
  });
});

describe("nextDueAt", () => {
  it("counts delay days from enrolment", () => {
    expect(nextDueAt("2026-11-01T00:00:00.000Z", 3)).toBe("2026-11-04T00:00:00.000Z");
  });
});

describe("unsubscribe token", () => {
  it("round-trips and rejects tampering or the wrong secret", async () => {
    const token = await signUnsubscribeToken(ID, "secret-a");
    expect(await verifyUnsubscribeToken(token, "secret-a")).toBe(ID);
    expect(await verifyUnsubscribeToken(token, "secret-b")).toBeNull();
    expect(await verifyUnsubscribeToken(token.replace(ID, ID.replace("123e", "123f")), "secret-a")).toBeNull();
    expect(await verifyUnsubscribeToken("", "secret-a")).toBeNull();
    expect(await verifyUnsubscribeToken("garbage", "secret-a")).toBeNull();
  });
});

describe("renderOutreachEmail", () => {
  it("escapes the body and always ends with the unsubscribe link", () => {
    const { html, text } = renderOutreachEmail("Hi <b>there</b>\n\nSecond", "https://x.test/u?t=1");
    expect(html).toContain("&lt;b&gt;there&lt;/b&gt;");
    expect(html).toContain('href="https://x.test/u?t=1"');
    expect(text.endsWith("unsubscribe: https://x.test/u?t=1")).toBe(true);
  });
});

describe("findAuthUserByEmail", () => {
  const makeClient = (total: number, target?: { page: number; email: string }) => {
    const calls: number[] = [];
    return {
      calls,
      auth: {
        admin: {
          listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
            calls.push(page);
            const start = (page - 1) * perPage;
            const count = Math.max(0, Math.min(perPage, total - start));
            const users = Array.from({ length: count }, (_, i) => ({ id: `u${start + i}`, email: `user${start + i}@x.com` }));
            if (target && target.page === page) users[0] = { id: "target", email: target.email };
            return { data: { users }, error: null };
          },
        },
      },
    };
  };

  it("finds a user beyond the first 1,000", async () => {
    const client = makeClient(2500, { page: 3, email: "Late@Example.com" });
    const found = await findAuthUserByEmail(client, "late@example.com");
    expect(found?.id).toBe("target");
    expect(client.calls).toEqual([1, 2, 3]);
  });
  it("returns null after the last short page", async () => {
    const client = makeClient(1200);
    expect(await findAuthUserByEmail(client, "missing@x.com")).toBeNull();
    expect(client.calls).toEqual([1, 2]);
  });
});

describe("wiring contracts", () => {
  it("runner is scheduler- or staff-gated, honours send window, opt-out and unsubscribe", () => {
    const fn = read("supabase/functions/crm-cadence-runner/index.ts");
    expect(fn).toContain("CRM_CADENCE_SCHEDULER_SECRET");
    expect(fn).toContain("requirePrivilegedAccess");
    expect(fn).toContain("isWithinSendWindow");
    expect(fn).toContain("sendManagedEmail");
    expect(fn).toContain("signUnsubscribeToken");
    expect(fn).toMatch(/\.eq\('auto_send', true\)/);
    expect(fn).toMatch(/\.eq\('status', 'approved'\)/);
  });
  it("config and smoke list register the new functions", () => {
    const config = read("supabase/config.toml");
    expect(config).toMatch(/\[functions\.crm-cadence-runner\]\s+verify_jwt = false/);
    expect(config).toMatch(/\[functions\.crm-unsubscribe\]\s+verify_jwt = false/);
    expect(read("scripts/edge_functions_smoke.mjs")).toContain('"crm-cadence-runner"');
  });
  it("admin user lookups no longer rely on one listUsers page", () => {
    const fn = read("supabase/functions/admin-user-management/index.ts");
    expect(fn).toContain("findAuthUserByEmail(adminClient");
    expect((fn.match(/listUsers\(\{ perPage: 1000 \}\)/g) ?? []).length).toBe(1); // list-users action only
  });
  it("migration logs stage changes and defaults auto_send off", () => {
    const sql = read("supabase/migrations/20261104120000_crm_stage_history_and_outreach_controls.sql");
    expect(sql).toContain("contacts_log_stage_event");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT false");
    expect(sql).toContain("marketing_opt_out_at");
  });
});
