import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUserRole } from "@/hooks/useUserRole";
import type { ReactNode } from "react";

export const PortalRouteErrorBoundary = ({ children, routeLabel }: { children: ReactNode; routeLabel?: string }) => {
  const { canEdit, isLoading } = useUserRole();

  return (
    <ErrorBoundary
      routeLabel={routeLabel}
      homeHref="/profile"
      isStaff={!isLoading && canEdit}
    >
      {children}
    </ErrorBoundary>
  );
};
