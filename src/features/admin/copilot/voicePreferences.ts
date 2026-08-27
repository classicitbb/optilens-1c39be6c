// Per-browser microphone preferences shared by every voice entry surface.
// localStorage throws in Safari private mode and in the unit test environment,
// so every access is guarded and falls back to the default.
const DEVICE_KEY = "cv.voice.deviceId";
const HOLD_KEY = "cv.voice.holdToRecord";

export const readStoredDeviceId = (): string | null => {
  try {
    return window.localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
};

export const storeDeviceId = (deviceId: string) => {
  try {
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  } catch {
    // Preference is best-effort; recording still works without it.
  }
};

export const readStoredHoldToRecord = (): boolean => {
  try {
    return window.localStorage.getItem(HOLD_KEY) === "1";
  } catch {
    return false;
  }
};

export const storeHoldToRecord = (value: boolean) => {
  try {
    window.localStorage.setItem(HOLD_KEY, value ? "1" : "0");
  } catch {
    // Preference is best-effort; recording still works without it.
  }
};
