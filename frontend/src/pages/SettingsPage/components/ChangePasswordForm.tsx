import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import { useUpdatePassword } from "../hooks/useUpdatePassword";

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 50;

export const ChangePasswordForm = () => {
  const { updatePassword, isUpdating, error } = useUpdatePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      setValidationError(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError(
        "New password and confirmation password do not match",
      );
      return;
    }
    if (!currentPassword) {
      setValidationError("Current password is required");
      return;
    }
    try {
      await updatePassword({ currentPassword, newPassword, confirmPassword });
      setSuccessMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Change Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter your current password and choose a new password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          aria-label="Current Password"
        />
        <TextField
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          slotProps={{
            htmlInput: {
              minLength: MIN_PASSWORD_LENGTH,
              maxLength: MAX_PASSWORD_LENGTH,
            },
          }}
          aria-label="New Password"
        />
        <TextField
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          slotProps={{
            htmlInput: {
              minLength: MIN_PASSWORD_LENGTH,
              maxLength: MAX_PASSWORD_LENGTH,
            },
          }}
          aria-label="Confirm New Password"
        />
        {validationError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {validationError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isUpdating}
          sx={{ mt: 2 }}
          aria-label="Update Password"
        >
          {isUpdating ? "Updating..." : "Update Password"}
        </Button>
      </Box>
    </Paper>
  );
};
