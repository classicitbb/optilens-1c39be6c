import { useSyncExternalStore } from "react";

const subscribers = new Set<() => void>();
const notifySubscribers = () => subscribers.forEach((notify) => notify());
const subscribe = (notify: () => void) => {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    window.addEventListener("online", notifySubscribers);
    window.addEventListener("offline", notifySubscribers);
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      window.removeEventListener("online", notifySubscribers);
      window.removeEventListener("offline", notifySubscribers);
    }
  };
};

/** Browser connectivity is a hint; individual requests must still handle failure. */
export const useOnlineStatus = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
