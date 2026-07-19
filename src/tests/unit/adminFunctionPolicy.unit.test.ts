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

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: { email: "customer@example.com", password: "short" },
      })
    ).toThrow("password must be 12-128 characters");

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: { email: "customer@example.com", password: "x".repeat(129) },
      })
    ).toThrow("password must be 12-128 characters");
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

  it("permits an approved ERP customer to be attached to a customer invite", () => {
    expect(
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "invite-user",
        payload: { email: "customer@example.com", customerId: 42, displayName: "Customer Contact" },
      })
    ).toEqual({
      action: "invite-user",
      email: "customer@example.com",
      customerId: 42,
      displayName: "Customer Contact",
    });
  });

  it("requires an explicit existing-login link to name both records", () => {
    const userId = "6a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
    const contactId = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
    expect(validateAdminFunctionRequest({
      actorRole: "admin",
      action: "link-customer-portal-account",
      payload: { userId, customerId: 42, contactId, displayName: "Customer Contact" },
    })).toEqual({ action: "link-customer-portal-account", userId, customerId: 42, contactId, displayName: "Customer Contact" });
    expect(() => validateAdminFunctionRequest({
      actorRole: "admin",
      action: "link-customer-portal-account",
      payload: { userId, customerId: 0 },
    })).toThrow("customerId must be a positive integer");
  });

  it("rejects an invalid ERP customer identifier", () => {
    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "create-user",
        payload: { email: "customer@example.com", password: "strong-passphrase-123", customerId: 0 },
      })
    ).toThrow("customerId must be a positive integer");

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "invite-user",
        payload: { email: "customer@example.com", customerId: 1.5 },
      })
    ).toThrow("customerId must be a positive integer");
  });

  it("validates optional contact identifiers for customer account creation", () => {
    const contactId = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";

    expect(
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "invite-user",
        payload: { email: "customer@example.com", contactId },
      }),
    ).toEqual({
      action: "invite-user",
      email: "customer@example.com",
      contactId,
    });

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "invite-user",
        payload: { email: "customer@example.com", contactId: "not-a-uuid" },
      }),
    ).toThrow("contactId must be a valid contact id");

    expect(() =>
      validateAdminFunctionRequest({
        actorRole: "admin",
        action: "invite-user",
        payload: { email: "customer@example.com", contactId: 42 },
      }),
    ).toThrow("contactId must be a string");
  });
});
