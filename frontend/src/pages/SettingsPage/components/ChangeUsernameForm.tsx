import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import { useUpdateUsername } from "../hooks/useUpdateUsername";

const MIN_USERNAME_LENGTH = 4;
const MAX_USERNAME_LENGTH = 20;

export const ChangeUsernameForm = () => {
  const { updateUsername, isUpdating, error } = useUpdateUsername();
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    const trimmedUsername = newUsername.trim();
    if (
      trimmedUsername.length < MIN_USERNAME_LENGTH ||
      trimmedUsername.length > MAX_USERNAME_LENGTH
    ) {
      setValidationError(
        `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`,
      );
      return;
    }
    if (!currentPassword) {
      setValidationError("Current password is required");
      return;
    }
    try {
      await updateUsername({
        newUsername: trimmedUsername,
        currentPassword,
      });
      setSuccessMessage(
        "Username updated successfully. You will be redirected to login.",
      );
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Change Username
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Changing your username will require you to log in again with your new
        username.
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="New Username"
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          slotProps={{
            htmlInput: {
              minLength: MIN_USERNAME_LENGTH,
              maxLength: MAX_USERNAME_LENGTH,
            },
          }}
          aria-label="New Username"
        />
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
          aria-label="Update Username"
        >
          {isUpdating ? "Updating..." : "Update Username"}
        </Button>
      </Box>
    </Paper>
  );
};
