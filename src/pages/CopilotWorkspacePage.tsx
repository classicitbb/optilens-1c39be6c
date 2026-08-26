import PortalCopilotPage from "@/pages/admin/PortalCopilotPage";

/**
 * Standalone Copilot workspace.
 *
 * Reuses the existing PortalCopilotPage component in a full-height, chromeless
 * shell. No admin sidebar or admin top bar — just the Copilot interface and a
 * minimal back-to-admin link rendered inside the page header.
 */
export default function CopilotWorkspacePage() {
  return <PortalCopilotPage standalone />;
}
