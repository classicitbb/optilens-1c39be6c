import { beforeEach, describe, expect, it, vi } from "vitest";
const audio = vi.hoisted(() => ({ start: vi.fn(), state: "running" }));
class FakeAudioContext {
  state = audio.state;
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator() { return { frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: audio.start, stop: vi.fn() }; }
  createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; }
}
describe("ding dong coordination", () => {
  beforeEach(() => {
    vi.resetModules(); localStorage.clear(); vi.clearAllMocks(); audio.state = "running";
    Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
    let queue = Promise.resolve();
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_key: string, callback: () => unknown) => {
      const result = queue.then(callback); queue = result.then(() => undefined); return result;
    } } });
  });
  it("plays exactly two notes for simultaneous requests from independent tabs", async () => {
    const first = await import("@/features/admin/notifications/alertSound");
    first.unlockAlertSound();
    vi.resetModules();
    const second = await import("@/features/admin/notifications/alertSound");
    second.unlockAlertSound();
    const results = await Promise.all([first.playAlertSound(), second.playAlertSound(), first.playAlertSound()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(audio.start).toHaveBeenCalledTimes(2);
  });
  it("does not replay the same notification when another tab polls later", async () => {
    const first = await import("@/features/admin/notifications/alertSound"); first.unlockAlertSound();
    expect(await first.playAlertSound(["notification:one"])).toBe(true);
    localStorage.setItem("optilens.alert-sound.last-played", String(Date.now() - 10_000));
    vi.resetModules(); const second = await import("@/features/admin/notifications/alertSound"); second.unlockAlertSound();
    expect(await second.playAlertSound(["notification:one"])).toBe(false);
    expect(await second.playAlertSound(["notification:two"])).toBe(true);
    expect(audio.start).toHaveBeenCalledTimes(4);
  });
  it("allows another tab to take over after cooldown", async () => {
    const sound = await import("@/features/admin/notifications/alertSound"); sound.unlockAlertSound();
    localStorage.setItem("optilens.alert-sound.last-played", String(Date.now() - 6001));
    expect(await sound.playAlertSound()).toBe(true);
  });
  it("does not claim playback when audio is locked", async () => {
    audio.state = "suspended";
    const sound = await import("@/features/admin/notifications/alertSound"); sound.unlockAlertSound();
    expect(await sound.playAlertSound()).toBe(false);
    expect(localStorage.getItem("optilens.alert-sound.last-played")).toBeNull();
  });
  it("shares mute preference between tab instances", async () => {
    const first = await import("@/features/admin/notifications/alertSound"); first.unlockAlertSound(); first.setAlertSoundEnabled(false);
    vi.resetModules(); const second = await import("@/features/admin/notifications/alertSound"); second.unlockAlertSound();
    expect(await second.playAlertSound()).toBe(false); expect(audio.start).not.toHaveBeenCalled();
  });
  it("elects one tab when Web Locks is unavailable", async () => {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    const first = await import("@/features/admin/notifications/alertSound"); first.unlockAlertSound();
    vi.resetModules(); const second = await import("@/features/admin/notifications/alertSound"); second.unlockAlertSound();
    const results = await Promise.all([first.playAlertSound(), second.playAlertSound()]);
    expect(results.filter(Boolean)).toHaveLength(1); expect(audio.start).toHaveBeenCalledTimes(2);
  });
});
