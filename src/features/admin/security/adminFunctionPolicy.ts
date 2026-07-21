import type { AppRole } from "@/hooks/useUserRole";

export const ADMIN_FUNCTION_ACTIONS = [
  "list-users",
  "reset-password",
  "invite-user",
  "create-user",
  "link-customer-portal-account",
  "emulate-portal-user",
  "confirm-portal-staff",
  "archive-portal-profile",
  "set-login-disabled",
] as const;

export type AdminFunctionAction = (typeof ADMIN_FUNCTION_ACTIONS)[number];

export class AdminActionPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminActionPolicyError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 80;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertString = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new AdminActionPolicyError(`${field} must be a string.`);
  }
  return value.trim();
};

const assertEmail = (value: unknown, field = "email") => {
  const email = assertString(value, field).toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    throw new AdminActionPolicyError(`${field} must be a valid email.`);
  }
  return email;
};

const assertPassword = (value: unknown) => {
  const password = assertString(value, "password");
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new AdminActionPolicyError(`password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`);
  }
  return password;
};

const assertDisplayName = (value: unknown) => {
  if (value == null) return undefined;
  const displayName = assertString(value, "displayName");
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new AdminActionPolicyError(`displayName must not exceed ${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }
  return displayName || undefined;
};

const assertCustomerId = (value: unknown) => {
  if (value == null) return undefined;
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new AdminActionPolicyError("customerId must be a positive integer.");
  }
  return Number(value);
};

const assertContactId = (value: unknown) => {
  if (value == null) return undefined;
  const contactId = assertString(value, "contactId");
  if (!UUID_RE.test(contactId)) {
    throw new AdminActionPolicyError("contactId must be a valid contact id.");
  }
  return contactId;
};

const assertUserId = (value: unknown) => {
  const userId = assertString(value, "userId");
  if (!UUID_RE.test(userId)) {
    throw new AdminActionPolicyError("userId must be a valid user id.");
  }
  return userId;
};

const assertBoolean = (value: unknown, field: string) => {
  if (typeof value !== "boolean") {
    throw new AdminActionPolicyError(`${field} must be a boolean.`);
  }
  return value;
};

const assertRequiredCustomerId = (value: unknown) => {
  const customerId = assertCustomerId(value);
  if (customerId === undefined) {
    throw new AdminActionPolicyError("customerId is required.");
  }
  return customerId;
};

export interface AdminActionValidationInput {
  actorRole: AppRole | null;
  action: string;
  payload?: Record<string, unknown>;
}

export const validateAdminFunctionRequest = ({ actorRole, action, payload = {} }: AdminActionValidationInput) => {
  if (actorRole !== "admin") {
    throw new AdminActionPolicyError("Only admins can execute admin-user-management actions.");
  }

  if (!ADMIN_FUNCTION_ACTIONS.includes(action as AdminFunctionAction)) {
    throw new AdminActionPolicyError("Unsupported admin action.");
  }

  switch (action as AdminFunctionAction) {
    case "list-users":
      return { action: "list-users" as const };
    case "reset-password":
      return { action: "reset-password" as const, email: assertEmail(payload.email) };
    case "invite-user":
      {
      const customerId = assertCustomerId(payload.customerId);
      const contactId = assertContactId(payload.contactId);
      const displayName = assertDisplayName(payload.displayName);
      return {
        action: "invite-user" as const,
        email: assertEmail(payload.email),
        ...(customerId !== undefined ? { customerId } : {}),
        ...(contactId !== undefined ? { contactId } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
      };
      }
    case "create-user":
      {
      const customerId = assertCustomerId(payload.customerId);
      const contactId = assertContactId(payload.contactId);
      const displayName = assertDisplayName(payload.displayName);
      return {
        action: "create-user" as const,
        email: assertEmail(payload.email),
        password: assertPassword(payload.password),
        displayName,
        ...(customerId !== undefined ? { customerId } : {}),
        ...(contactId !== undefined ? { contactId } : {}),
      };
      }
    case "link-customer-portal-account":
      {
      const customerId = assertCustomerId(payload.customerId);
      const contactId = assertContactId(payload.contactId);
      const displayName = assertDisplayName(payload.displayName);
      if (!customerId) {
        throw new AdminActionPolicyError("customerId is required when linking a portal account.");
      }
      return {
        action: "link-customer-portal-account" as const,
        userId: assertUserId(payload.userId),
        customerId,
        ...(contactId !== undefined ? { contactId } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
      };
      }
    case "emulate-portal-user":
      return {
        action: "emulate-portal-user" as const,
        userId: assertUserId(payload.userId),
      };
    case "confirm-portal-staff":
      return {
        action: "confirm-portal-staff" as const,
        userId: assertUserId(payload.userId),
        customerId: assertRequiredCustomerId(payload.customerId),
      };
    case "archive-portal-profile":
      return {
        action: "archive-portal-profile" as const,
        userId: assertUserId(payload.userId),
        archived: assertBoolean(payload.archived, "archived"),
      };
    case "set-login-disabled":
      return {
        action: "set-login-disabled" as const,
        userId: assertUserId(payload.userId),
        disabled: assertBoolean(payload.disabled, "disabled"),
      };
  }
};
