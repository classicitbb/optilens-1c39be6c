import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";

const RECENT_MODULES_KEY = "admin-recent-modules";

export function useRecentModules() {
  const location = useLocation();
  const [recentPaths, setRecentPaths] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_MODULES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Only track if it's a known sidebar item route
    const isValidModuleRoute = Object.values(ADMIN_APPS).some(app => 
      app.sidebarItems.some(item => item.route === currentPath)
    );

    if (isValidModuleRoute) {
      setRecentPaths(prev => {
        // Remove if exists, then prepend to top
        const filtered = prev.filter(p => p !== currentPath);
        const updated = [currentPath, ...filtered].slice(0, 5);
        
        try {
          window.localStorage.setItem(RECENT_MODULES_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        
        return updated;
      });
    }
  }, [location.pathname]);

  return recentPaths;
}
