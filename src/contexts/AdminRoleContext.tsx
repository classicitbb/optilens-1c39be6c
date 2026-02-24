import { createContext, useContext, ReactNode } from "react";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface AdminRoleContextType {
  role: AppRole | null;
  isLoading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
}

const AdminRoleContext = createContext<AdminRoleContextType | undefined>(undefined);

export const useAdminRole = () => {
  const ctx = useContext(AdminRoleContext);
  if (!ctx) throw new Error("useAdminRole must be used within AdminRoleProvider");
  return ctx;
};

/** Safe version that returns defaults when used outside AdminRoleProvider */
export const useAdminRoleSafe = (): AdminRoleContextType => {
  const ctx = useContext(AdminRoleContext);
  return ctx ?? { role: null, isLoading: false, canEdit: false, isAdmin: false, hasAccess: false };
};

export const AdminRoleProvider = ({ children }: { children: ReactNode }) => {
  const roleData = useUserRole();
  return <AdminRoleContext.Provider value={roleData}>{children}</AdminRoleContext.Provider>;
};
