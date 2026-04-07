import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { COOKIE_PREFERENCES_EVENT, hasAnalyticsConsent } from "@/lib/cookieConsent";
import { flushTrackedSession, shouldTrackWebsitePath, trackPageView, trackWebVital } from "@/lib/websiteAnalytics";

const useAnalyticsConsentState = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(hasAnalyticsConsent());

    const handleChange = () => setEnabled(hasAnalyticsConsent());
    window.addEventListener(COOKIE_PREFERENCES_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void trackPageView(pathname);
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      void flushTrackedSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      if (cancelled) return;

      const report = (metric: { id: string; name: string; value: number; delta: number; rating: string }) => {
        void trackWebVital({ ...metric, pathname: window.location.pathname });
      };

      onCLS(report);
      onFCP(report);
      onINP(report);
      onLCP(report);
      onTTFB(report);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled;
};

const shouldSendToVercel = (url: string) => {
  try {
    const { pathname } = new URL(url);
    return shouldTrackWebsitePath(pathname);
  } catch {
    return false;
  }
};

const RuntimeAnalytics = () => {
  const enabled = useAnalyticsConsentState();

  if (!enabled) return null;

  return (
    <>
      <Analytics beforeSend={(event) => (shouldSendToVercel(event.url) ? event : null)} />
      <SpeedInsights beforeSend={(event) => (shouldSendToVercel(event.url) ? event : null)} />
    </>
  );
};

export default RuntimeAnalytics;
