import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { isTauri } from "@/tauri/api-config";
import { openConnectionSettings } from "@/tauri/connection-settings";

/**
 * Connection card, in the desktop and Android apps only: they ask for the
 * server address and Cloudflare Access token on first launch, and this
 * changes them. The web app is served by Cereberus itself.
 */
export const ConnectionSettings = () => {
  if (!isTauri()) return null;

  return (
    <Paper sx={{ p: 3, my: 3 }}>
      <Typography variant="h6" gutterBottom>
        Connection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The server this app talks to, and the Cloudflare Access token it uses to
        get through. Stored on this device only.
      </Typography>
      <Button variant="contained" onClick={() => openConnectionSettings()}>
        Connection settings
      </Button>
    </Paper>
  );
};
