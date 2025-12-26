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
import { Visibility } from "@mui/icons-material";
import { useFetchPassword } from "../../hooks/useFetchPassword";
import { FlexibleTextField } from "../FlexibleTextField";
import { PasswordField } from "../PasswordField";
import { useIsMobile } from "@/hooks/useIsMobile";
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTags } from "@/api/tags";
import type { TagResponse } from "@/api/tags";
import type { PasswordEntryResponse } from "./types";

export type EditPasswordModalProps = {
  open: boolean;
  password: PasswordEntryResponse | null;
  onClose: () => void;
};

export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({
  open,
  password,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [shouldFetchPassword, setShouldFetchPassword] = useState(false);
  const { revealedPassword, isLoadingPassword, setRevealedId } =
    useFetchPassword(shouldFetchPassword ? password?.id || null : null);

  const {
    data: tags = [],
    isLoading: isLoadingTags,
  } = useQuery<TagResponse[]>({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

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
    setShouldFetchPassword(false);
  }, []);

  // Populate form when editing (using password data from list)
  useEffect(() => {
    if (!open) {
      return;
    }
    if (password) {
      setForm({
        name: password.name,
        username: password.username,
        password: "", // Don't populate password - user must reveal it
        url: password.url,
        notes: password.notes || "",
        tagIds: password.tags.map((t) => t.id),
      });
      setShowPassword(false);
      setShouldFetchPassword(false);
    } else {
      resetForm();
    }
  }, [open, password, resetForm]);

  // Update password field when user reveals it
  useEffect(() => {
    if (revealedPassword && shouldFetchPassword && password) {
      setForm((prev) => ({
        ...prev,
        password: revealedPassword.password,
      }));
    }
  }, [revealedPassword, shouldFetchPassword, password]);

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

  const handleRevealPassword = () => {
    if (!password) {
      return;
    }
    if (!shouldFetchPassword) {
      setShouldFetchPassword(true);
      setRevealedId(password.id);
    }
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const submissionForm = { ...form };
    if (password && !submissionForm.password) {
      delete (submissionForm as Partial<typeof submissionForm>).password;
    }

    try {
      if (password) {
        await api.patch(`passwords/${password.id}`, submissionForm);
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
            `Failed to ${password ? "update" : "create"} password`,
        );
      } else {
        setError(`Failed to ${password ? "update" : "create"} password`);
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
          {password ? "Edit Password" : "Create New Password"}
        </Typography>
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

            {password && !shouldFetchPassword ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Password (click to reveal current password)
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleRevealPassword}
                  disabled={submitting || isLoadingPassword}
                  startIcon={<Visibility />}
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                >
                  {isLoadingPassword ? "Loading..." : "Reveal Current Password"}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Or leave blank to keep current password
                </Typography>
              </Box>
            ) : (
              <PasswordField
                isPasswordShowing={showPassword}
                setIsPasswordShowing={setShowPassword}
                value={form.password}
                handleChange={handleChange}
                required={false}
                isDisabled={submitting || (isLoadingPassword && shouldFetchPassword)}
                isEditingPassword={!!password}
              />
            )}
            {isLoadingPassword && shouldFetchPassword && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading password...
                </Typography>
              </Box>
            )}

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
              {isLoadingTags ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    gap: isMobile ? 0.5 : 1,
                    flexWrap: "wrap",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  {tags.length > 0 ? (
                    tags.map((tag) => (
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
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      No tags available
                    </Typography>
                  )}
                </Box>
              )}
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
                  ? `${password ? "Updating" : "Creating"}...`
                  : `${password ? "Update" : "Create"} Password`}
              </Button>
            </Box>
          </>
      </Box>
    </Modal>
  );
};
