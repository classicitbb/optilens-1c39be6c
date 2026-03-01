import { type LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}

const AdminPageHeader = ({ icon: Icon, title, children }: AdminPageHeaderProps) => (
  <div className="flex items-center justify-between shrink-0">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[hsl(var(--admin-accent))]" />
      <h1 className="text-lg font-semibold text-[hsl(var(--admin-content-fg))]">{title}</h1>
    </div>
    {children}
  </div>
);

export default AdminPageHeader;
