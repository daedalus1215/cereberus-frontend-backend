import api, { configureApiForTauri } from "../api/axios.interceptor";
import { checkConnection, hostOf, type ConnectionCheck } from "./connection-check";
import { withRequestSignal } from "./with-request-signal";

export type ApiConfig = {
  apiBaseUrl: string;
  /** Both token fields are blank for a server Cloudflare Access doesn't protect. */
  cfAccessClientId: string;
  cfAccessClientSecret: string;
};

// True in the Tauri app, desktop and Android alike. Static import would pull
// @tauri-apps/api's window/IPC bindings into the web bundle too. The check
// must be synchronous and side-effect-free since it gates whether we
// dynamic-import Tauri's API at all.
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getStoredApiConfig = async (): Promise<ApiConfig | null> => {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ApiConfig | null>("get_api_config");
};

export const saveApiConfig = async (config: ApiConfig): Promise<void> => {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("save_api_config", { config });
};

/** Checks that these settings get through to the server, before saving them. */
export const testApiConfig = async (
  config: ApiConfig,
): Promise<ConnectionCheck> => {
  const { fetch } = await import("@tauri-apps/plugin-http");
  return checkConnection(config, fetch);
};

/** The host the app is set to talk to, once its settings are applied. */
export const currentServerHost = (): string | null =>
  hostOf(api.defaults.baseURL ?? "");

export const applyApiConfig = async (config: ApiConfig): Promise<void> => {
  const { fetch } = await import("@tauri-apps/plugin-http");
  configureApiForTauri(config, withRequestSignal(fetch));
};
