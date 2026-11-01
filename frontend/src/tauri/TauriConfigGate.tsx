import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  applyApiConfig,
  getStoredApiConfig,
  isTauri,
  saveApiConfig,
  testApiConfig,
  type ApiConfig,
} from "./api-config";
import {
  describeConnectionCheck,
  isDifferentServer,
  sendsSavedTokenElsewhere,
  type ConnectionCheck,
} from "./connection-check";
import { tokenStorage } from "../auth/tokenStorage";
import {
  onOpenConnectionSettings,
  type ConnectionSettingsReason,
} from "./connection-settings";

type GateStatus = "checking" | "needs-setup" | "ready";

// Set from the ANDROID_SERVER_URL repo variable at build time, to prefill
// the setup form. Not a secret.
const DEFAULT_SERVER_URL: string =
  import.meta.env.VITE_DEFAULT_SERVER_URL ?? "";

const EMPTY_FORM: ApiConfig = {
  apiBaseUrl: DEFAULT_SERVER_URL,
  cfAccessClientId: "",
  cfAccessClientSecret: "",
};

// Phone keyboards capitalize, autocorrect and add spaces. Any of that quietly
// breaks a URL or token, and Cloudflare then rejects every request.
const VERBATIM_INPUT = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;

const trimConfig = (config: ApiConfig): ApiConfig => ({
  apiBaseUrl: config.apiBaseUrl.trim(),
  cfAccessClientId: config.cfAccessClientId.trim(),
  cfAccessClientSecret: config.cfAccessClientSecret.trim(),
});

const PILL_BUTTON = {
  borderRadius: "9999px",
  textTransform: "none",
  fontWeight: 600,
} as const;

type ConnectionFormProps = {
  initial: ApiConfig;
  onSaved: (config: ApiConfig) => void;
  onCancel?: () => void;
};

/**
 * Server address and Cloudflare Access service token. Checks they get
 * through to Cereberus before saving, and says what's wrong if they don't;
 * "Save anyway" covers setting up while the server is down.
 */
