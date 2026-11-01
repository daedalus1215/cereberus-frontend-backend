import { isTauri } from "./api-config";

/**
 * Saved addresses are free text and often have no scheme (example.com), which
 * the opener's http(s)-only scope would refuse.
 */
export const withHttpScheme = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

/**
 * Opens a saved site's address. The Tauri app hands it to the default browser:
 * window.open does nothing in its webviews.
 */
export const openUrl = async (url: string): Promise<void> => {
  if (!isTauri()) {
    window.open(url, "_blank");
    return;
  }
  try {
    const { openUrl: openInBrowser } =
      await import("@tauri-apps/plugin-opener");
    await openInBrowser(withHttpScheme(url));
  } catch (err) {
    console.error(err);
    console.error("Failed to open the address");
  }
};
