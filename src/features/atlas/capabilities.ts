import type { AtlasSpaceDef, CapabilityRule } from "./spaces";

/** What the signed-in user can do in one space. Nothing here grants a right the host does not already give. */
export interface AtlasCapabilities {
  view: boolean;
  edit: boolean;
  publish: boolean;
  remove: boolean;
}

/** The host app's permission facts, supplied by `useAtlasCapabilities`. */
export interface AtlasPermissionContext {
  canViewFeature: (feature: string) => boolean;
  canEditFeature: (feature: string) => boolean;
  adminRole: { hasAccess: boolean; canEdit: boolean; isAdmin: boolean };
}

export const NO_CAPABILITIES: AtlasCapabilities = { view: false, edit: false, publish: false, remove: false };

const evaluate = (rule: CapabilityRule, ctx: AtlasPermissionContext): boolean => {
  switch (rule.kind) {
    case "feature":
      return rule.level === "view" ? ctx.canViewFeature(rule.feature) : ctx.canEditFeature(rule.feature);
    case "adminRole":
      return rule.level === "access" ? ctx.adminRole.hasAccess : rule.level === "edit" ? ctx.adminRole.canEdit : ctx.adminRole.isAdmin;
    default:
      return false;
  }
};

/**
 * Edit, publish and remove all require view: a rule that passes without it is treated as failing,
 * so a misconfigured space can never expose more than it shows.
 */
export const resolveCapabilities = (space: AtlasSpaceDef, ctx: AtlasPermissionContext): AtlasCapabilities => {
  const view = evaluate(space.capability.view, ctx);
  if (!view) return NO_CAPABILITIES;
  return {
    view,
    edit: evaluate(space.capability.edit, ctx),
    publish: evaluate(space.capability.publish, ctx),
    remove: evaluate(space.capability.remove, ctx),
  };
};
