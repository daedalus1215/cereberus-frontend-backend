import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const page: CSSProperties = { background: "#000", color: "#fff", minHeight: "100vh", padding: 16, fontFamily: "sans-serif" };
const button: CSSProperties = { display: "block", width: "100%", padding: 14, margin: "8px 0", fontSize: 16 };
const results: CSSProperties = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#181818", padding: 12, fontSize: 13 };

/** The spike's whole UI. Throwaway. Rust keeps the results, so they survive a restart. */
export const SpikePage = () => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setText(await invoke<string>("spike_results"));
  }, []);

  useEffect(() => {
    void refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [refresh]);

  const run = async (command: string) => {
    setBusy(true);
    await invoke(command).catch(() => undefined);
    await refresh();
    setBusy(false);
  };

  const act = (label: string, command: string) => (
    <button style={button} disabled={busy} onClick={() => void run(command)}>
      {label}
    </button>
  );

  return (
    <div style={page}>
      <h2>Cereberus spike</h2>

      <h3>S1: Rust from a service</h3>
      <p>
        Allow notifications if asked. Swipe this app away from recent apps, pull down the
        notifications and tap <b>Run S1</b> on the Cereberus S1 notification. When its text
        changes, come back here.
      </p>

      <h3>S2: fingerprint-protected key</h3>
      <p>1. Encrypt. The prompt must not offer your PIN.</p>
      {act("Encrypt", "spike_encrypt")}
      <p>2. Decrypt. It should say it matches. Trying Cancel once should be refused.</p>
      {act("Decrypt", "spike_decrypt")}
      <p>
        3. Add a new fingerprint in system settings, come back and Decrypt again. It should be
        refused. You can remove that fingerprint afterwards.
      </p>
      <p>4. Encrypt again, then Decrypt. It should match again.</p>

      <h3>S3: key derivation inside the app</h3>
      {act("Time it", "spike_timing")}

      <h3>Results</h3>
      <button style={button} onClick={() => void refresh()}>
        Refresh
      </button>
      <button style={button} onClick={() => void writeText(text)}>
        Copy results
      </button>
      <div style={results}>{text}</div>
    </div>
  );
};
