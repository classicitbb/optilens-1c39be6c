import type { ReactNode } from "react";
import PortalAccessNotice from "@/components/account/PortalAccessNotice";
import { type PortalFeature, usePortalIdentity } from "@/hooks/usePortalIdentity";

interface PortalFeatureGateProps {
  feature: PortalFeature;
  children: ReactNode;
}

const PortalFeatureGate = ({ feature, children }: PortalFeatureGateProps) => {
  const { canAccessFeature, isLoading, isStaff } = usePortalIdentity();

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isStaff && !canAccessFeature(feature)) {
    return <PortalAccessNotice feature={feature} />;
  }

  return <>{children}</>;
};

export default PortalFeatureGate;
