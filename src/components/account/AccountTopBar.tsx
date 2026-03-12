import { Link } from "react-router-dom";
import { Bell, ChevronDown, CircleHelp, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TopBarActionCluster from "@/components/shared/TopBarActionCluster";

interface AccountTopBarProps {
  pageTitle: string;
  displayName: string;
  onSignOut: () => void;
}

const AccountTopBar = ({ pageTitle, displayName, onSignOut }: AccountTopBarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/">Back to Website</Link>
          </Button>
        </div>

        <h1 className="text-sm font-semibold tracking-wide text-foreground sm:text-base">{pageTitle}</h1>

        <TopBarActionCluster
          utilities={
            <>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Help">
                <CircleHelp className="h-4 w-4" />
              </Button>
            </>
          }
          identity={<span className="hidden text-sm font-medium text-foreground md:inline">{displayName}</span>}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs uppercase">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile Home</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </div>
    </header>
  );
};

export default AccountTopBar;
