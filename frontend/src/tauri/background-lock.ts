import { useEffect } from "react";
import { isTauri } from "./api-config";

// How long the app can sit in the background before it signs out.
export const BACKGROUND_LOCK_MS = 5 * 60 * 1000;

/**
 * Compares the clock on coming back rather than running a timer, because Android
 * freezes an app's timers while it's in the background.
 */
export const createBackgroundTimer = (
  onExpired: () => void,
  now: () => number = Date.now,
) => {
  let hiddenAt: number | null = null;
  return (hidden: boolean): void => {
    if (hidden) {
      hiddenAt ??= now();
      return;
    }
    if (hiddenAt !== null && now() - hiddenAt >= BACKGROUND_LOCK_MS) {
      onExpired();
    }
    hiddenAt = null;
  };
};

/** Only the Tauri app: a browser tab sits in the background all the time. */
export const useBackgroundLock = (enabled: boolean, lock: () => void): void => {
  useEffect(() => {
    if (!enabled || !isTauri()) return;
    const onBackgroundChange = createBackgroundTimer(lock);
    const onVisibilityChange = () => onBackgroundChange(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, lock]);
};
