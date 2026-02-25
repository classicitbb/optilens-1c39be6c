import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Glasses, Users, Target, LifeBuoy, ShoppingCart, FileText, Globe,
  Settings, Ship, FileSpreadsheet, ArrowLeft, HelpCircle, X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

const apps = [
  { label: "OpticAdmin", icon: Glasses, path: "/admin/catalog-publisher", color: "hsl(215 65% 50%)" },
  { label: "Contacts", icon: Users, path: "/admin/erp/contacts", color: "hsl(168 76% 42%)" },
  { label: "CRM", icon: Target, path: "/admin/erp/crm", color: "hsl(280 60% 55%)" },
  { label: "Helpdesk", icon: LifeBuoy, path: "/admin/erp/helpdesk", color: "hsl(38 92% 50%)" },
  { label: "Web Orders", icon: ShoppingCart, path: "/admin/erp/web-orders", color: "hsl(140 50% 45%)" },
  { label: "RX Orders", icon: FileText, path: "/admin/erp/rx-orders", color: "hsl(0 72% 51%)" },
  { label: "Website", icon: Globe, path: "/admin/erp/website", color: "hsl(200 60% 50%)" },
  { label: "Quotations", icon: FileSpreadsheet, path: "/admin/quotations", color: "hsl(260 50% 55%)" },
  { label: "Costings", icon: Ship, path: "/admin/costings/shipments", color: "hsl(20 70% 50%)" },
  { label: "Content", icon: Globe, path: "/admin/content", color: "hsl(310 50% 50%)" },
  { label: "Users", icon: Users, path: "/admin/users", color: "hsl(190 60% 45%)" },
  { label: "Settings", icon: Settings, path: "/admin/parameters", color: "hsl(215 15% 50%)" },
];

const AppLauncher = ({ open, onClose }: AppLauncherProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!open || isMobile) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking the Apps toggle button itself (AdminTopBar handles that)
      if (target.closest('[data-apps-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick); };
  }, [open, isMobile, onClose]);

  if (!open) return null;

  // Mobile: fullscreen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "hsl(215 28% 14%)" }}>
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(215 25% 22%)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "hsl(210 20% 85%)" }}>Applications</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" style={{ color: "hsl(210 20% 85%)" }} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {apps.map((app) => (
              <button
                key={app.label}
                onClick={() => { navigate(app.path); onClose(); }}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-colors"
                style={{ background: "hsl(215 25% 18%)", border: "1px solid hsl(215 25% 22%)" }}
              >
                <app.icon className="h-8 w-8" style={{ color: app.color }} />
                <span className="text-[11px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>{app.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Back to site */}
        <button
          onClick={() => { navigate("/"); onClose(); }}
          className="flex items-center justify-center gap-2 py-3 transition-colors hover:bg-white/10"
          style={{ color: "hsl(210 15% 65%)", borderTop: "1px solid hsl(215 25% 22%)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Back to Site</span>
        </button>
      </div>
    );
  }

  // Desktop: flyout from top-left, anchored below the header
  return (
    <div
      ref={panelRef}
      className="fixed z-50 p-5 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: "44px", // below the h-11 header
        left: "4px",
        background: "hsl(215 28% 14%)",
        borderColor: "hsl(215 25% 22%)",
        border: "1px solid hsl(215 25% 22%)",
        borderRadius: "0 0 12px 12px",
        boxShadow: "0 20px 50px -12px hsl(215 40% 5% / 0.6)",
        width: "380px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "hsl(210 20% 85%)" }}>Applications</h3>
        <button
          onClick={() => { navigate("/admin/wiki"); onClose(); }}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Help / Wiki"
        >
          <HelpCircle className="h-4 w-4" style={{ color: "hsl(215 65% 50%)" }} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {apps.map((app) => (
          <button
            key={app.label}
            onClick={() => { navigate(app.path); onClose(); }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all duration-150 hover:scale-105"
            style={{
              width: "76px",
              height: "76px",
              background: "hsl(215 25% 18%)",
              border: "1px solid hsl(215 25% 22%)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "hsl(168 76% 42%)";
              e.currentTarget.style.background = "hsl(215 25% 20%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "hsl(215 25% 22%)";
              e.currentTarget.style.background = "hsl(215 25% 18%)";
            }}
          >
            <app.icon className="h-7 w-7" style={{ color: app.color }} />
            <span className="text-[10px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>{app.label}</span>
          </button>
        ))}
      </div>

      {/* Back to site */}
      <button
        onClick={() => { navigate("/"); onClose(); }}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-md transition-colors hover:bg-white/10"
        style={{ color: "hsl(210 15% 65%)", borderTop: "1px solid hsl(215 25% 22%)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-medium">Back to Site</span>
      </button>
    </div>
  );
};

export default AppLauncher;
