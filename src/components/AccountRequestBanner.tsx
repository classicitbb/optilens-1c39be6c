import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DISMISSED_KEY = "account_request_banner_dismissed";

export const useAccountRequestDismissed = () => {
  return localStorage.getItem(DISMISSED_KEY) === "true";
};

const AccountRequestBanner = () => {
  const { user } = useAuth();
  const { role, isLoading } = useUserRole();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  if (!user || isLoading || role || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleRequest = () => {
    toast({
      title: "Request Submitted",
      description: "Your customer account request has been sent. We'll be in touch shortly!",
    });
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground backdrop-blur-sm border-b border-primary/20 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
            <UserPlus className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium truncate">
            Welcome! Would you like to sign up for a customer account to access exclusive pricing and place orders?
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={handleRequest}
          >
            Request Account
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 hover:bg-primary-foreground/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountRequestBanner;
