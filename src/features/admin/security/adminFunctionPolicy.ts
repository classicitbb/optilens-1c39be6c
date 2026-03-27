import type { AppRole } from "@/hooks/useUserRole";

export const ADMIN_FUNCTION_ACTIONS = [
  "list-users",
  "reset-password",
  "invite-user",
  "create-user",
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
      return { action: "invite-user" as const, email: assertEmail(payload.email) };
    case "create-user":
      return {
        action: "create-user" as const,
        email: assertEmail(payload.email),
        password: assertPassword(payload.password),
        displayName: assertDisplayName(payload.displayName),
      };
  }
};
