import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long figures stay visible after "Show" before the filter comes back on its own. */
export const REVEAL_SECONDS = 30;
/** Pages with tabs give each tab its own, longer timer. */
export const TAB_REVEAL_SECONDS = 60;

type PrivacyState = { hidden: boolean; secondsLeft: number; reveal: () => void; hide: () => void };

// Without a provider everything stays hidden, so a missed provider fails safe.
const PrivacyContext = createContext<PrivacyState>({ hidden: true, secondsLeft: 0, reveal: () => {}, hide: () => {} });

/** Anything that shows someone is still working on the page. Moving, clicking, typing, scrolling and focusing a field all count. */
const ACTIVITY_EVENTS = ["mousemove", "pointerdown", "keydown", "input", "focusin", "wheel", "scroll", "touchstart"] as const;

/**
 * Salary figures and HR notes start blurred; a user can lift the filter briefly.
 * The countdown only runs while the page is idle: any activity puts it back to the full time,
 * so someone who is working in a revealed form is not timed out.
 */
export const PrivacyFilterProvider = ({ children, seconds = REVEAL_SECONDS }: { children: ReactNode; seconds?: number }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivity = useRef(0);
  const revealed = secondsLeft > 0;
  const reveal = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(seconds);
  }, [seconds]);
  const hide = useCallback(() => setSecondsLeft(0), []);

  // A ref, not state, so a stream of mouse moves does not re-render the page.
  useEffect(() => {
    if (!revealed) return;
    const touch = () => { lastActivity.current = Date.now(); };
    for (const name of ACTIVITY_EVENTS) document.addEventListener(name, touch, { capture: true, passive: true });
    return () => { for (const name of ACTIVITY_EVENTS) document.removeEventListener(name, touch, { capture: true }); };
  }, [revealed]);

  // The time left is whatever remains of `seconds` since the last activity.
  useEffect(() => {
    if (!revealed) return;
    const timer = setInterval(() => {
      const idle = Math.floor((Date.now() - lastActivity.current) / 1000);
      setSecondsLeft(Math.max(seconds - idle, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [revealed, seconds]);

  // Switching tabs or locking the screen puts the filter straight back.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setSecondsLeft(0); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <PrivacyContext.Provider value={{ hidden: secondsLeft <= 0, secondsLeft, reveal, hide }}>
      {children}
    </PrivacyContext.Provider>
  );
};

/** Blurs its children while the filter is on. `block` wraps a whole section (forms included) instead of one value. */
export const Private = ({ children, block = false, className }: { children: ReactNode; block?: boolean; className?: string }) => {
  const { hidden } = useContext(PrivacyContext);
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={cn(hidden && "pointer-events-none select-none blur-sm", className)}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      data-private={hidden ? "hidden" : "shown"}
    >
      {children}
    </Tag>
  );
};

export const PrivacyToggle = () => {
  const { hidden, secondsLeft, reveal, hide } = useContext(PrivacyContext);
  return hidden ? (
    <Button size="sm" variant="outline" onClick={reveal}>
      <Eye className="mr-1 h-4 w-4" /> Show figures
    </Button>
  ) : (
    <Button size="sm" variant="secondary" onClick={hide}>
      <EyeOff className="mr-1 h-4 w-4" /> Hide ({secondsLeft}s)
    </Button>
  );
};

/**
 * One tab's own filter. Tab content unmounts when you leave the tab, so coming back finds the
 * figures hidden, and "Show" starts a fresh 60s countdown for this tab alone.
 */
export const PrivacyScope = ({ children, toggle = true }: { children: ReactNode; toggle?: boolean }) => (
  <PrivacyFilterProvider seconds={TAB_REVEAL_SECONDS}>
    {toggle && <div className="mb-3 flex justify-end"><PrivacyToggle /></div>}
    {children}
  </PrivacyFilterProvider>
);
