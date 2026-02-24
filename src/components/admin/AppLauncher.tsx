import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Glasses, Users, Target, LifeBuoy, ShoppingCart, FileText, Globe } from "lucide-react";

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

const apps = [
  { label: "Optilens", icon: Glasses, path: "/admin/catalog", color: "hsl(215 65% 50%)" },
  { label: "Contacts", icon: Users, path: "/admin/erp/contacts", color: "hsl(168 76% 42%)" },
  { label: "CRM", icon: Target, path: "/admin/erp/crm", color: "hsl(280 60% 55%)" },
  { label: "Helpdesk", icon: LifeBuoy, path: "/admin/erp/helpdesk", color: "hsl(38 92% 50%)" },
  { label: "Web Orders", icon: ShoppingCart, path: "/admin/erp/web-orders", color: "hsl(140 50% 45%)" },
  { label: "RX Orders", icon: FileText, path: "/admin/erp/rx-orders", color: "hsl(0 72% 51%)" },
  { label: "Website", icon: Globe, path: "/admin/erp/website", color: "hsl(200 60% 50%)" },
];

const AppLauncher = ({ open, onClose }: AppLauncherProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "hsl(215 30% 8% / 0.7)", backdropFilter: "blur(4px)" }} />
      {/* Panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 p-6 border"
        style={{
          background: "hsl(215 28% 14%)",
          borderColor: "hsl(215 25% 22%)",
          borderRadius: "12px",
          boxShadow: "0 25px 60px -12px hsl(215 40% 5% / 0.5)",
          maxWidth: "420px",
          width: "90vw",
        }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(210 20% 85%)" }}>
          Applications
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => { navigate(app.path); onClose(); }}
              className="flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:scale-105 group"
              style={{
                width: "80px",
                height: "80px",
                background: "hsl(215 25% 18%)",
                borderRadius: "8px",
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
              <app.icon className="h-8 w-8" style={{ color: app.color }} />
              <span className="text-[10px] font-medium" style={{ color: "hsl(210 20% 85%)" }}>
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLauncher;
