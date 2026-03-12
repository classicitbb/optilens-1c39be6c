import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TopBarActionClusterProps {
  className?: string;
  utilities?: ReactNode;
  identity?: ReactNode;
  menu?: ReactNode;
}

const TopBarActionCluster = ({ className, utilities, identity, menu }: TopBarActionClusterProps) => {
  return (
    <div className={cn("flex items-center justify-end gap-2 sm:gap-3", className)}>
      {utilities}
      {identity}
      {menu}
    </div>
  );
};

export default TopBarActionCluster;
