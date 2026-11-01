import { isTauri } from "./api-config";

/**
 * Copies to the system clipboard. The Tauri app goes through Rust: Android's
 * WebView turns navigator.clipboard down with NotAllowedError.
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  if (isTauri()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
};

/**
 * The same for a password. The Tauri app marks it sensitive, so Android's
 * clipboard preview hides it and Linux clipboard managers are asked to skip it.
 */
export const copySecretToClipboard = async (text: string): Promise<void> => {
  if (isTauri()) {
    const { writeSecret } =
      await import("@tauri-apps/plugin-clipboard-manager");
    await writeSecret(text);
    return;
  }
  await navigator.clipboard.writeText(text);
};
