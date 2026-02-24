import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Badge } from "@/components/ui/badge";
import { LogOut, HelpCircle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import HelpPanel from "./HelpPanel";
import AppLauncher from "./AppLauncher";

const AdminTopBar = () => {
  const { user, signOut } = useAuth();
  const { role } = useAdminRole();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(() => {
    const shown = sessionStorage.getItem("admin-launcher-shown");
    if (!shown) {
      sessionStorage.setItem("admin-launcher-shown", "1");
      return true;
    }
    return false;
  });

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
    <>
      <header
        className="flex items-center gap-3 px-4 h-11 border-b shrink-0 rounded-none"
        style={{
          background: "hsl(0 0% 100%)",
          borderColor: "hsl(215 15% 85%)"
        }}>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setLauncherOpen(!launcherOpen)}
          title="Applications"
        >
          <LayoutGrid className="h-[18px] w-[18px]" style={{ color: "hsl(215 15% 50%)" }} />
        </Button>

        <div className="flex-1 min-w-0">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="text-xs hover:underline transition-colors" style={{ color: "hsl(215 30% 15%)" }}>{user?.email}</Link>
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
      </header>
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </>);

};

export default AdminTopBar;