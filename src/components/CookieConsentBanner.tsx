import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, Settings, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie_consent";
const CONSENT_PREFERENCES_KEY = "cookie_preferences";

export type CookiePreferences = {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
};

export const getCookiePreferences = (): CookiePreferences | null => {
  const stored = localStorage.getItem(CONSENT_PREFERENCES_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const hasGivenConsent = (): boolean => {
  return localStorage.getItem(CONSENT_KEY) !== null;
};

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Check if user has already given consent
    if (!hasGivenConsent()) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    localStorage.setItem(CONSENT_PREFERENCES_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    });
  };

  const handleSavePreferences = () => {
    saveConsent({ ...preferences, necessary: true });
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl">
        <div className="container mx-auto px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 lg:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  We use cookies to enhance your experience
                </p>
                <p className="text-xs text-muted-foreground">
                  We use cookies and similar technologies to personalize content, analyze traffic, and improve our services. 
                  By clicking "Accept All", you consent to our use of cookies. Read our{" "}
                  <Link to="/legal/cookie-policy" className="text-primary underline hover:no-underline">
                    Cookie Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/legal/privacy-policy" className="text-primary underline hover:no-underline">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreferences(true)}
                className="text-xs"
              >
                <Settings className="mr-1 h-3 w-3" />
                Manage Preferences
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs"
              >
                <Check className="mr-1 h-3 w-3" />
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences below. Essential cookies are required for the website to function and cannot be disabled.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Necessary cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Essential Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Required for basic website functionality, security, and authentication.
                </p>
              </div>
              <Switch checked disabled className="opacity-50" />
            </div>

            {/* Analytics cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Analytics Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Help us understand how visitors interact with our website to improve user experience.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) => setPreferences((p) => ({ ...p, analytics: checked }))}
              />
            </div>

            {/* Marketing cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Marketing Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Used to deliver personalized advertisements and measure campaign effectiveness.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) => setPreferences((p) => ({ ...p, marketing: checked }))}
              />
            </div>

            {/* Functional cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Functional Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Enable enhanced functionality like remembering your preferences and settings.
                </p>
              </div>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) => setPreferences((p) => ({ ...p, functional: checked }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRejectAll} className="flex-1">
              Reject All
            </Button>
            <Button onClick={handleSavePreferences} className="flex-1">
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
