import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Redirects any /admin* or /ops* request hitting a non-admin host to
 * https://admin.classicvisions.net, preserving the path, search, and hash.
 *
 * Hosts considered "admin" (no redirect): admin.classicvisions.net and any
 * localhost / lovable preview/sandbox host so development is not affected.
 */
const ADMIN_HOST = "admin.classicvisions.net";

const isAdminHost = (hostname: string) => {
  if (hostname === ADMIN_HOST) return true;
  // Never redirect during local dev or inside the Lovable editor preview /
  // sandbox so engineers can keep working on /admin without being bounced.
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com")) return true;
  return false;
};

const AdminHostRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hostname, pathname, search, hash } = window.location;
    if (isAdminHost(hostname)) return;
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/ops")) return;
    window.location.replace(`https://${ADMIN_HOST}${pathname}${search}${hash}`);
  }, [location.pathname]);

  return null;
};

export default AdminHostRedirect;
