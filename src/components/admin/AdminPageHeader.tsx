import { type LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}

const AdminPageHeader = ({ icon: Icon, title, children }: AdminPageHeaderProps) => (
  <div className="flex items-center justify-between shrink-0">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: "hsl(215 65% 50%)" }} />
      <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>{title}</h1>
    </div>
    {children}
  </div>
);

export default AdminPageHeader;
