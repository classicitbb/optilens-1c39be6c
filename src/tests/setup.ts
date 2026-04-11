import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

const createStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
};

if (
  typeof window !== "undefined" &&
  (!window.localStorage || typeof window.localStorage.clear !== "function")
) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createStorage(),
  });
}

if (
  typeof globalThis !== "undefined" &&
  (!("localStorage" in globalThis) || typeof globalThis.localStorage?.clear !== "function")
) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: window.localStorage,
  });
}

if (typeof globalThis !== "undefined" && typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
}

afterEach(() => {
  cleanup();
});
