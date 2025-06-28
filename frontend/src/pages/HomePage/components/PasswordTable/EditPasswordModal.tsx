import React, { useEffect } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import {
  CircularProgress,
  Box,
  Button,
  Typography,
  TextField,
} from "@mui/material";
import { useFetchPassword } from "../../hooks/useFetchPassword";
import type { PasswordEntryResponse } from "./types";

export type EditPasswordModalProps = {
  open: boolean;
  passwordId: string | null;
  onClose: () => void;
  onEdit: (password: PasswordEntryResponse) => void;
};

export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({
  open,
  passwordId,
  onClose,
  onEdit,
}) => {
  const { revealedPassword, isLoadingPassword, setRevealedId } =
    useFetchPassword(passwordId);

  useEffect(() => {
    if (open && passwordId) {
      setRevealedId(passwordId);
    }
  }, [open, passwordId, setRevealedId]);

  const handleSave = () => {
    if (revealedPassword) {
      onEdit(revealedPassword);
      onClose();
    }
  };

  return (
    <Modal
      isModalShowing={open}
      handleCloseModal={onClose}
      isClosedButtonDisabled={false}
    >
      <Box sx={{ minWidth: 350, p: 2 }}>
        <Typography variant="h6" mb={2}>
          Edit Password
        </Typography>
        {isLoadingPassword || !revealedPassword ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 120,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <form>
            <TextField
              label="Account"
              value={revealedPassword.name}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Username"
              value={revealedPassword.username}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Password"
              value={revealedPassword.password}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
              type="text"
            />
            <TextField
              label="URL"
              value={revealedPassword.url}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Notes"
              value={revealedPassword.notes || ""}
              fullWidth
              margin="normal"
              InputProps={{ readOnly: true }}
              multiline
              minRows={2}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button onClick={onClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" color="primary" onClick={handleSave}>
                Edit
              </Button>
            </Box>
          </form>
        )}
      </Box>
    </Modal>
  );
};
