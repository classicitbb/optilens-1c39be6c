import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import { useRolePermissions } from "@/hooks/useRolePermissions";

// Color map per app key for icon tinting
const APP_COLORS: Record<string, string> = {
  pricing: "hsl(215 65% 50%)",
  sales: "hsl(260 50% 55%)",
  contacts: "hsl(168 76% 42%)",
  leads: "hsl(38 92% 50%)",
  crm: "hsl(280 60% 55%)",
  helpdesk: "hsl(38 92% 50%)",
  website: "hsl(200 60% 50%)",
  knowledge: "hsl(140 50% 45%)",
  settings: "hsl(215 15% 50%)"
};

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

const AppLauncher = ({ open, onClose }: AppLauncherProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { hasAppAccess } = useRolePermissions();

  const visibleApps = Object.values(ADMIN_APPS).filter((app) =>
  hasAppAccess(app.featurePrefix)
  );

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

  const handleSelect = (app: (typeof visibleApps)[number]) => {
    navigate(app.defaultRoute);
    onClose();
  };

  // Mobile: fullscreen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "hsl(215 28% 14%)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(215 25% 22%)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "hsl(210 20% 85%)" }}>Applications</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" style={{ color: "hsl(210 20% 85%)" }} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {visibleApps.map((app) =>
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
      className="fixed z-50 p-5 flex-col animate-in fade-in slide-in-from-top-2 duration-200 flex items-start justify-start my-[55px] mx-[10px]"
      style={{
        top: "44px",
        left: "4px",
        background: "hsl(215 28% 14% / 0.75)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid hsl(215 25% 40% / 0.25)",
        borderRadius: "0 0 12px 12px",
        boxShadow: "0 20px 50px -12px hsl(215 40% 5% / 0.6), inset 0 1px 0 0 hsl(0 0% 100% / 0.06)",
        width: "380px"
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

      <div className="grid grid-cols-4 gap-2.5">
        {visibleApps.map((app) =>
        <button
          key={app.key}
          onClick={() => handleSelect(app)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all duration-150 hover:scale-105"
          style={{
            width: "76px",
            height: "76px",
            background: "hsl(215 25% 18% / 0.5)",
            border: "1px solid hsl(215 25% 40% / 0.2)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "hsl(168 76% 42%)";
            e.currentTarget.style.background = "hsl(215 25% 20%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "hsl(215 25% 22%)";
            e.currentTarget.style.background = "hsl(215 25% 18%)";
          }}>

            <app.icon className="h-7 w-7" style={{ color: APP_COLORS[app.key] ?? "hsl(210 20% 85%)" }} />
            <span className="text-[10px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>{app.title}</span>
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