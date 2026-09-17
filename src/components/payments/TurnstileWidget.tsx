import { useEffect, useRef } from "react";

// Cloudflare Turnstile. Loaded on demand so the script is never fetched on
// pages that do not need it.
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const loadScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire: () => void;
}

/**
 * Renders nothing when VITE_TURNSTILE_SITE_KEY is unset. The server refuses
 * self-serve payments without its own secret anyway, so a missing key must
 * surface as "unavailable", never as an unprotected form.
 */
const TurnstileWidget = ({ onVerify, onExpire }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    const container = containerRef.current;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: onVerify,
          "expired-callback": onExpire,
          "error-callback": onExpire,
        });
      })
      .catch(() => onExpire());

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onExpire, onVerify, siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center" />;
};

export default TurnstileWidget;
