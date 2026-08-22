// Re-export the single shared admin resource registry so the MCP server and
// the Portal Copilot expose exactly the same admin capability surface.
export {
  ADMIN_RESOURCES,
  ADMIN_RESOURCE_BY_KEY,
  findAdminResource,
  classifyAdminWrite,
  dispatchAdminResourceTool,
  type AdminResource,
  type AdminToolResult,
  type AdminWriteClass,
} from "../../../supabase/functions/_shared/copilot/adminResources";
