import { Link } from "react-router-dom";
import { ArrowLeft, Bell, ChevronDown, CircleHelp, LogOut, Search } from "lucide-react";
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
  displayName: string;
  onSignOut: () => void;
}

const AccountTopBar = ({ displayName, onSignOut }: AccountTopBarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 md:px-4">
        <div className="min-w-0">
          <Button variant="ghost" asChild className="h-7 max-w-full gap-1.5 px-2 text-xs sm:text-sm">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Website</span>
            </Link>
          </Button>
        </div>

        <h1 className="px-2 text-sm font-semibold tracking-tight text-foreground">My Account</h1>

        <TopBarActionCluster
          className="min-w-0 gap-1 justify-self-end"
          utilities={
            <>
              <button
                type="button"
                disabled
                aria-disabled="true"
                tabIndex={-1}
                className="inline-flex h-7 max-w-[8rem] items-center gap-1.5 rounded-md border border-border/60 px-2 text-xs text-muted-foreground opacity-60"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Search</span>
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Notifications">
                <Bell className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Help">
                <CircleHelp className="h-3.5 w-3.5" />
              </Button>
            </>
          }
          identity={<span className="max-w-28 truncate text-sm font-medium text-foreground">{displayName}</span>}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 shrink-0 gap-1 px-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] uppercase">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
