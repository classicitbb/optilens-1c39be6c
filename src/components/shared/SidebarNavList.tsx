import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
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

const activateOnSpace = (event: KeyboardEvent<HTMLAnchorElement>) => {
  if (event.key === " ") {
    event.preventDefault();
    event.currentTarget.click();
  }
};

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
  labelClassName,
}: SidebarNavListProps) => {
  const collapsedItemBaseClassName =
    "flex h-8 w-8 items-center justify-center p-0 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const flyoutBaseClassName =
    "pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-sidebar-bg))] px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--admin-sidebar-fg))] opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav-item:pointer-events-auto group-hover/nav-item:opacity-100 group-focus-within/nav-item:pointer-events-auto group-focus-within/nav-item:opacity-100";

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map(({ label, to, icon: Icon, disabled, exact, badge }) => {
        const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        const itemStateClassName = disabled
          ? cn("text-muted-foreground opacity-60", disabledItemClassName)
          : active
            ? activeItemClassName
            : inactiveItemClassName;

        if (!collapsed) {
          if (disabled) {
            return (
              <span
                key={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  itemClassName,
                  itemStateClassName,
                )}
              >
                {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
                <span className={labelClassName}>{label}</span>
                {badge}
              </span>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                itemClassName,
                itemStateClassName,
              )}
            >
              {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
              <span className={cn("truncate", labelClassName)}>{label}</span>
              {badge}
            </Link>
          );
        }

        return (
          <div key={to} className="group/nav-item relative flex justify-center">
            {disabled ? (
              <span
                aria-disabled="true"
                className={cn(
                  collapsedItemBaseClassName,
                  itemStateClassName,
                )}
              >
                {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
              </span>
            ) : (
              <Link
                to={to}
                onKeyDown={activateOnSpace}
                className={cn(
                  collapsedItemBaseClassName,
                  itemStateClassName,
                )}
              >
                {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} /> : null}
              </Link>
            )}

            <span
              className={cn(
                flyoutBaseClassName,
                disabled ? "pointer-events-none" : "focus-visible:opacity-100 focus-visible:outline-none",
                labelClassName,
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarNavList;
