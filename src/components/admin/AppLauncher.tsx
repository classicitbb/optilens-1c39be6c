import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { CalendarCheck, Glasses, HelpCircle, Home, LayoutDashboard, Package, Search, X, type LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import { appColor } from "@/features/admin/core/config/appColors";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ACTIVE_NAVIGATION_REGISTRY } from "@/config/navigationRegistry";
import { cn } from "@/lib/utils";

const LAUNCH_PAD_APP = {
  key: "launchpad",
  title: "Launch Pad",
  icon: LayoutDashboard,
  defaultRoute: "/admin/dashboard",
} as const;

const LAUNCHER_SHORTCUTS = {
  activities: {
    key: "activities",
    title: "Activities",
    icon: CalendarCheck,
    defaultRoute: "/admin/crm/activities",
    featurePrefix: "crm",
  },
  "rx-order": {
    key: "rx-order",
    title: "Rx Order Form",
    icon: Glasses,
    defaultRoute: "/admin/website/quotations/new-rx",
    featurePrefix: "website",
  },
  "stock-order": {
    key: "stock-order",
    title: "Stock Order Builder",
    icon: Package,
    defaultRoute: "/admin/website/stock-orders",
    featurePrefix: "website",
  },
} as const;

const HOME_PAGE_SHORTCUT = {
  key: "home-page",
  title: "Home Page",
  icon: Home,
  defaultRoute: "/",
} as const;

interface LaunchItem {
  key: string;
  title: string;
  icon: LucideIcon;
  defaultRoute: string;
}

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

const LauncherTile = ({ item, onSelect }: { item: LaunchItem; onSelect: (item: LaunchItem) => void }) => {
  const color = appColor(item.key);
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      style={{ "--tile-accent": color } as CSSProperties}
      className="group flex h-[92px] flex-col items-center justify-center gap-2 rounded-xl border border-transparent px-1 text-center outline-none transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:bg-muted/60 focus-visible:border-[var(--tile-accent)] focus-visible:ring-2 focus-visible:ring-[var(--tile-accent)]/30"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <item.icon className="h-[22px] w-[22px]" />
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground/90">{item.title}</span>
    </button>
  );
};

const AppLauncher = ({ open, onClose }: AppLauncherProps) => (open ? <LauncherPanel onClose={onClose} /> : null);

const LauncherPanel = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { hasAppAccess } = useRolePermissions();
  const [query, setQuery] = useState("");

  const { apps, shortcuts } = useMemo(() => {
    const appsList: LaunchItem[] = [LAUNCH_PAD_APP];
    const shortcutList: LaunchItem[] = [];
    for (const item of ACTIVE_NAVIGATION_REGISTRY) {
      if (item.group !== "launcher") continue;
      if (item.shortcutKey) {
        const shortcut = LAUNCHER_SHORTCUTS[item.shortcutKey];
        if (hasAppAccess(shortcut.featurePrefix)) shortcutList.push(shortcut);
        continue;
      }
      if (!item.appKey) continue;
      const app = ADMIN_APPS[item.appKey];
      if (hasAppAccess(app.featurePrefix)) appsList.push(app);
    }
    shortcutList.push(HOME_PAGE_SHORTCUT);
    const dedupe = (list: LaunchItem[]) => list.filter((entry, index) => list.findIndex((other) => other.key === entry.key) === index);
    return { apps: dedupe(appsList), shortcuts: dedupe(shortcutList) };
  }, [hasAppAccess]);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = (item: LaunchItem) => !normalizedQuery || item.title.toLowerCase().includes(normalizedQuery);
  const filteredApps = apps.filter(matches);
  const filteredShortcuts = shortcuts.filter(matches);
  const firstMatch = filteredApps[0] ?? filteredShortcuts[0] ?? null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (isMobile) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-apps-toggle]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isMobile, onClose]);

  const handleSelect = (item: LaunchItem) => {
    navigate(item.defaultRoute);
    onClose();
  };

  const searchBox = (
    <label className="flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1.5 text-sm transition-colors focus-within:bg-muted hover:bg-muted">
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && firstMatch) {
            e.preventDefault();
            handleSelect(firstMatch);
          }
        }}
        placeholder="Jump to an app…"
        aria-label="Filter applications"
        className="w-full bg-transparent text-sm text-foreground outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground/80"
      />
      {query ? (
        <button type="button" onClick={() => setQuery("")} aria-label="Clear filter" className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        !isMobile && <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Enter</kbd>
      )}
    </label>
  );

  const sections = (
    <>
      {filteredApps.length > 0 && (
        <section>
          <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Applications</h4>
          <div className={cn("grid gap-1", isMobile ? "grid-cols-3" : "grid-cols-4")}>
            {filteredApps.map((item) => (
              <LauncherTile key={item.key} item={item} onSelect={handleSelect} />
            ))}
          </div>
        </section>
      )}
      {filteredShortcuts.length > 0 && (
        <section>
          <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Shortcuts</h4>
          <div className={cn("grid gap-1", isMobile ? "grid-cols-3" : "grid-cols-4")}>
            {filteredShortcuts.map((item) => (
              <LauncherTile key={item.key} item={item} onSelect={handleSelect} />
            ))}
          </div>
        </section>
      )}
      {filteredApps.length === 0 && filteredShortcuts.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">No apps match “{query}”.</p>
      )}
    </>
  );

  const footer = (
    <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
      <button
        type="button"
        onClick={() => {
          navigate("/admin/knowledge/wiki");
          onClose();
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Help &amp; wiki
      </button>
      {!isMobile && (
        <span>
          Search everything with <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </span>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="admin-surface fixed inset-0 z-50 flex flex-col bg-[hsl(var(--admin-card))] text-[hsl(var(--admin-content-fg))]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Applications</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pt-3">{searchBox}</div>
        <div className="flex-1 space-y-5 overflow-auto p-4">{sections}</div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Applications"
      className="admin-surface fixed left-2.5 top-[52px] z-50 flex w-[440px] flex-col gap-3 rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] p-3 text-[hsl(var(--admin-content-fg))] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {searchBox}
      <div className="space-y-4">{sections}</div>
      {footer}
    </div>
  );
};

export default AppLauncher;
