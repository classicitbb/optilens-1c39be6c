import { PublicState } from "./PublicState";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function ConnectionNotice({ description = "You can still read what is already on this page. Reconnect to send a request or load new content." }: { description?: string }) {
  const online = useOnlineStatus();
  return online ? null : <PublicState tone="offline" title="You’re offline" description={description} announce />;
}
