import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AdminTopBar = () => {
  const { user, signOut } = useAuth();
  const { role } = useAdminRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const roleColor: Record<string, string> = {
    admin: "hsl(0 72% 51%)",
    operator: "hsl(215 65% 50%)",
    viewer: "hsl(215 15% 50%)"
  };

  return (
    <header
      className="flex items-center justify-between px-4 h-11 border-b shrink-0"
      style={{
        background: "hsl(0 0% 100%)",
        borderColor: "hsl(215 15% 85%)"
      }}>

      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(215 15% 50%)" }}>
          Internal Tool
        </span>
        <div className="relative">
          
          <Input
            placeholder="Search..."
            className="h-7 w-48 pl-7 text-xs border"
            style={{
              borderColor: "hsl(215 15% 85%)",
              borderRadius: "4px",
              background: "hsl(210 20% 97%)"
            }} />

        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "hsl(215 30% 15%)" }}>{user?.email}</span>
        {role &&
        <Badge
          className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
          style={{
            background: `${roleColor[role]}20`,
            color: roleColor[role]
          }}>

            {role}
          </Badge>
        }
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSignOut}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>);

};

export default AdminTopBar;