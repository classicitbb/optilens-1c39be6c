import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface AdminRoleContextType {
  role: AppRole | null;
  realRole: AppRole | null;
  isLoading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  isImpersonating: boolean;
  impersonatedUserName: string | null;
  startImpersonation: (role: AppRole, userName: string) => void;
  stopImpersonation: () => void;
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
  return ctx ?? {
    role: null, realRole: null, isLoading: false, canEdit: false,
    isAdmin: false, hasAccess: false, isImpersonating: false,
    impersonatedUserName: null,
    startImpersonation: () => {}, stopImpersonation: () => {},
  };
};

export const AdminRoleProvider = ({ children }: { children: ReactNode }) => {
  const roleData = useUserRole();
  const [impersonatedRole, setImpersonatedRole] = useState<AppRole | null>(() => {
    const stored = sessionStorage.getItem("impersonate-role");
    return stored ? (stored as AppRole) : null;
  });
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(() => {
    return sessionStorage.getItem("impersonate-name");
  });

  const startImpersonation = useCallback((role: AppRole, userName: string) => {
    sessionStorage.setItem("impersonate-role", role);
    sessionStorage.setItem("impersonate-name", userName);
    setImpersonatedRole(role);
    setImpersonatedUserName(userName);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem("impersonate-role");
    sessionStorage.removeItem("impersonate-name");
    setImpersonatedRole(null);
    setImpersonatedUserName(null);
  }, []);

  const isImpersonating = roleData.isAdmin && impersonatedRole !== null;
  const activeRole = isImpersonating ? impersonatedRole : roleData.role;

  const value: AdminRoleContextType = {
    role: activeRole,
    realRole: roleData.role,
    isLoading: roleData.isLoading,
    canEdit: activeRole === "admin" || activeRole === "operator",
    isAdmin: activeRole === "admin",
    hasAccess: !!activeRole,
    isImpersonating,
    impersonatedUserName,
    startImpersonation,
    stopImpersonation,
  };

  return <AdminRoleContext.Provider value={value}>{children}</AdminRoleContext.Provider>;
};
