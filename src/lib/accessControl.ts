import type { AppRole } from "@/hooks/useUserRole";

export type CanonicalRole = "admin" | "operator" | "standard_user";

export const normalizeRole = (role: AppRole | null | undefined): CanonicalRole | null => {
  if (!role) return null;
  if (role === "viewer" || role === "customer" || role === "standard_user") return "standard_user";
  if (role === "admin" || role === "operator") return role;
  return null;
};

const routeAccessRules: Array<{ pattern: RegExp; roles: CanonicalRole[] }> = [
  { pattern: /^\/admin\/settings\/(users|roles|audit|integrations)(\/|$)/, roles: ["admin"] },
  { pattern: /^\/admin(\/|$)/, roles: ["admin", "operator"] },
  { pattern: /^\/moonshot\/users(\/|$)/, roles: ["admin"] },
  { pattern: /^\/moonshot\/settings(\/|$)/, roles: ["admin"] },
  { pattern: /^\/moonshot(\/|$)/, roles: ["admin", "operator"] },
];

export const hasRole = (role: AppRole | null | undefined, allowedRoles: CanonicalRole[]): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
};

export const hasPermission = (role: AppRole | null | undefined, permission: "moonshot_access" | "admin_access"): boolean => {
  if (permission === "moonshot_access") return hasRole(role, ["admin", "operator"]);
  return hasRole(role, ["admin", "operator"]);
};

export const canAccessRoute = (role: AppRole | null | undefined, route: string): boolean => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;

  const matchingRule = routeAccessRules.find((rule) => rule.pattern.test(route));
  if (!matchingRule) return true;
  return matchingRule.roles.includes(normalizedRole);
};

export const getDefaultLandingPageForRole = (role: AppRole | null | undefined): string => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") return "/admin/crm/pipeline";
  if (normalizedRole === "operator") return "/moonshot/dashboard";
  return "/";
};
