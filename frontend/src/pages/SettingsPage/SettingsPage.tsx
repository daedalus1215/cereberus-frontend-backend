import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAuth } from "@/auth/useAuth";
import { ChangeUsernameForm } from "./components/ChangeUsernameForm";
import { ChangePasswordForm } from "./components/ChangePasswordForm";

export const SettingsPage = () => {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Container maxWidth="md" sx={{ py: 4, pb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Account Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage your account settings. Update your username or change your
          password.
        </Typography>
        <Box sx={{ pb: 4 }}>
          <ChangeUsernameForm />
          <ChangePasswordForm />
        </Box>
        <Box sx={{ pt: 2, pb: 8, borderTop: 1, borderColor: "divider" }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => logout()}
            aria-label="Sign out"
          >
            Sign out
          </Button>
        </Box>
      </Container>
    </Box>
  );
};
