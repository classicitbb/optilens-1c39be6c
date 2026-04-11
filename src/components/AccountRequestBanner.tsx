import { useState } from "react";
import { Link } from "react-router";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { createAuthHref } from "@/lib/authFlow";

const DISMISSED_KEY = "account_request_banner_dismissed";

export const useAccountRequestDismissed = () => {
  return localStorage.getItem(DISMISSED_KEY) === "true";
};

const AccountRequestBanner = () => {
  const { user } = useAuth();
  const { role, isLoading } = useUserRole();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  const onboardingAudience = typeof user?.user_metadata?.audience === "string" ? user.user_metadata.audience : null;
  const shouldShowVisitorCta = !user && !isLoading && !dismissed;
  const shouldShowProfessionalFollowUp = !!user && !isLoading && !role && !dismissed && onboardingAudience !== "patient";

  if (!shouldShowVisitorCta && !shouldShowProfessionalFollowUp) return null;

  const handleDismiss = () => {
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
            {shouldShowVisitorCta
              ? "Explore trade pricing, product visibility, and faster next steps with the guided professional signup flow."
              : "You’re signed in. Request trade follow-up to keep your onboarding moving and get the right team involved."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" className="text-xs" asChild>
            {shouldShowVisitorCta ? (
              <Link to={createAuthHref({ mode: "signup", audience: "professional", intent: "products", redirect: "/" })}>
                Start Trade Signup
              </Link>
            ) : (
              <Link to="/professionals/trade-account">Request Trade Follow-up</Link>
            )}
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
