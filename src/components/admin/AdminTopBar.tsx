import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";

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
    viewer: "hsl(215 15% 50%)",
  };

  return (
    <header
      className="flex items-center gap-3 px-4 h-11 border-b shrink-0"
      style={{
        background: "hsl(0 0% 100%)",
        borderColor: "hsl(215 15% 85%)",
      }}
    >
      <div className="flex-1 min-w-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <Link to="/profile" className="text-xs hover:underline transition-colors" style={{ color: "hsl(215 30% 15%)" }}>{user?.email}</Link>
        {role && (
          <Badge
            className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
            style={{
              background: `${roleColor[role]}20`,
              color: roleColor[role],
            }}
          >
            {role}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSignOut}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
};

export default AdminTopBar;
