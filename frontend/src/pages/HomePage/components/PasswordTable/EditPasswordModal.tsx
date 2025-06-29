import React, { useEffect, useState } from "react";
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

  console.log("revealedPassword", revealedPassword);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tagIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open && passwordId) {
      setRevealedId(passwordId);
    }
  }, [open, passwordId, setRevealedId]);

  useEffect(() => {
    if (revealedPassword) {
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
  }, [revealedPassword]);

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
    setError(null);
    setForm({
      name: "",
      username: "",
      password: "",
      url: "",
      notes: "",
      tagIds: [],
    });
  };

  return (
    <Modal
      isModalShowing={open}
      handleCloseModal={handleClose}
      isClosedButtonDisabled={submitting}
      aria-labelledby="password-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 12 : 16,
          marginTop: 16,
          minWidth: 350,
          padding: 16,
        }}
      >
        <Typography
          id="password-modal-title"
          variant={isMobile ? "h6" : "h5"}
          component="h2"
          sx={{
            textAlign: "center",
            mb: isMobile ? 1 : 2,
            fontSize: isMobile ? "1.1rem" : "inherit",
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
              minHeight: 120,
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

            <div>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Tags:
              </Typography>
              <div
                style={{
                  display: "flex",
                  gap: isMobile ? 4 : 8,
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
                      fontSize: isMobile ? "0.875rem" : "inherit",
                      margin: isMobile ? "2px 0" : "inherit",
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <Typography
                color="error"
                sx={{
                  textAlign: "center",
                  fontSize: isMobile ? "0.875rem" : "inherit",
                }}
              >
                {error}
              </Typography>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button onClick={handleClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                sx={{
                  py: isMobile ? 1.5 : 1,
                  fontSize: isMobile ? "0.875rem" : "inherit",
                }}
              >
                {submitting
                  ? `${passwordId ? "Updating" : "Creating"}...`
                  : `${passwordId ? "Update" : "Create"} Password`}
              </Button>
            </Box>
          </>
        )}
      </form>
    </Modal>
  );
};
