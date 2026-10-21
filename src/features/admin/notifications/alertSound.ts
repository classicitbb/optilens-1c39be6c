const COOLDOWN_MS = 6_000;
const PREFERENCE_KEY = "optilens.alert-sound.enabled";
let context: AudioContext | undefined;

export function isAlertSoundEnabled() {
  try { return localStorage.getItem(PREFERENCE_KEY) !== "false"; } catch { return true; }
}

export function setAlertSoundEnabled(enabled: boolean) {
  try { localStorage.setItem(PREFERENCE_KEY, String(enabled)); } catch { /* Browser storage may be unavailable. */ }
}

/** Call from a user gesture; browsers require interaction before playing audio. */
export async function unlockAlertSound() {
  try {
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    if (!context || context.state === "closed") context = new Constructor();
    if (context.state === "suspended") await context.resume();
  } catch { /* Sound is optional. */ }
}

function dingDong() {
  if (!context || context.state !== "running") return false;
  [784, 622.25].forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const start = context!.currentTime + index * 0.38;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + 0.7);
  });
  return true;
}

/** One sound across same-origin tabs, accounts and alert sources per cooldown. */
export async function playAlertSound(eventIds: string[] = []) {
  if (!isAlertSoundEnabled() || !context || context.state !== "running") return false;
  const key = "optilens.alert-sound.last-played";
  const play = () => {
    try {
      const eventsKey = `${key}.events`;
      const stored: Record<string, number> = JSON.parse(localStorage.getItem(eventsKey) || "{}");
      const events = Object.fromEntries(Object.entries(stored).filter(([, at]) => Date.now() - at < 86_400_000));
      if (eventIds.length > 0 && eventIds.every((id) => Object.prototype.hasOwnProperty.call(events, id))) return false;
      const last = Number(localStorage.getItem(key));
      // A batch arriving during another bell is covered by that bell too.
      for (const id of eventIds) events[id] = Date.now();
      const saveEvents = () => localStorage.setItem(eventsKey, JSON.stringify(Object.fromEntries(Object.entries(events).slice(-512))));
      if (last > 0 && Date.now() - last < COOLDOWN_MS) { saveEvents(); return false; }
      if (!isAlertSoundEnabled() || !dingDong()) return false;
      localStorage.setItem(key, String(Date.now()));
      saveEvents();
      return true;
    } catch { return false; } // Fail quietly when coordination storage is unavailable.
  };
  try {
    if (navigator.locks) return await navigator.locks.request(key, play);
    // Older browsers: a short election lets simultaneous tabs settle on one owner.
    const claimKey = `${key}.claim`;
    const token = crypto.randomUUID();
    localStorage.setItem(claimKey, token);
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    return localStorage.getItem(claimKey) === token && play();
  } catch { return false; }
}
