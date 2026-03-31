import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const HEARTBEAT_MS = 45_000;

export const usePresenceHeartbeat = (roleScope: "customer" | "staff" | "admin") => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isDisposed = false;
    let timer: number | null = null;

    const sendHeartbeat = async (status: "online" | "idle") => {
      if (isDisposed) return;
      await (supabase.rpc as any)("upsert_presence_heartbeat", {
        p_status: status,
        p_role_scope: roleScope,
      });
    };

    const tick = () => {
      void sendHeartbeat(document.hidden ? "idle" : "online");
      timer = window.setTimeout(tick, HEARTBEAT_MS);
    };

    const onVisibility = () => {
      void sendHeartbeat(document.hidden ? "idle" : "online");
    };

    void sendHeartbeat("online");
    timer = window.setTimeout(tick, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) window.clearTimeout(timer);
    };
  }, [roleScope, user]);
};
