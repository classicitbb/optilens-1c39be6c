import { useAuth } from "@/contexts/AuthContext";
import { createAuthHref } from "@/lib/authFlow";

/** Signed-in only once auth has resolved, so the signed-out view never briefly shows account detail. */
export const useHomeSignedIn = () => {
  const { user, loading } = useAuth();
  return !loading && Boolean(user);
};

/** Account pages live under /profile; signed-out visitors are sent to sign in first, then on to the page. */
export const isAccountPath = (href: string) => href.startsWith("/profile");

export const homeLinkHref = (href: string, signedIn: boolean) =>
  !signedIn && isAccountPath(href) ? createAuthHref({ mode: "signin", redirect: href }) : href;

/** "Track an order" → "Sign in to track an order" for account pages when signed out. */
export const homeLinkLabel = (label: string, href: string, signedIn: boolean) =>
  !signedIn && isAccountPath(href) ? `Sign in to ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
