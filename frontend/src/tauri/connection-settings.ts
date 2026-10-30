// Deliberately free of Tauri imports: the login page, Settings and the axios
// interceptor can ask for it on any platform, and only the Tauri app's
// TauriConfigGate listens.

/** Why the settings were opened, when it wasn't the user asking. */
export type ConnectionSettingsReason = "access-denied";

const listeners = new Set<(reason?: ConnectionSettingsReason) => void>();

/** Shows the connection settings (server address and Cloudflare Access token). */
export const openConnectionSettings = (
  reason?: ConnectionSettingsReason,
): void => {
  listeners.forEach((listener) => listener(reason));
};

export const onOpenConnectionSettings = (
  listener: (reason?: ConnectionSettingsReason) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