const ConnectionForm: FC<ConnectionFormProps> = ({
  initial,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState(initial);
  const [check, setCheck] = useState<Exclude<ConnectionCheck, "ok"> | null>(
    null,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<"checking" | "saving" | null>(null);
  const config = trimConfig(form);

  const update = (patch: Partial<ApiConfig>) => {
    setForm({ ...form, ...patch });
    setCheck(null);
    setProblem(null);
  };

  const save = async () => {
    setBusy("saving");
    setProblem(null);
    try {
      await saveApiConfig(config);
      await applyApiConfig(config);
      onSaved(config);
    } catch (err) {
      console.error("Failed to save the API config:", err);
      setProblem("Could not save the settings. Please try again.");
      setBusy(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCheck(null);
    setProblem(null);
    if (!config.cfAccessClientId !== !config.cfAccessClientSecret) {
      setProblem(
        "Enter both the client ID and the secret, or leave both blank.",
      );
      return;
    }
    if (sendsSavedTokenElsewhere(initial, config)) {
      setForm({ ...form, cfAccessClientId: "", cfAccessClientSecret: "" });
      setProblem(
        "That's a different server, so the saved Access token has been cleared. Enter this server's token, or leave both fields blank.",
      );
      return;
    }
    setBusy("checking");
    const result = await testApiConfig(config).catch(
      (): ConnectionCheck => "unreachable",
    );
    if (result === "ok") {
      await save();
      return;
    }
    setCheck(result);
    setBusy(null);
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
      {check && (
        <Alert severity="error">
          {describeConnectionCheck(check, config.apiBaseUrl)}
        </Alert>
      )}
      {problem && <Alert severity="error">{problem}</Alert>}

      <TextField
        label="Server address"
        placeholder="https://cereberus.example.com"
        type="url"
        value={form.apiBaseUrl}
        onChange={(e) => update({ apiBaseUrl: e.target.value })}
        required
        disabled={busy !== null}
        fullWidth
        slotProps={{ htmlInput: VERBATIM_INPUT }}
      />
      <TextField
        label="Access client ID"
        value={form.cfAccessClientId}
        onChange={(e) => update({ cfAccessClientId: e.target.value })}
        disabled={busy !== null}
        fullWidth
        slotProps={{ htmlInput: VERBATIM_INPUT }}
      />
      <TextField
        label="Access client secret"
        type="password"
        value={form.cfAccessClientSecret}
        onChange={(e) => update({ cfAccessClientSecret: e.target.value })}
        disabled={busy !== null}
        fullWidth
        slotProps={{ htmlInput: VERBATIM_INPUT }}
      />

      <Stack spacing={1}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={busy !== null}
          fullWidth
          sx={{ ...PILL_BUTTON, py: 1.5, fontSize: "1rem" }}
        >
          {busy === "checking"
            ? "Checking…"
            : busy === "saving"
              ? "Saving…"
              : check
                ? "Check again"
                : "Save and continue"}
        </Button>
        {check && check !== "invalid-url" && (
          <Button
            variant="outlined"
            disabled={busy !== null}
            onClick={() => void save()}
            sx={PILL_BUTTON}
          >
            Save anyway
          </Button>
        )}
        {onCancel && (
          <Button
            onClick={onCancel}
            disabled={busy !== null}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

const INTRO =
  "The server this app talks to. If Cloudflare Access protects it, add a service token for this device; leave those blank if not.";

/**
 * Blocks rendering the Tauri app (desktop and Android) until an API config
 * (server address, plus a Cloudflare Access service token when Access
 * protects it) is on disk, prompting for it on first run, and shows it again
 * over the app when asked to (see connection-settings.ts). No-op passthrough
 * on the web, which Cereberus serves itself.
 */
export const TauriConfigGate: FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<GateStatus>(
    isTauri() ? "checking" : "ready",
  );
  const [savedConfig, setSavedConfig] = useState<ApiConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState<ConnectionSettingsReason | undefined>();

  useEffect(() => {
    if (!isTauri()) return;

    getStoredApiConfig()
      .then(async (config) => {
        if (config) {
          await applyApiConfig(config);
          setSavedConfig(config);
          setStatus("ready");
        } else {
          setStatus("needs-setup");
        }
      })
      .catch((err) => {
        console.error("Failed to load the API config:", err);
        setStatus("needs-setup");
      });
  }, []);

  useEffect(
    () =>
      isTauri()
        ? onOpenConnectionSettings((openedFor) => {
            setReason(openedFor);
            setIsEditing(true);
          })
        : undefined,
    [],
  );

  const handleSaved = (config: ApiConfig) => {
    // The session belongs to the old server, and mustn't be sent to the new one. A
    // fresh start also clears anything loaded from the old one.
    if (
      savedConfig &&
      isDifferentServer(savedConfig.apiBaseUrl, config.apiBaseUrl)
    ) {
      tokenStorage.removeToken();
      window.location.replace("/");
      return;
    }
    setSavedConfig(config);
    setIsEditing(false);
    setStatus("ready");
  };

  if (status === "checking") {
    return null;
  }

  if (status === "needs-setup") {
    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card elevation={3} sx={{ maxWidth: 400, width: "100%", mx: "auto" }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h5" component="h1" fontWeight={600}>
                  Connect to Cereberus
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {INTRO}
                </Typography>
              </Stack>
              <ConnectionForm
                initial={savedConfig ?? EMPTY_FORM}
                onSaved={handleSaved}
              />
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <>
      {children}
      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Connection settings</DialogTitle>
        <DialogContent>
          {reason === "access-denied" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Cloudflare Access turned this device away. Check the service
              token, or ask for a new one.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {INTRO}
          </Typography>
          {isEditing && (
            <ConnectionForm
              initial={savedConfig ?? EMPTY_FORM}
              onSaved={handleSaved}
              onCancel={() => setIsEditing(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
