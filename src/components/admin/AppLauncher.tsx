import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, LayoutDashboard, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ACTIVE_NAVIGATION_REGISTRY } from "@/config/navigationRegistry";

// Color map per app key for icon tinting
const APP_COLORS: Record<string, string> = {
  launchpad: "hsl(172 72% 40%)",
  pricing: "hsl(215 65% 50%)",
  sales: "hsl(260 50% 55%)",
  contacts: "hsl(168 76% 42%)",
  leads: "hsl(38 92% 50%)",
  crm: "hsl(280 60% 55%)",
  helpdesk: "hsl(38 92% 50%)",
  website: "hsl(200 60% 50%)",
  knowledge: "hsl(140 50% 45%)",
  settings: "hsl(215 15% 50%)",
  moonshot: "hsl(168 76% 42%)",
};

const LAUNCH_PAD_APP = {
  key: "launchpad",
  title: "Launch Pad",
  icon: LayoutDashboard,
  defaultRoute: "/admin/dashboard",
} as const;

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

const AppLauncher = ({ open, onClose }: AppLauncherProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { hasAppAccess } = useRolePermissions();

  const visibleApps = ACTIVE_NAVIGATION_REGISTRY
    .filter((item) => item.group === "launcher")
    .map((item) => {
      if (!item.appKey) {
        return LAUNCH_PAD_APP;
      }
      return ADMIN_APPS[item.appKey];
    })
    .filter((app, index, arr) => arr.findIndex((candidate) => candidate.key === app.key) === index)
    .filter((app) => ("featurePrefix" in app ? hasAppAccess(app.featurePrefix) : true));

  const launchableApps = visibleApps;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || isMobile) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-apps-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {clearTimeout(timer);document.removeEventListener("mousedown", handleClick);};
  }, [open, isMobile, onClose]);

  if (!open) return null;

  const handleSelect = (app: (typeof launchableApps)[number]) => {
    navigate(app.defaultRoute);
    onClose();
  };

  // Mobile: fullscreen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "hsl(215 15% 42% / 0.7)", backdropFilter: "blur(32px) saturate(1.5)", WebkitBackdropFilter: "blur(32px) saturate(1.5)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(215 25% 22%)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "hsl(210 20% 85%)" }}>Applications</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" style={{ color: "hsl(210 20% 85%)" }} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {launchableApps.map((app) =>
            <button
              key={app.key}
              onClick={() => handleSelect(app)}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-colors"
              style={{ background: "hsl(215 25% 18%)", border: "1px solid hsl(215 25% 22%)" }}>

                <app.icon className="h-8 w-8" style={{ color: APP_COLORS[app.key] ?? "hsl(210 20% 85%)" }} />
                <span className="text-[11px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>{app.title}</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {navigate("/");onClose();}}
          className="flex items-center justify-center gap-2 py-3 transition-colors hover:bg-white/10"
          style={{ color: "hsl(210 15% 65%)", borderTop: "1px solid hsl(215 25% 22%)" }}>

          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Back to Site</span>
        </button>
      </div>);

  }

  // Desktop: flyout
  return (
    <div
      ref={panelRef}
      className="fixed z-50 p-5 flex-col animate-in fade-in slide-in-from-top-2 duration-200 flex items-start justify-start rounded-xl"
      style={{
        top: "54px",
        left: "10px",
        background: "hsl(215 15% 42% / 0.7)",
        backdropFilter: "blur(32px) saturate(1.5)",
        WebkitBackdropFilter: "blur(32px) saturate(1.5)",
        border: "1px solid hsl(215 25% 40% / 0.2)",
        borderRadius: "12px",
        boxShadow: "0 20px 50px -12px hsl(215 40% 5% / 0.7), inset 0 1px 0 0 hsl(0 0% 100% / 0.08)",
        width: "460px"
      }}>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "hsl(210 20% 85%)" }}>Applications</h3>
        <button
          onClick={() => {navigate("/admin/knowledge/wiki");onClose();}}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Help / Wiki">
          <HelpCircle className="h-4 w-4" style={{ color: "hsl(215 65% 50%)" }} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {launchableApps.map((app) =>
        <button
          key={app.key}
          onClick={() => handleSelect(app)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg transition-all duration-150 hover:scale-105"
          style={{
            width: "100px",
            height: "100px",
            background: "hsl(215 25% 16% / 0.7)",
            border: "1px solid hsl(215 25% 35% / 0.3)",
            boxShadow: "0 2px 8px -2px hsl(215 40% 5% / 0.4), inset 0 1px 0 0 hsl(0 0% 100% / 0.05)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "hsl(168 76% 42% / 0.6)";
            e.currentTarget.style.background = "hsl(215 25% 20% / 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "hsl(215 25% 35% / 0.3)";
            e.currentTarget.style.background = "hsl(215 25% 16% / 0.7)";
          }}>

            <app.icon className="h-8 w-8" style={{ color: APP_COLORS[app.key] ?? "hsl(210 20% 85%)" }} />
            <span className="text-[11px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>{app.title}</span>
          </button>
        )}
      </div>

      <button
        onClick={() => {navigate("/");onClose();}}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-md transition-colors hover:bg-white/10"
        style={{ color: "hsl(210 15% 65%)", borderTop: "1px solid hsl(215 25% 22%)" }}>

        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-medium">Back to Site</span>
      </button>
    </div>);

};

export default AppLauncher;
