import type { ReactNode } from "react";
import { Navigate, NavLink } from "react-router";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { cn } from "@/lib/utils";

/** Asset pages mirror the can_manage_assets() RLS check: admins and the office administrator. */
const AssetsRoute = ({ children }: { children: ReactNode }) => {
  const { isLoading, realRole } = useAdminRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (realRole !== "admin" && realRole !== "office_admin") {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const LINKS = [
  { to: "/admin/finance/assets", label: "Register", end: true },
  { to: "/admin/finance/assets/runs", label: "Depreciation runs" },
  { to: "/admin/finance/assets/reports", label: "Reports" },
  { to: "/admin/finance/assets/import", label: "Import" },
];

/** Links between the asset register's pages. */
export const AssetsNav = () => (
  <nav aria-label="Fixed assets" className="flex flex-wrap gap-1 border-b text-sm">
    {LINKS.map((l) => (
      <NavLink
        key={l.to}
        to={l.to}
        end={l.end}
        className={({ isActive }) =>
          cn("-mb-px border-b-2 px-3 py-2", isActive ? "border-[hsl(var(--admin-accent))] font-medium" : "border-transparent text-muted-foreground hover:text-foreground")
        }
      >
        {l.label}
      </NavLink>
    ))}
  </nav>
);

export default AssetsRoute;
