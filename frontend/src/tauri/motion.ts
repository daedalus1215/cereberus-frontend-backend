import { isTauri } from "./api-config";

/**
 * Whether the app goes without animations: in the Tauri app, whose webviews
 * (WebKitGTK on Linux, Android's WebView) blink and glitch through them.
 * CSS animations and transitions are switched off by `data-motion="off"`
 * on <html> (see src/index.css).
 */
export const isMotionOff = (): boolean => isTauri();

/** Call before the first render, so nothing animates on the way in. */
export const applyMotionSetting = (): void => {
  if (isMotionOff()) {
    document.documentElement.dataset.motion = "off";
  }
};
