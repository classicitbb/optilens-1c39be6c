import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  to: string;
  icon?: ComponentType<{className?: string;}>;
  disabled?: boolean;
  exact?: boolean;
  badge?: ReactNode;
}

interface SidebarNavListProps {
  items: SidebarNavItem[];
  pathname: string;
  collapsed?: boolean;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
  disabledItemClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

const SidebarNavList = ({
  items,
  pathname,
  collapsed = false,
  className,
  itemClassName,
  activeItemClassName,
  inactiveItemClassName,
  disabledItemClassName,
  iconClassName,
  labelClassName
}: SidebarNavListProps) => {
  return (
    <nav className={className}>
      {items.map(({ label, to, icon: Icon, disabled, exact, badge }) => {
        const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

        if (disabled) {
          return (
            <span
              key={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60",
                itemClassName,
                disabledItemClassName
              )}>
              
              {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
              {!collapsed ? <span className={labelClassName}>{label}</span> : null}
            </span>);

        }

        return (
          <Link
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              itemClassName,
              active ? activeItemClassName : inactiveItemClassName
            )}>
            
            {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
            {!collapsed ? <span className={cn("truncate text-sidebar-foreground", labelClassName)}>{label}</span> : null}
            {!collapsed ? badge : null}
          </Link>);

      })}
    </nav>);

};

export default SidebarNavList;