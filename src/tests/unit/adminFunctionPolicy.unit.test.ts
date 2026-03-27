import { describe, expect, it } from "vitest";
import { AdminActionPolicyError, validateAdminFunctionRequest } from "@/features/admin/security/adminFunctionPolicy";

describe("admin function policy", () => {
  it("rejects non-admin actors for privileged edge-function actions", () => {
    expect(() =>
      validateAdminFunctionRequest({ actorRole: "viewer", action: "invite-user", payload: { email: "user@example.com" } })
    ).toThrow(AdminActionPolicyError);
  });

  it("rejects unsupported actions", () => {
    expect(() =>
      validateAdminFunctionRequest({ actorRole: "admin", action: "drop-database" })
    ).toThrow("Unsupported admin action");
  });

  it("allows list users action for admins", () => {
    expect(validateAdminFunctionRequest({ actorRole: "admin", action: "list-users" })).toEqual({ action: "list-users" });
  });

  it("rejects invalid reset/invite payloads", () => {
    expect(() =>
      validateAdminFunctionRequest({ actorRole: "admin", action: "reset-password", payload: { email: 123 } })
    ).toThrow("email must be a string");

    expect(() =>
      validateAdminFunctionRequest({ actorRole: "admin", action: "invite-user", payload: { email: "bad-email" } })
    ).toThrow("email must be a valid email");
  });

  it("rejects malicious or invalid create-user payloads", () => {
    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: { email: "not-an-email", password: "short", displayName: "<script>alert(1)</script>" },
      })
    ).toThrow(AdminActionPolicyError);

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: {
          email: "admin@example.com",
          password: "strong-passphrase-123",
          displayName: "x".repeat(120),
        },
      })
    ).toThrow("displayName must not exceed");
  });

  it("accepts sanitized admin payload", () => {
    expect(
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: {
          email: " ADMIN@Example.COM ",
          password: "strong-passphrase-123",
          displayName: "Admin User",
        },
      })
    ).toEqual({
      action: "create-user",
      email: "admin@example.com",
      password: "strong-passphrase-123",
      displayName: "Admin User",
    });
  });

  it("accepts create-user payload without displayName", () => {
    expect(
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: { email: "admin@example.com", password: "strong-passphrase-123" },
      })
    ).toEqual({
      action: "create-user",
      email: "admin@example.com",
      password: "strong-passphrase-123",
      displayName: undefined,
    });
  });
});
