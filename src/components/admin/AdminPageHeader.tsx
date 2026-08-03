import { type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  tooltip?: React.ReactNode;
  children?: React.ReactNode;
}

const AdminPageHeader = ({ icon: Icon, title, tooltip, children }: AdminPageHeaderProps) => (
  <div className="flex items-center justify-between shrink-0">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[hsl(var(--admin-accent))]" />
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <h1 tabIndex={0} className="cursor-help text-lg font-semibold text-[hsl(var(--admin-content-fg))]">{title}</h1>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        <h1 className="text-lg font-semibold text-[hsl(var(--admin-content-fg))]">{title}</h1>
      )}
    </div>
    {children}
  </div>
);

export default AdminPageHeader;
