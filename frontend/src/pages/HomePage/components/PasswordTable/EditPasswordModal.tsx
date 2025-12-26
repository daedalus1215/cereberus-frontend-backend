import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import {
  CircularProgress,
  Box,
  Button,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useFetchPassword } from "../../hooks/useFetchPassword";
import { FlexibleTextField } from "../FlexibleTextField";
import { PasswordField } from "../PasswordField";
import { useIsMobile } from "@/hooks/useIsMobile";
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";

const MOCK_TAGS = [
  { id: 1, name: "work" },
  { id: 2, name: "personal" },
  { id: 3, name: "finance" },
];

export type EditPasswordModalProps = {
  open: boolean;
  passwordId: string | null;
  onClose: () => void;
};

export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({
  open,
  passwordId,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { revealedPassword, isLoadingPassword, setRevealedId } =
    useFetchPassword(passwordId);

  const getInitialFormState = () => ({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tagIds: [] as number[],
  });

  const [form, setForm] = useState(getInitialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = useCallback(() => {
    setForm(getInitialFormState());
    setShowPassword(false);
    setError(null);
  }, []);

  // Manage revealedId based on passwordId when modal opens
  useEffect(() => {
    if (!open) {
      return;
    }
    if (passwordId) {
      setRevealedId(passwordId);
    } else {
      setRevealedId(null);
      resetForm();
    }
  }, [open, passwordId, setRevealedId, resetForm]);

  // Populate form when editing (only when passwordId exists and we have data)
  useEffect(() => {
    if (revealedPassword && passwordId) {
      setForm({
        name: revealedPassword.name,
        username: revealedPassword.username,
        password: revealedPassword.password,
        url: revealedPassword.url,
        notes: revealedPassword.notes || "",
        tagIds: revealedPassword.tags.map((t) => t.id),
      });
      setShowPassword(false);
    }
  }, [revealedPassword, passwordId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTagToggle = (id: number) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((tid) => tid !== id)
        : [...prev.tagIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const submissionForm = { ...form };
    if (passwordId && !submissionForm.password) {
      delete (submissionForm as Partial<typeof submissionForm>).password;
    }

    try {
      if (passwordId) {
        await api.patch(`passwords/${passwordId}`, submissionForm);
      } else {
        await api.post("passwords", form);
      }
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(
          axiosErr.response?.data?.message ||
            `Failed to ${passwordId ? "update" : "create"} password`,
        );
      } else {
        setError(`Failed to ${passwordId ? "update" : "create"} password`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal
      isModalShowing={open}
      handleCloseModal={handleClose}
      isClosedButtonDisabled={submitting}
      aria-labelledby="password-modal-title"
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 1.5 : 2,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.5,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255, 255, 255, 0.3)",
            },
          },
        }}
      >
        <Typography
          id="password-modal-title"
          variant={isMobile ? "h6" : "h5"}
          component="h2"
          sx={{
            textAlign: "center",
            mb: isMobile ? 0.5 : 1,
            fontSize: isMobile ? "1.1rem" : "1.25rem",
            fontWeight: 600,
          }}
        >
          {passwordId ? "Edit Password" : "Create New Password"}
        </Typography>

        {isLoadingPassword ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <FlexibleTextField
              name="name"
              label="App/Site/Device Name"
              value={form.name}
              handleChange={handleChange}
              isDisabled={submitting}
            />

            <FlexibleTextField
              name="username"
              label="Username"
              value={form.username}
              handleChange={handleChange}
              isDisabled={submitting}
            />

            <FlexibleTextField
              name="url"
              label="URL"
              value={form.url}
              handleChange={handleChange}
              isDisabled={submitting}
            />

            <PasswordField
              isPasswordShowing={showPassword}
              setIsPasswordShowing={setShowPassword}
              value={form.password}
              handleChange={handleChange}
              required={false}
              isDisabled={submitting}
              isEditingPassword={!!passwordId}
            />

            <TextField
              name="notes"
              label="Notes"
              value={form.notes}
              onChange={handleChange}
              disabled={submitting}
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              size={isMobile ? "small" : "medium"}
              placeholder="Optional notes about this password..."
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
                Tags:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: isMobile ? 0.5 : 1,
                  flexWrap: "wrap",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                {MOCK_TAGS.map((tag) => (
                  <FormControlLabel
                    key={tag.id}
                    control={
                      <Checkbox
                        checked={form.tagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        disabled={submitting}
                        size={isMobile ? "small" : "medium"}
                      />
                    }
                    label={tag.name}
                    sx={{
                      fontSize: isMobile ? "0.875rem" : "0.9375rem",
                      "& .MuiFormControlLabel-label": {
                        fontSize: isMobile ? "0.875rem" : "0.9375rem",
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {error && (
              <Typography
                color="error"
                sx={{
                  textAlign: "center",
                  fontSize: isMobile ? "0.875rem" : "0.9375rem",
                  py: 0.5,
                }}
              >
                {error}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 1,
                mb: 1,
                pt: 1,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Button onClick={handleClose} variant="outlined" size={isMobile ? "small" : "medium"}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                size={isMobile ? "small" : "medium"}
              >
                {submitting
                  ? `${passwordId ? "Updating" : "Creating"}...`
                  : `${passwordId ? "Update" : "Create"} Password`}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};
